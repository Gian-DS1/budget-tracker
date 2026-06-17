// /api/feedback — recibe el feedback del usuario autenticado y lo reenvía a
// Web3Forms desde el servidor, que lo entrega por correo al desarrollador.
//
// Por qué un endpoint propio en vez de llamar a Web3Forms desde el navegador:
//   1. La CSP de producción (connect-src en vercel.json) bloquea fetch a
//      dominios externos; mismo origen siempre pasa.
//   2. Permite exigir sesión y aplicar rate limit por usuario (anti-spam):
//      Web3Forms a pelo aceptaría envíos ilimitados de cualquiera con la key.
//   3. Adjunta el email real de la cuenta para poder responder al usuario.
import { createClient } from '@supabase/supabase-js';

const TYPE_LABELS = {
  bug: '🔴 [ERROR]',
  improvement: '💡 [MEJORA]',
  general: '💬 [COMENTARIO]',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }
    const token = authHeader.split(' ')[1];

    // JWT del usuario en los headers globales: las llamadas RPC (rate limit)
    // corren como el usuario real (auth.uid() en Postgres).
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Rate limit: 5 mensajes por hora por usuario (ver supabase/rate_limits.sql).
    const { data: allowed, error: rlError } = await supabase
      .rpc('check_rate_limit', { p_action: 'feedback', p_max: 5, p_window_seconds: 3600 });
    if (rlError) {
      console.warn('check_rate_limit no disponible (¿migración sin correr?):', rlError.message);
    } else if (!allowed) {
      return res.status(429).json({ error: 'Demasiados mensajes. Intenta de nuevo en una hora.' });
    }

    const { type, subject, description } = req.body || {};
    if (typeof subject !== 'string' || typeof description !== 'string' || !subject.trim() || !description.trim()) {
      return res.status(400).json({ error: 'Faltan asunto o descripción.' });
    }
    if (subject.length > 200 || description.length > 5000) {
      return res.status(400).json({ error: 'Asunto o descripción demasiado largos.' });
    }
    const typeLabel = TYPE_LABELS[type] || TYPE_LABELS.general;

    // La access key de Web3Forms identifica el buzón de destino. Se lee solo de
    // la env var (no se versiona): así cada quien apunta el feedback a su propio
    // buzón y la clave puede rotarse sin redeploy. Sin ella, el endpoint se
    // desactiva limpiamente en vez de enviar a un destino inválido.
    const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
    if (!accessKey) {
      console.warn('WEB3FORMS_ACCESS_KEY no configurada: feedback deshabilitado.');
      return res.status(503).json({ error: 'El feedback no está disponible en este momento.' });
    }

    const w3res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: accessKey,
        subject: `${typeLabel} Feedback FinTrack - ${subject.trim()}`,
        from_name: 'FinTrack — Feedback',
        // `email` define el reply-to del correo: responder va directo al usuario.
        email: user.email,
        Usuario: user.email,
        Tipo: type || 'general',
        Asunto: subject.trim(),
        Descripción: description.trim(),
      }),
    });
    const result = await w3res.json();
    if (!w3res.ok || !result.success) {
      console.error('Web3Forms error:', result?.message);
      return res.status(502).json({ error: 'No se pudo entregar el mensaje. Intenta de nuevo.' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    return res.status(500).json({ error: 'No se pudo enviar el feedback. Intenta de nuevo.' });
  }
}
