// Plan financiero (Strategy) — layout Stitch con PLANES REALES por horizonte.
import { useState, useMemo } from 'react';
import MS from '../MS';
import usePlanStore from '../../stores/usePlanStore';
import { formatCurrency } from '../../utils/formatters';

const fmt = (n) => formatCurrency(n);
const HORIZONS = [
  { v: 'short', l: 'Corto plazo', sub: '< 1 año' },
  { v: 'medium', l: 'Mediano plazo', sub: '1–5 años' },
  { v: 'long', l: 'Largo plazo', sub: '5+ años' },
];
const blank = { title: '', description: '', targetAmount: '', currentAmount: '0', deadline: '', horizon: 'medium' };

export default function StitchStrategy() {
  const { plans, addPlan, updatePlan, deletePlan } = usePlanStore();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);

  const totals = useMemo(() => {
    const target = plans.reduce((s, p) => s + Number(p.targetAmount || 0), 0);
    const current = plans.reduce((s, p) => s + Number(p.currentAmount || 0), 0);
    return { target, current, pct: target > 0 ? (current / target) * 100 : 0 };
  }, [plans]);

  const byHorizon = (h) => plans.filter((p) => (p.horizon || p.type) === h);

  const openCreate = () => { setForm(blank); setEditing(null); setShowForm(true); };
  const openEdit = (p) => { setForm({ title: p.title, description: p.description || '', targetAmount: String(p.targetAmount), currentAmount: String(p.currentAmount), deadline: p.deadline || '', horizon: p.horizon || p.type || 'medium' }); setEditing(p.id); setShowForm(true); };

  const submit = (e) => {
    e.preventDefault();
    if (!form.title) return;
    const data = { ...form, targetAmount: Number(form.targetAmount) || 0, currentAmount: Number(form.currentAmount) || 0 };
    if (editing) updatePlan(editing, data); else addPlan(data);
    setShowForm(false);
  };

  return (
    <div className="flex flex-col w-full">
      <div className="px-md md:px-margin-safe py-lg border-b border-border-subtle bg-surface-background/95 sticky top-0 z-30">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md max-w-[1728px] mx-auto w-full">
          <div>
            <div className="flex items-center gap-sm mb-xs">
              <span className="font-mono-data text-mono-data text-secondary">SYS.PLAN</span>
              <span className="w-1 h-1 rounded-full bg-border-subtle" />
              <span className="font-mono-data text-mono-data text-on-surface-variant uppercase">Objetivos financieros</span>
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">Plan financiero</h1>
          </div>
          <button onClick={openCreate} className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold rounded hover:bg-primary-container inner-glow self-start">
            <MS name="add" className="text-[16px]" /> Nuevo objetivo
          </button>
        </div>
      </div>

      <div className="p-md md:p-margin-safe max-w-[1728px] mx-auto w-full flex flex-col gap-md">
        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-[1px] bg-border-subtle rounded overflow-hidden border border-border-subtle">
          {[
            { l: 'OBJETIVO TOTAL', v: fmt(totals.target), c: 'text-on-surface' },
            { l: 'ACUMULADO', v: fmt(totals.current), c: 'text-secondary' },
            { l: 'PROGRESO GLOBAL', v: `${totals.pct.toFixed(1)}%`, c: 'text-tertiary' },
          ].map((k) => (
            <div key={k.l} className="bg-surface-card p-md flex flex-col justify-center">
              <span className="font-mono-data text-mono-data text-on-surface-variant mb-sm">{k.l}</span>
              <div className={`font-headline-md text-[24px] tracking-tight ${k.c}`}>{k.v}</div>
            </div>
          ))}
        </div>

        {plans.length === 0 ? (
          <div className="bg-surface-card border border-border-subtle rounded inner-glow py-[60px] flex flex-col items-center gap-sm text-center">
            <MS name="flag" className="text-[36px] text-text-muted" />
            <p className="font-body-md text-body-md text-on-surface-variant">Define tu primer objetivo financiero.</p>
            <button onClick={openCreate} className="mt-sm bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest px-md py-sm rounded">Crear objetivo</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
            {HORIZONS.map((h) => (
              <div key={h.v} className="bg-surface-panel border border-border-subtle rounded inner-glow p-md flex flex-col gap-sm">
                <div className="flex justify-between items-baseline border-b border-border-subtle pb-sm mb-sm">
                  <h3 className="font-mono-data text-mono-data text-on-surface-variant uppercase">{h.l}</h3>
                  <span className="font-mono-data text-mono-data text-text-muted">{h.sub}</span>
                </div>
                {byHorizon(h.v).length === 0 ? (
                  <p className="font-mono-data text-mono-data text-text-muted py-md text-center">— sin objetivos —</p>
                ) : byHorizon(h.v).map((p) => {
                  const pct = Number(p.targetAmount) > 0 ? (Number(p.currentAmount) / Number(p.targetAmount)) * 100 : 0;
                  const done = p.status === 'completed' || pct >= 100;
                  return (
                    <div key={p.id} className="bg-surface-card border border-border-subtle rounded p-sm inner-glow group">
                      <div className="flex justify-between items-start mb-xs">
                        <span className="font-label-sm text-label-sm text-on-surface">{p.title}</span>
                        <div className="flex gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(p)} className="text-text-muted hover:text-primary"><MS name="edit" className="text-[14px]" /></button>
                          <button onClick={() => deletePlan(p.id)} className="text-text-muted hover:text-accent-error"><MS name="delete" className="text-[14px]" /></button>
                        </div>
                      </div>
                      <div className="flex justify-between font-mono-data text-mono-data text-text-muted mb-xs">
                        <span className={done ? 'text-tertiary' : 'text-on-surface-variant'}>{fmt(p.currentAmount)}</span>
                        <span>de {fmt(p.targetAmount)}</span>
                      </div>
                      <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className={`h-full ${done ? 'bg-tertiary' : 'bg-primary'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editing ? 'Editar objetivo' : 'Nuevo objetivo'} onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="flex flex-col gap-md">
            <Field label="Título"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Ej. Comprar casa" /></Field>
            <Field label="Descripción"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-md">
              <Field label="Objetivo"><input inputMode="decimal" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value.replace(/[^0-9.]/g, '') })} className={inputCls} /></Field>
              <Field label="Acumulado"><input inputMode="decimal" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value.replace(/[^0-9.]/g, '') })} className={inputCls} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-md">
              <Field label="Fecha límite"><input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={inputCls} /></Field>
              <Field label="Horizonte"><select value={form.horizon} onChange={(e) => setForm({ ...form, horizon: e.target.value })} className={inputCls}>{HORIZONS.map((h) => <option key={h.v} value={h.v}>{h.l}</option>)}</select></Field>
            </div>
            <FormActions onCancel={() => setShowForm(false)} label={editing ? 'Guardar' : 'Crear'} />
          </form>
        </Modal>
      )}
    </div>
  );
}

const inputCls = 'w-full bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary inner-glow';
function Field({ label, children }) { return <div className="flex flex-col gap-xs"><label className="font-mono-data text-mono-data text-text-muted uppercase">{label}</label>{children}</div>; }
function FormActions({ onCancel, label }) {
  return (
    <div className="flex gap-sm justify-end mt-sm">
      <button type="button" onClick={onCancel} className="px-md py-sm border border-border-subtle text-on-surface-variant font-label-sm text-label-sm rounded hover:bg-surface-container-high">Cancelar</button>
      <button type="submit" className="px-md py-sm bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold rounded hover:bg-primary-container inner-glow">{label}</button>
    </div>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md" style={{ background: 'rgba(0,0,0,0.66)' }} onClick={onClose}>
      <div className="bg-surface-card border border-border-subtle rounded-lg inner-glow w-full max-w-[480px] max-h-[85vh] overflow-y-auto p-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-lg">
          <h3 className="font-headline-md text-[20px] font-bold text-on-surface tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-on-surface p-xs"><MS name="close" className="text-[20px]" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
