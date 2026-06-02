// Feedback — formulario funcional (Web3Forms, igual que la app real), estilo Stitch.
import { useState } from 'react';
import toast from 'react-hot-toast';
import MS from '../MS';

const WEB3FORMS_ACCESS_KEY = '446c31a3-399d-4d75-81e9-5e6344334122';
const TYPES = [
  { v: 'bug', l: 'Reportar un error', icon: '🔴' },
  { v: 'improvement', l: 'Sugerencia de mejora', icon: '💡' },
  { v: 'general', l: 'Comentario general', icon: '💬' },
];

export default function StitchFeedback() {
  const [form, setForm] = useState({ type: 'bug', subject: '', description: '' });
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.description) { toast.error('Completa asunto y descripción'); return; }
    setSending(true);
    const tl = form.type === 'bug' ? '🔴 [ERROR]' : form.type === 'improvement' ? '💡 [MEJORA]' : '💬 [COMENTARIO]';
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: `${tl} Feedback Beta - ${form.subject}`,
          from_name: 'FinTrack RD — Feedback Beta',
          'Tipo de Feedback': TYPES.find((t) => t.v === form.type)?.l,
          Asunto: form.subject,
          Descripción: form.description,
          Entorno: 'FinTrack RD Portal Beta',
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) { toast.success('¡Feedback enviado!'); setForm({ type: 'bug', subject: '', description: '' }); }
      else throw new Error(result.message);
    } catch (err) {
      console.error('Feedback error:', err);
      toast.error('No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.');
    } finally { setSending(false); }
  };

  return (
    <div className="p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="mb-xl">
        <div className="flex items-center gap-sm mb-xs">
          <span className="w-2 h-2 rounded-full bg-primary live-dot" />
          <span className="font-mono-data text-mono-data text-primary uppercase tracking-wider">Canal beta</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Feedback</h1>
        <p className="font-body-md text-body-md text-text-muted mt-sm max-w-2xl">Reporta errores, pide mejoras o envía un comentario al equipo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <form onSubmit={submit} className="lg:col-span-2 bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <label className="font-mono-data text-mono-data text-text-muted uppercase">Tipo</label>
            <div className="grid grid-cols-3 gap-sm">
              {TYPES.map((t) => (
                <button type="button" key={t.v} onClick={() => setForm({ ...form, type: t.v })}
                  className={`flex flex-col items-center gap-xs p-sm rounded border transition-colors ${form.type === t.v ? 'border-primary bg-primary/10 text-on-surface' : 'border-border-subtle text-on-surface-variant hover:bg-surface-container-high'}`}>
                  <span className="text-[18px]">{t.icon}</span>
                  <span className="font-label-sm text-[10px] text-center leading-tight">{t.l}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-mono-data text-mono-data text-text-muted uppercase">Asunto</label>
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputCls} placeholder="Resumen breve" />
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-mono-data text-mono-data text-text-muted uppercase">Descripción</label>
            <textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputCls} resize-none`} placeholder="Describe el detalle…" />
          </div>
          <button type="submit" disabled={sending} className="self-start bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold px-lg py-sm rounded hover:bg-primary-container transition-colors inner-glow flex items-center gap-sm disabled:opacity-50">
            <MS name="send" className="text-[16px]" /> {sending ? 'Enviando…' : 'Enviar'}
          </button>
        </form>

        <aside className="bg-surface-card border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-md h-fit">
          <div className="flex items-center gap-sm">
            <MS name="info" className="text-secondary text-[20px]" />
            <h2 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface">Canal directo</h2>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">Tu mensaje llega directo al desarrollador. Sin tickets, sin cola.</p>
          <div className="border-t border-border-subtle pt-md flex flex-col gap-sm">
            <span className="font-mono-data text-mono-data text-text-muted">RESPUESTA TÍPICA</span>
            <span className="font-headline-md text-[22px] text-tertiary tracking-tight">&lt; 24h</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

const inputCls = 'w-full bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary inner-glow placeholder:text-text-muted';
