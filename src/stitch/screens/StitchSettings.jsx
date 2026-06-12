// Ajustes — nivel de presupuesto, moneda, idioma, export/import, categorías. Estilo Stitch.
import { useState, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import MS from '../MS';
import { Stagger } from '../StitchMotion';
import { isDemoActive } from '../demoMode';
import { useI18n } from '../../contexts/I18nContext';
import useTransactionStore from '../../stores/useTransactionStore';
import useCategoryStore from '../../stores/useCategoryStore';
import usePrefsStore from '../../stores/usePrefsStore';
import { autoCategorize } from '../../data/defaultCategories';
import { getCurrency } from '../../utils/currencyRuntime';
import { todayISO, toISODate } from '../../utils/formatters';
import { currencyOptions } from '../../utils/currencyOptions';
import StitchSelect from '../StitchSelect';
import StatementImportModal from './StatementImportModal';
import { supabase } from '../../lib/supabase';

export default function StitchSettings() {
  const { t, language } = useI18n();

  // Niveles de presupuesto (de más simple a más avanzado).
  const BUDGET_LEVEL_CARDS = [
    { value: 'tracking', icon: 'visibility', title: t('screens.budget.trackingMode'), desc: t('screens.settings.levelTrackingDesc') },
    { value: '503020', icon: 'pie_chart', title: t('screens.settings.rule503020'), desc: t('screens.settings.level503020Desc') },
    { value: 'zero', icon: 'account_balance_wallet', title: t('screens.budget.zeroMode'), desc: t('screens.settings.levelZeroDesc') },
  ];

  const { transactions, bulkAddTransactions } = useTransactionStore();
  const { categories } = useCategoryStore();
  const fileRef = useRef(null);
  const pdfRef = useRef(null);
  const [pdfData, setPdfData] = useState(null);
  const [parsingPdf, setParsingPdf] = useState(false);
  const demo = isDemoActive();

  // Anti CSV/XLSX formula injection: Excel ejecuta celdas que empiezan con = + - @.
  const safeCell = (v) => (/^[=+\-@]/.test(String(v ?? '')) ? `'${v}` : v);

  const doExport = async (format) => {
    if (transactions.length === 0) { toast.error(t('screens.settings.nothingToExport')); return; }
    if (!window.confirm(t('screens.settings.confirmExport'))) return;
    const data = transactions.map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId);
      return { Fecha: t.date, Descripción: safeCell(t.description), Categoría: safeCell(cat ? cat.name : ''), Monto: t.amount, Tipo: t.type === 'income' ? 'Ingreso' : 'Gasto', Moneda: t.currency, Notas: safeCell(t.notes || '') };
    });
    const stamp = todayISO();
    if (format === 'csv') {
      const { default: Papa } = await import('papaparse');
      const blob = new Blob([Papa.unparse(data)], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `FinTrack_Export_${stamp}.csv`; a.click(); URL.revokeObjectURL(url);
      toast.success(t('screens.settings.csvExported'));
    } else {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transacciones'); XLSX.writeFile(wb, `FinTrack_Export_${stamp}.xlsx`);
      toast.success(t('screens.settings.excelExported'));
    }
  };

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (isDemoActive()) { toast(t('screens.settings.importNotInDemo'), { icon: 'ℹ️' }); e.target.value = ''; return; }
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
        // ISO local SIEMPRE (toISOString corre el día fuera de UTC, p. ej. GMT-4).
        let fdate = todayISO();
        try {
          if (typeof date === 'number') {
            // Serial de Excel: días desde 1899-12-30, en calendario local.
            const d = new Date(1899, 11, 30);
            d.setDate(d.getDate() + Math.floor(date));
            fdate = toISODate(d);
          } else if (/^\d{4}-\d{2}-\d{2}/.test(String(date).trim())) {
            fdate = String(date).trim().slice(0, 10);
          } else {
            const d = new Date(date);
            if (!isNaN(d.getTime())) fdate = toISODate(d);
          }
        } catch { /* ignore */ }
        const match = autoCategorize(String(desc), categories);
        return { date: fdate, amount, type, description: String(desc).slice(0, 500).replace(/[<>]/g, '') || t('screens.settings.imported'), categoryId: match ? match.id : '', currency: getCurrency(), notes: null };
      }).filter(Boolean);
      if (txs.length === 0) { toast.error(t('screens.settings.noValidRows')); return; }
      const n = await bulkAddTransactions(txs);
      toast.success(t('screens.settings.importedN').replace('{n}', n));
    };
    if (ext === 'csv') {
      import('papaparse').then(({ default: Papa }) => Papa.parse(file, { header: true, skipEmptyLines: true, complete: (r) => process(r.data), error: () => toast.error(t('screens.settings.csvReadError')) }));
    } else if (ext === 'xlsx' || ext === 'xls') {
      import('xlsx').then((XLSX) => {
        const reader = new FileReader();
        reader.onload = (ev) => { try { const wb = XLSX.read(ev.target.result, { type: 'array' }); process(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])); } catch { toast.error(t('screens.settings.excelReadError')); } };
        reader.readAsArrayBuffer(file);
      });
    } else toast.error(t('screens.settings.unsupportedFormat'));
    e.target.value = '';
  };

  const onPdfFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (isDemoActive()) { toast(t('screens.settings.importNotInDemo'), { icon: 'ℹ️' }); e.target.value = ''; return; }

    setParsingPdf(true);
    const toastId = toast.loading(t('screens.settings.extractingStatement'));
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const base64 = ev.target.result.split(',')[1];
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          const res = await fetch('/api/parse-pdf', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ pdfBase64: base64 })
          });
          
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || t('screens.settings.pdfParseError'));
          }
          const data = await res.json();
          setPdfData(data);
          toast.success(t('screens.settings.foundConsumptions').replace('{n}', data.count).replace('{bank}', data.bank), { id: toastId });
        } catch (err) {
          toast.error(err.message, { id: toastId });
        } finally {
          setParsingPdf(false);
          e.target.value = '';
        }
      };
      reader.onerror = () => { toast.error(t('screens.settings.localFileError'), { id: toastId }); setParsingPdf(false); e.target.value = ''; };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error(err.message, { id: toastId });
      setParsingPdf(false);
      e.target.value = '';
    }
  };

  const budgetLevel = usePrefsStore((s) => s.budgetLevel);
  const setBudgetLevel = usePrefsStore((s) => s.setBudgetLevel);
  const currency = usePrefsStore((s) => s.currency);
  const setCurrency = usePrefsStore((s) => s.setCurrency);

  // Fix 2: memoizar opciones de moneda; se recalcula sólo si cambia el idioma.
  // Derivamos el locale a partir de `language` (misma lógica que currentLocale())
  // para que ESLint pueda verificar la dep sin falsos warnings.
  const locale = language === 'es' ? 'es-DO' : 'en-US';
  const currencyOpts = useMemo(() => currencyOptions(locale), [locale]);

  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="mb-xl">
        <div className="flex items-center gap-sm mb-xs">
          <span className="font-mono-data text-mono-data text-secondary">SYS.CFG</span>
          <span className="w-1 h-1 rounded-full bg-border-subtle" />
          <span className="font-mono-data text-mono-data text-on-surface-variant uppercase">{t('screens.settings.configuration')}</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">{t('screens.settings.title')}</h1>
      </div>

      <Stagger className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        {/* Nivel de presupuesto */}
        <Stagger.Item className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg lg:col-span-2">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">{t('screens.settings.budgetLevel').toUpperCase()}</h2>
            <MS name="tune" className="text-text-muted text-[16px]" />
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mb-md">{t('screens.settings.budgetLevelDesc')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
            {BUDGET_LEVEL_CARDS.map((lv) => {
              const active = budgetLevel === lv.value;
              return (
                <button
                  key={lv.value}
                  onClick={() => setBudgetLevel(lv.value)}
                  className={`text-left flex flex-col gap-sm p-md rounded border transition-colors ${active ? 'border-primary bg-primary/10' : 'border-border-subtle hover:bg-surface-container-high'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-8 h-8 rounded flex items-center justify-center ${active ? 'text-primary' : 'text-text-muted'} bg-surface-container-high`}>
                      <MS name={lv.icon} className="text-[18px]" />
                    </span>
                    {active && <MS name="check_circle" className="text-[18px] text-primary" />}
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface">{lv.title}</span>
                  <span className="font-mono-data text-mono-data text-text-muted leading-relaxed normal-case tracking-normal">{lv.desc}</span>
                </button>
              );
            })}
          </div>
        </Stagger.Item>

        {/* Moneda */}
        <Stagger.Item className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">{t('screens.settings.currencyLabel').toUpperCase()}</h2>
            <MS name="currency_exchange" className="text-text-muted text-[16px]" />
          </div>
          <StitchSelect
            value={currency || ''}
            onChange={setCurrency}
            options={currencyOpts}
            placeholder={t('screens.settings.currencyLabel')}
          />
          <p className="mt-sm font-mono-data text-mono-data text-text-muted normal-case tracking-normal">
            {t('screens.settings.currencyWarning')}
          </p>
        </Stagger.Item>

        {/* Datos */}
        <Stagger.Item className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">{t('screens.settings.data').toUpperCase()} · {transactions.length} {t('screens.settings.transactionsUpper').toUpperCase()}</h2>
            <MS name="database" className="text-text-muted text-[16px]" />
          </div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFile} className="hidden" />
          <input ref={pdfRef} type="file" accept="application/pdf" onChange={onPdfFile} className="hidden" />
          {demo && (
            <div className="flex items-center gap-sm mb-sm px-md py-sm rounded bg-secondary/10 border border-secondary/30">
              <MS name="info" className="!text-[16px] text-secondary shrink-0" />
              <span className="font-mono-data text-mono-data text-secondary normal-case tracking-normal">{t('screens.settings.demoImportNote')}</span>
            </div>
          )}
          <div className="flex flex-col gap-sm">
            <Row icon="picture_as_pdf" l={t('screens.settings.importPdf')} d={demo ? t('screens.settings.notAvailableDemo') : (parsingPdf ? t('screens.settings.processing') : t('screens.settings.banksSupported'))} onClick={() => pdfRef.current?.click()} disabled={demo || parsingPdf} />
            <Row icon="upload_file" l={t('screens.settings.importCsv')} d={demo ? t('screens.settings.notAvailableDemo') : t('screens.settings.bulkLoad')} onClick={() => fileRef.current?.click()} disabled={demo} />
            <Row icon="download" l={t('screens.settings.exportCsv')} d={t('screens.settings.downloadData')} onClick={() => doExport('csv')} />
            <Row icon="grid_on" l={t('screens.settings.exportExcel')} d={t('screens.settings.xlsxFormat')} onClick={() => doExport('xlsx')} />
          </div>
        </Stagger.Item>

      </Stagger>

      {pdfData && (
        <StatementImportModal onClose={() => setPdfData(null)} pdfData={pdfData} />
      )}
    </div>
  );
}

function Row({ icon, l, d, onClick, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`flex items-center gap-md p-md rounded border border-border-subtle bg-surface-card transition-colors text-left ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-container-high'}`}>
      <MS name={icon} className="text-[20px] text-primary" />
      <div className="flex flex-col">
        <span className="font-label-sm text-label-sm text-on-surface">{l}</span>
        <span className="font-mono-data text-mono-data text-text-muted">{d}</span>
      </div>
      <MS name="chevron_right" className="text-[18px] text-text-muted ml-auto" />
    </button>
  );
}
