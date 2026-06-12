// Feedback — el formulario envía a /api/feedback (endpoint propio, autenticado
// y con rate limit), que reenvía por correo vía Web3Forms desde el servidor.
// No se llama a Web3Forms desde el navegador: la CSP lo bloquea y expondría
// el envío sin sesión ni límites.
import { useState } from 'react';
import toast from 'react-hot-toast';
import MS from '../MS';
import Emoji from '../Emoji';
import { useI18n } from '../../contexts/I18nContext';
import { Stagger } from '../StitchMotion';
import { isDemoActive } from '../demoMode';
import { supabase } from '../../lib/supabase';

export default function StitchFeedback() {
  const { t } = useI18n();
  const TYPES = [
    { v: 'bug', l: t('screens.feedback.reportBug'), icon: '🔴' },
    { v: 'improvement', l: t('screens.feedback.suggestImprovement'), icon: '💡' },
    { v: 'general', l: t('screens.feedback.generalComment'), icon: '💬' },
  ];
  const [form, setForm] = useState({ type: 'bug', subject: '', description: '' });
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.description) { toast.error(t('screens.feedback.completeFields')); return; }
    if (isDemoActive()) { toast(t('screens.feedback.notInDemo'), { icon: 'ℹ️' }); return; }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: form.type, subject: form.subject, description: form.description }),
      });
      const result = await res.json();
      if (res.ok && result.success) { toast.success(t('screens.feedback.sent')); setForm({ type: 'bug', subject: '', description: '' }); }
      else if (res.status === 429) toast.error(t('screens.feedback.tooMany'));
      else throw new Error(result.error);
    } catch (err) {
      console.error('Feedback error:', err);
      toast.error(t('screens.feedback.sendError'));
    } finally { setSending(false); }
  };

  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="mb-xl">
        <div className="flex items-center gap-sm mb-xs">
          <span className="w-2 h-2 rounded-full bg-primary live-dot" />
          <span className="font-mono-data text-mono-data text-primary uppercase tracking-wider">{t('screens.feedback.betaChannel')}</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Feedback</h1>
        <p className="font-body-md text-body-md text-text-muted mt-sm max-w-2xl">{t('screens.feedback.subtitle')}</p>
      </div>

      <Stagger className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <Stagger.Item className="lg:col-span-2">
        <form onSubmit={submit} className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <label className="font-mono-data text-mono-data text-text-muted uppercase">{t('common.type')}</label>
            <div className="grid grid-cols-3 gap-sm">
              {TYPES.map((t) => (
                <button type="button" key={t.v} onClick={() => setForm({ ...form, type: t.v })}
                  className={`flex flex-col items-center gap-xs p-sm rounded border transition-colors ${form.type === t.v ? 'border-primary bg-primary/10 text-on-surface' : 'border-border-subtle text-on-surface-variant hover:bg-surface-container-high'}`}>
                  <Emoji e={t.icon} size={20} />
                  <span className="font-label-sm text-[10px] text-center leading-tight">{t.l}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-mono-data text-mono-data text-text-muted uppercase">{t('screens.feedback.subject')}</label>
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputCls} placeholder={t('screens.feedback.briefSummary')} />
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-mono-data text-mono-data text-text-muted uppercase">{t('common.description')}</label>
            <textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputCls} resize-none`} placeholder={t('screens.feedback.describeDetail')} />
          </div>
          <button type="submit" disabled={sending} className="self-start bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold px-lg py-sm rounded hover:bg-primary-container transition-colors inner-glow flex items-center gap-sm disabled:opacity-50">
            <MS name="send" className="text-[16px]" /> {sending ? t('screens.feedback.sending') : t('screens.feedback.send')}
          </button>
        </form>
        </Stagger.Item>

        <Stagger.Item>
        <aside className="bg-surface-card border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-md h-fit">
          <div className="flex items-center gap-sm">
            <MS name="info" className="text-secondary text-[20px]" />
            <h2 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface">{t('screens.feedback.directChannel')}</h2>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">{t('screens.feedback.directNote')}</p>
          <div className="border-t border-border-subtle pt-md flex flex-col gap-sm">
            <span className="font-mono-data text-mono-data text-text-muted">{t('screens.feedback.typicalResponse').toUpperCase()}</span>
            <span className="font-headline-md text-[22px] text-tertiary tracking-tight">&lt; 24h</span>
          </div>
        </aside>
        </Stagger.Item>
      </Stagger>
    </div>
  );
}

const inputCls = 'w-full bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary inner-glow placeholder:text-text-muted';
