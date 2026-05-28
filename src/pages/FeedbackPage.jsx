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

  const DEVELOPER_EMAIL = 'giancarlos.estevez@gmail.com';

  const handleCopyText = () => {
    const textToCopy = `Tipo: ${form.type === 'bug' ? 'Reportar Error (Bug)' : form.type === 'improvement' ? 'Sugerencia de Mejora' : 'Comentario General'}\nAsunto: ${form.subject}\n\nDescripción:\n${form.description}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Feedback copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.subject || !form.description) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    const typeLabel = form.type === 'bug' ? '🔴 [ERROR/BUG]' : form.type === 'improvement' ? '💡 [MEJORA]' : '💬 [COMENTARIO]';
    const emailSubject = `${typeLabel} Feedback Beta - ${form.subject}`;
    const emailBody = `Hola,\n\nAquí tienes mis comentarios sobre la fase Beta de FinTrack RD:\n\n-------------------------------------------------\nASUNTO: ${form.subject}\nTIPO: ${typeLabel}\n-------------------------------------------------\n\nDESCRIPCIÓN:\n${form.description}\n\n-------------------------------------------------\nEnviado desde mi panel de FinTrack RD`;

    // Mailto link
    const mailtoUrl = `mailto:${DEVELOPER_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    
    // Copy to clipboard as fallback first
    const textToCopy = `Tipo: ${typeLabel}\nAsunto: ${form.subject}\n\nDescripción:\n${form.description}`;
    navigator.clipboard.writeText(textToCopy);

    // Open mail client
    window.location.href = mailtoUrl;

    toast.success('¡Cargando correo! Copiamos el texto al portapapeles por seguridad', { duration: 5000 });
    
    // Reset form
    setForm({
      type: 'bug',
      subject: '',
      description: '',
    });
  };

  return (
    <div className="page-container">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <MessageSquare size={28} className="text-accent" /> Feedback / Beta
          </h1>
          <p className="page-subtitle">Ayúdanos a perfeccionar FinTrack RD durante la fase de pruebas</p>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '3fr 2fr', alignItems: 'start' }}>
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
                required
              />
            </div>

            <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: 'var(--space-6)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopyText}
                disabled={!form.subject || !form.description}
                title="Copiar texto para enviar manualmente"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />} Copiar al Portapapeles
              </button>
              <button type="submit" className="btn btn-primary">
                <Send size={16} /> Enviar por Correo
              </button>
            </div>
          </form>
        </div>

        {/* Info Card */}
        <div className="flex flex-col gap-6">
          <div className="card-glass" style={{ borderLeft: '4px solid var(--accent-secondary)' }}>
            <h4 className="font-bold flex items-center gap-2 mb-3 text-base" style={{ color: 'var(--accent-secondary)' }}>
              <AlertCircle size={20} /> Fase Beta Activa
            </h4>
            <p className="text-sm text-secondary" style={{ lineHeight: 1.6 }}>
              FinTrack RD se encuentra actualmente en fase de pruebas beta. Tu feedback es enviado directamente al correo del desarrollador principal para ser analizado y aplicado en las próximas actualizaciones.
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
