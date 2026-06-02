// Ajustes — tasa USD real, export/import, categorías, tema. Estilo Stitch.
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import MS from '../MS';
import useRateStore from '../../stores/useRateStore';
import useTransactionStore from '../../stores/useTransactionStore';
import useCategoryStore from '../../stores/useCategoryStore';
import { autoCategorize } from '../../data/defaultCategories';

export default function StitchSettings() {
  const { manualRate, source, getRate, fetchRate, setManualRate } = useRateStore();
  const { transactions, bulkAddTransactions } = useTransactionStore();
  const { categories, dedupeCategories, resetCategoriesToDefault } = useCategoryStore();
  const fileRef = useRef(null);
  const [rateInput, setRateInput] = useState('');

  useEffect(() => { fetchRate(); }, [fetchRate]);

  const saveRate = () => {
    if (!rateInput) { setManualRate(null); toast.success('Usando la tasa automática del mercado'); return; }
    const v = Number(rateInput);
    if (isNaN(v) || v <= 0) { toast.error('Ingresa una tasa válida'); return; }
    setManualRate(v); toast.success(`Tasa fijada: RD$ ${v}`); setRateInput('');
  };
  const autoRate = async () => { setManualRate(null); await fetchRate(); toast.success('Tasa actualizada desde el mercado'); };

  const doExport = async (format) => {
    if (transactions.length === 0) { toast.error('No hay transacciones para exportar'); return; }
    const data = transactions.map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId);
      return { Fecha: t.date, Descripción: t.description, Categoría: cat ? cat.name : '', Monto: t.amount, Tipo: t.type === 'income' ? 'Ingreso' : 'Gasto', Moneda: t.currency, Notas: t.notes || '' };
    });
    const stamp = new Date().toISOString().split('T')[0];
    if (format === 'csv') {
      const { default: Papa } = await import('papaparse');
      const blob = new Blob([Papa.unparse(data)], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `FinTrack_Export_${stamp}.csv`; a.click(); URL.revokeObjectURL(url);
      toast.success('CSV exportado');
    } else {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transacciones'); XLSX.writeFile(wb, `FinTrack_Export_${stamp}.xlsx`);
      toast.success('Excel exportado');
    }
  };

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    const process = async (rows) => {
      const txs = rows.map((row) => {
        const date = row['Fecha'] || row['Date'] || row['fecha'];
        const desc = row['Descripción'] || row['Description'] || row['Concepto'] || row['descripcion'];
        const raw = row['Monto'] || row['Amount'] || row['monto'];
        const typeStr = row['Tipo'] || row['Type'] || row['tipo'] || '';
        if (!date || !raw) return null;
        const amount = Math.abs(parseFloat(String(raw).replace(/[^\d.-]/g, '')));
        if (isNaN(amount) || amount === 0) return null;
        let type = 'expense';
        if (String(typeStr).toLowerCase().includes('ingreso') || String(typeStr).toLowerCase().includes('income') || String(raw).trim().startsWith('+')) type = 'income';
        let fdate = new Date().toISOString().split('T')[0];
        try {
          if (typeof date === 'number') { const d = new Date(new Date(1899, 11, 30).getTime() + date * 86400000); fdate = d.toISOString().split('T')[0]; }
          else { const d = new Date(date); if (!isNaN(d.getTime())) fdate = d.toISOString().split('T')[0]; }
        } catch { /* ignore */ }
        const match = autoCategorize(String(desc), categories);
        return { date: fdate, amount, type, description: String(desc) || 'Importado', categoryId: match ? match.id : '', currency: 'DOP', notes: null };
      }).filter(Boolean);
      if (txs.length === 0) { toast.error('No se encontraron filas válidas'); return; }
      const n = await bulkAddTransactions(txs);
      toast.success(`Se importaron ${n} transacciones`);
    };
    if (ext === 'csv') {
      import('papaparse').then(({ default: Papa }) => Papa.parse(file, { header: true, skipEmptyLines: true, complete: (r) => process(r.data), error: () => toast.error('Error leyendo el CSV') }));
    } else if (ext === 'xlsx' || ext === 'xls') {
      import('xlsx').then((XLSX) => {
        const reader = new FileReader();
        reader.onload = (ev) => { try { const wb = XLSX.read(ev.target.result, { type: 'array' }); process(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])); } catch { toast.error('Error leyendo el Excel'); } };
        reader.readAsArrayBuffer(file);
      });
    } else toast.error('Formato no soportado. Usa .csv o .xlsx');
    e.target.value = '';
  };

  const dedupe = async () => { const n = await dedupeCategories(); toast.success(n > 0 ? `${n} categorías duplicadas eliminadas` : 'No había duplicados'); };

  return (
    <div className="p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="mb-xl">
        <div className="flex items-center gap-sm mb-xs">
          <span className="font-mono-data text-mono-data text-secondary">SYS.CFG</span>
          <span className="w-1 h-1 rounded-full bg-border-subtle" />
          <span className="font-mono-data text-mono-data text-on-surface-variant uppercase">Configuración</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Ajustes y utilidades</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        {/* Tasa */}
        <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">TASA DE CAMBIO · USD→DOP</h2>
            <MS name="currency_exchange" className="text-text-muted text-[16px]" />
          </div>
          <div className="flex items-end gap-md mb-md">
            <span className="font-headline-md text-[40px] text-on-surface tracking-tighter">{getRate().toFixed(2)}</span>
            <span className="font-mono-data text-mono-data text-tertiary mb-sm flex items-center gap-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary live-dot" />
              {manualRate ? 'MANUAL' : source === 'popular' ? 'BANCO POPULAR' : 'MERCADO'}
            </span>
          </div>
          <div className="flex gap-sm">
            <input value={rateInput} onChange={(e) => setRateInput(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="Fijar tasa manual…" className="flex-1 bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-mono-data text-mono-data text-on-surface focus:outline-none focus:border-primary inner-glow placeholder:text-text-muted" />
            <button onClick={saveRate} className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest px-md rounded hover:bg-primary-container transition-colors">Fijar</button>
            <button onClick={autoRate} className="border border-border-subtle text-on-surface-variant px-md rounded hover:bg-surface-container-high" title="Tasa automática"><MS name="autorenew" className="text-[18px]" /></button>
          </div>
        </div>

        {/* Datos */}
        <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">DATOS · {transactions.length} TRANSACCIONES</h2>
            <MS name="database" className="text-text-muted text-[16px]" />
          </div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFile} className="hidden" />
          <div className="flex flex-col gap-sm">
            <Row icon="upload_file" l="Importar CSV / Excel" d="Carga masiva de transacciones" onClick={() => fileRef.current?.click()} />
            <Row icon="download" l="Exportar a CSV" d="Descarga tus datos" onClick={() => doExport('csv')} />
            <Row icon="grid_on" l="Exportar a Excel" d="Formato .xlsx" onClick={() => doExport('xlsx')} />
          </div>
        </div>

        {/* Categorías */}
        <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg lg:col-span-2">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">CATEGORÍAS · {categories.filter((c) => c.isActive).length} ACTIVAS</h2>
            <MS name="category" className="text-text-muted text-[16px]" />
          </div>
          <div className="flex flex-wrap gap-xs mb-md">
            {categories.filter((c) => c.isActive).map((c) => (
              <span key={c.id} className="inline-flex items-center gap-xs bg-surface-card border border-border-subtle rounded px-sm py-xs font-label-sm text-label-sm text-on-surface-variant inner-glow">
                <span>{c.icon}</span> {c.name}
              </span>
            ))}
          </div>
          <div className="flex gap-sm">
            <button onClick={dedupe} className="border border-border-subtle text-on-surface-variant font-mono-data text-mono-data uppercase px-md py-xs rounded hover:bg-surface-container-high flex items-center gap-xs"><MS name="cleaning_services" className="text-[14px]" /> Eliminar duplicados</button>
            <button onClick={() => { if (confirm('¿Restablecer las categorías por defecto? Esto borra tus categorías actuales.')) resetCategoriesToDefault(); }} className="border border-border-subtle text-accent-error font-mono-data text-mono-data uppercase px-md py-xs rounded hover:bg-surface-container-high flex items-center gap-xs"><MS name="restart_alt" className="text-[14px]" /> Restablecer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, l, d, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-md p-md rounded border border-border-subtle bg-surface-card hover:bg-surface-container-high transition-colors text-left">
      <MS name={icon} className="text-[20px] text-primary" />
      <div className="flex flex-col">
        <span className="font-label-sm text-label-sm text-on-surface">{l}</span>
        <span className="font-mono-data text-mono-data text-text-muted">{d}</span>
      </div>
      <MS name="chevron_right" className="text-[18px] text-text-muted ml-auto" />
    </button>
  );
}
