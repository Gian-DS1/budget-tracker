// FinTrack RD — Feedback Page
import { useState } from 'react';
import { MessageSquare, Send, Copy, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FeedbackPage() {
  const [form, setForm] = useState({
    type: 'bug',
    subject: '',
    description: '',
  });
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  // Access key público de Web3Forms (está diseñado para vivir en el frontend; la
  // protección anti-spam corre del lado del servicio). El correo destino
  // (giancarlos.estevez@gmail.com) está ligado a esta key en la cuenta de Web3Forms.
  const WEB3FORMS_ACCESS_KEY = '446c31a3-399d-4d75-81e9-5e6344334122';

  const handleCopyText = () => {
    const textToCopy = `Tipo: ${form.type === 'bug' ? 'Reportar Error (Bug)' : form.type === 'improvement' ? 'Sugerencia de Mejora' : 'Comentario General'}\nAsunto: ${form.subject}\n\nDescripción:\n${form.description}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Feedback copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.description) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setSending(true);
    const typeLabel = form.type === 'bug' ? '🔴 [ERROR/BUG]' : form.type === 'improvement' ? '💡 [MEJORA]' : '💬 [COMENTARIO]';
    const emailSubject = `${typeLabel} Feedback Beta - ${form.subject}`;

    try {
      // Web3Forms entrega el feedback directo al correo ligado a la access key,
      // sin abrir el cliente de correo del usuario.
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: emailSubject,
          from_name: 'FinTrack RD — Feedback Beta',
          'Tipo de Feedback': form.type === 'bug' ? '🔴 Reportar un Error (Bug)' : form.type === 'improvement' ? '💡 Sugerencia de Mejora' : '💬 Comentario General',
          'Asunto': form.subject,
          'Descripción': form.description,
          'Entorno': 'FinTrack RD Portal Beta',
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('¡Feedback enviado directamente al desarrollador!');
        // Reset form
        setForm({
          type: 'bug',
          subject: '',
          description: '',
        });
      } else {
        throw new Error(result.message || 'La API no devolvió éxito');
      }
    } catch (err) {
      console.error('Error al enviar feedback con Web3Forms:', err);
      // Sin redirección a mailto: si falla, el usuario reintenta o usa "Copiar al
      // Portapapeles". Los datos del formulario se conservan.
      toast.error('No se pudo enviar. Revisa tu conexión e inténtalo de nuevo, o usa "Copiar al Portapapeles".');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page-container">
      {/* Encapsulated Spinner style block */}
      <style>{`
        @keyframes feedback-spin {
          to { transform: rotate(360deg); }
        }
        .feedback-spinner {
          animation: feedback-spin 0.8s linear infinite;
        }
      `}</style>

      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <MessageSquare size={28} className="text-accent" /> Feedback / Beta
          </h1>
          <p className="page-subtitle">Ayúdanos a perfeccionar FinTrack RD durante la fase de pruebas</p>
        </div>
      </div>

      <div className="grid-2 grid-feedback" style={{ alignItems: 'start' }}>
        {/* Feedback Form Card */}
        <div className="card">
          <div className="card-header border-b border-secondary pb-4 mb-6">
            <h3 className="card-title">Enviar Comentarios</h3>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Tipo de Comentario *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                disabled={sending}
                required
              >
                <option value="bug">🔴 Reportar un Error (Bug)</option>
                <option value="improvement">💡 Sugerencia de Mejora</option>
                <option value="general">💬 Comentario / Idea General</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Asunto / Título Resumido *</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Ej: Error al registrar pago de deuda, Sugerencia para reportes..."
                disabled={sending}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Descripción Detallada *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Por favor, describe detalladamente la mejora que propones o el error encontrado. Si es un error, indica los pasos para reproducirlo..."
                rows={6}
                disabled={sending}
                required
              />
            </div>

            <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: 'var(--space-6)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopyText}
                disabled={sending || !form.subject || !form.description}
                title="Copiar texto para enviar manualmente"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />} Copiar al Portapapeles
              </button>
              <button type="submit" className="btn btn-primary" disabled={sending}>
                {sending ? (
                  <>
                    <span 
                      className="feedback-spinner" 
                      style={{ 
                        width: 16, 
                        height: 16, 
                        border: '2px solid currentColor', 
                        borderTopColor: 'transparent', 
                        borderRadius: '50%', 
                        display: 'inline-block', 
                        marginRight: 8 
                      }} 
                    />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Enviar Feedback
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Card */}
        <div className="flex flex-col gap-6">
          <div className="card" style={{ background: 'var(--accent-secondary-subtle)', borderColor: 'rgba(6, 182, 212, 0.25)' }}>
            <h4 className="font-bold flex items-center gap-2 mb-3 text-base" style={{ color: 'var(--accent-secondary)' }}>
              <AlertCircle size={20} /> Envío Directo y Autónomo
            </h4>
            <p className="text-sm text-secondary" style={{ lineHeight: 1.6 }}>
              Los comentarios se envían directamente al desarrollador a través de la aplicación en segundo plano. No necesitas abrir ningún programa de correo externo ni registrarte. ¡Es 100% automático!
            </p>
          </div>

          <div className="card">
            <h4 className="font-bold mb-3 text-base">¿Cómo reportar efectivamente?</h4>
            <ul className="text-sm text-secondary flex flex-col gap-3" style={{ paddingLeft: 'var(--space-4)', listStyleType: 'disc', lineHeight: 1.5 }}>
              <li>
                <strong>Sé descriptivo</strong>: Explica qué estabas haciendo y qué esperabas que ocurriera.
              </li>
              <li>
                <strong>Pasos para reproducir</strong>: Detalla los pasos que tomaste antes de que apareciera el error.
              </li>
              <li>
                <strong>Sugerencias de mejoras</strong>: Cuéntanos cómo imaginas que la funcionalidad podría ser más útil o más cómoda.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
