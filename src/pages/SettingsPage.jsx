// FinTrack RD — Settings & Utilities Page

import { useState, useRef, useEffect } from 'react';
import { Upload, Download, FileText, Settings, Moon, Sun, Trash2, PlayCircle, ChevronDown, FileSpreadsheet, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import useTransactionStore from '../stores/useTransactionStore';
import useCategoryStore from '../stores/useCategoryStore';
import useThemeStore from '../stores/useThemeStore';
import useRateStore from '../stores/useRateStore';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { autoCategorize } from '../data/defaultCategories';
import { supabase } from '../lib/supabase';

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const { transactions, bulkAddTransactions } = useTransactionStore();
  const { categories } = useCategoryStore();
  const liveRate = useRateStore((s) => s.liveRate);
  const manualRate = useRateStore((s) => s.manualRate);
  const setManualRate = useRateStore((s) => s.setManualRate);
  const fetchRate = useRateStore((s) => s.fetchRate);
  const [rateInput, setRateInput] = useState('');
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  const handleSaveRate = () => {
    if (rateInput === '') {
      setManualRate(null);
      toast.success('Usando la tasa de mercado automática');
      return;
    }
    const v = Number(rateInput);
    if (isNaN(v) || v <= 0) {
      toast.error('Ingresa una tasa válida');
      return;
    }
    setManualRate(v);
    toast.success(`Tasa fijada manualmente: RD$ ${v}`);
  };

  const handleAutoRate = async () => {
    setManualRate(null);
    setRateInput('');
    await fetchRate();
    toast.success('Tasa actualizada desde el mercado');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Refresca la tasa de venta automáticamente al abrir Ajustes.
  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  // ─── Data Export ──────────────────────────────────────────────

  const exportData = async (format = 'xlsx') => {
    if (transactions.length === 0) {
      toast.error('No hay transacciones para exportar');
      return;
    }

    const data = transactions.map(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      return {
        Fecha: t.date,
        Descripción: t.description,
        Categoría: cat ? cat.name : '',
        Monto: t.amount,
        Tipo: t.type === 'income' ? 'Ingreso' : 'Gasto',
        Moneda: t.currency,
        Notas: t.notes || ''
      };
    });

    if (format === 'csv') {
      const { default: Papa } = await import('papaparse');
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FinTrack_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Archivo CSV exportado exitosamente');
    } else {
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transacciones");
      XLSX.writeFile(workbook, `FinTrack_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Archivo Excel exportado exitosamente');
    }
  };

  // ─── Data Import ──────────────────────────────────────────────

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop().toLowerCase();

    const processData = async (rows) => {
      const newTransactions = rows.map(row => {
        const date = row['Fecha'] || row['Date'] || row['fecha'];
        const desc = row['Descripción'] || row['Description'] || row['Concepto'] || row['descripcion'];
        const rawAmount = row['Monto'] || row['Amount'] || row['monto'];
        const typeStr = row['Tipo'] || row['Type'] || row['tipo'] || '';
        const catStr = row['Categoría'] || row['Categoria'] || row['Category'] || row['categoría'] || '';
        const notesStr = row['Notas'] || row['Notes'] || row['notas'] || null;
        
        if (!date || !rawAmount) return null;

        const amount = Math.abs(parseFloat(String(rawAmount).replace(/[^\d.-]/g, '')));
        if (isNaN(amount) || amount === 0) return null;

        let type = 'expense';
        if (String(typeStr).toLowerCase().includes('ingreso') || String(typeStr).toLowerCase().includes('income')) {
          type = 'income';
        } else if (String(rawAmount).trim().startsWith('+')) {
           type = 'income';
        }

        let formattedDate = new Date().toISOString().split('T')[0];
        try {
          if (typeof date === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            const d = new Date(excelEpoch.getTime() + date * 86400000);
            formattedDate = d.toISOString().split('T')[0];
          } else {
            const d = new Date(date);
            if (!isNaN(d.getTime())) {
              formattedDate = d.toISOString().split('T')[0];
            }
          }
        } catch (err) { console.error(err); }

        let categoryMatch = null;
        if (catStr) {
          const cleanCatStr = String(catStr).replace(/[^\w\sáéíóúñÁÉÍÓÚÑ]/gu, '').trim().toLowerCase();
          categoryMatch = categories.find(c => {
            const catName = c.name.toLowerCase();
            return catName === cleanCatStr || catName.includes(cleanCatStr) || cleanCatStr.includes(catName);
          });
        }
        
        if (!categoryMatch) {
          categoryMatch = autoCategorize(String(desc), categories);
        }

        return {
          date: formattedDate,
          amount,
          type,
          description: String(desc) || 'Importado',
          categoryId: categoryMatch ? categoryMatch.id : '',
          currency: 'DOP',
          notes: notesStr
        };
      }).filter(Boolean);

      if (newTransactions.length > 0) {
        const insertedCount = await bulkAddTransactions(newTransactions);
        if (insertedCount > 0) {
          toast.success(`Se importaron ${insertedCount} transacciones exitosamente`);
        }
      } else {
        toast.error('No se pudo procesar. Revisa el formato de columnas.');
      }
    };

    if (fileExt === 'csv') {
      import('papaparse').then(({ default: Papa }) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => processData(results.data),
          error: () => toast.error('Error leyendo el archivo CSV')
        });
      });
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const XLSX = await import('xlsx');
          const bstr = evt.target.result;
          const workbook = XLSX.read(bstr, { type: 'binary' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(worksheet);
          processData(data);
        } catch (error) {
          console.error(error);
          toast.error('Error leyendo el archivo Excel');
        }
      };
      reader.readAsBinaryString(file);
    } else {
      toast.error('Formato no soportado. Usa .csv o .xlsx');
    }

    e.target.value = null;
  };

  // ─── Data Clear ──────────────────────────────────────────────

  const handleClearData = async () => {
    toast.loading('Borrando datos...', { id: 'clear-data' });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await Promise.all([
        supabase.from('transactions').delete().eq('user_id', user.id),
        supabase.from('budgets').delete().eq('user_id', user.id),
        supabase.from('savings').delete().eq('user_id', user.id),
        supabase.from('debts').delete().eq('user_id', user.id),
        supabase.from('plans').delete().eq('user_id', user.id),
        supabase.from('credit_cards').delete().eq('user_id', user.id)
      ]);
    }

    // Must match the persist `name` of each zustand store, otherwise the
    // cached data is rehydrated on reload and "deleted" data reappears.
    localStorage.removeItem('fintrack-transactions-cache');
    localStorage.removeItem('fintrack-budgets-cache');
    localStorage.removeItem('fintrack-savings-cache');
    localStorage.removeItem('fintrack-debts-cache');
    localStorage.removeItem('fintrack-plans-cache');
    localStorage.removeItem('fintrack-cards-cache');

    toast.success('Datos borrados exitosamente', { id: 'clear-data' });
    setTimeout(() => {
      window.location.reload(); // Reload to reset Zustand memory stores
    }, 500);
  };

  return (
    <div className="page-container">
      <div className="page-header" id="tour-settings-header">
        <h1 className="page-title">Ajustes y utilidades</h1>
        <p className="page-subtitle">Configuración de la app e importación/exportación de datos</p>
      </div>

      <div className="grid-2">
        
        {/* Appearance Settings */}
        <div className="card flex flex-col justify-between">
          <div className="card-header border-b border-secondary pb-4 mb-4">
            <h3 className="card-title flex items-center gap-2">
              <Settings size={20} /> Apariencia
            </h3>
          </div>
          <div className="text-sm text-muted mb-4">
            Ajusta el tema visual de la aplicación según tu preferencia.
          </div>
          <div className="flex gap-2 mt-auto">
            <button 
              className={`btn flex-1 justify-center ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTheme('light')}
            >
              <Sun size={16} /> Claro
            </button>
            <button
              className={`btn flex-1 justify-center ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTheme('dark')}
            >
              <Moon size={16} /> Oscuro
            </button>
          </div>
        </div>

        {/* Exchange Rate Settings */}
        <div className="card flex flex-col justify-between">
          <div className="card-header border-b border-secondary pb-4 mb-4">
            <h3 className="card-title flex items-center gap-2">
              <DollarSign size={20} /> Tasa de cambio (USD → DOP)
            </h3>
          </div>
          <div className="text-sm text-muted mb-4">
            Tasa de <strong>venta</strong>, se actualiza sola:{' '}
            <span className="font-semibold amount-neutral">RD$ {liveRate}</span>.
            <div className="text-xs" style={{ marginTop: 'var(--space-1)' }}>
              Es una aproximación; tu banco puede tener un valor un poco distinto. Si lo prefieres, fíjala manualmente.
            </div>
            {manualRate != null && (
              <div style={{ marginTop: 'var(--space-1)' }}>
                Usando override manual: <span className="font-semibold amount-neutral">RD$ {manualRate}</span>.
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-auto" style={{ flexWrap: 'wrap' }}>
            <input
              type="number"
              className="no-spinners"
              aria-label="Tasa de cambio manual (RD$ por US$)"
              style={{ flex: '1 1 120px', minWidth: 0 }}
              placeholder={manualRate != null ? String(manualRate) : 'Tasa manual'}
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
            />
            <button className="btn btn-primary justify-center" onClick={handleSaveRate} style={{ flex: '1 1 100px' }}>
              Fijar tasa
            </button>
            <button className="btn btn-secondary justify-center" onClick={handleAutoRate} style={{ flex: '1 1 100px' }}>
              Automática
            </button>
          </div>
        </div>

        {/* Help & Tutorial */}
        <div className="card flex flex-col justify-between">
          <div className="card-header border-b border-secondary pb-4 mb-4">
            <h3 className="card-title flex items-center gap-2">
              <PlayCircle size={20} className="text-info" /> Tutorial
            </h3>
          </div>
          <div className="text-sm text-muted mb-4">
            Reinicia el recorrido guiado para aprender a utilizar las funciones de FinTrack.
          </div>
          <button
            className="btn btn-secondary w-full justify-center mt-auto"
            onClick={() => {
              localStorage.removeItem('fintrack-tour-seen');
              window.location.href = '/';
            }}
          >
            <PlayCircle size={16} /> Repetir Recorrido Guiado
          </button>
        </div>

        {/* Data Import/Export */}
        <div className="card flex flex-col justify-between">
          <div className="card-header border-b border-secondary pb-4 mb-4">
            <h3 className="card-title flex items-center gap-2">
              <FileText size={20} /> Datos Excel/CSV
            </h3>
          </div>
          <div className="text-sm text-muted mb-4">
            Respalda tus transacciones en Excel, o cárgalas desde un archivo externo.
            <div className="mt-2 text-xs font-mono p-2 rounded border" style={{ background: 'var(--bg-primary)' }}>
              Columnas: Fecha | Descripción | Monto | Tipo | Categoría
            </div>
          </div>
          <div className="mt-auto">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ position: 'relative' }} ref={exportMenuRef}>
                <button 
                  className="btn btn-secondary w-full justify-center" 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                >
                  <Download size={16} /> Exportar <ChevronDown size={14} />
                </button>
                
                {showExportMenu && (
                  <div className="export-dropdown-container">
                    <button 
                      className="export-option"
                      onClick={() => { exportData('xlsx'); setShowExportMenu(false); }}
                    >
                      <FileSpreadsheet size={16} /> Excel (.xlsx)
                    </button>
                    <button 
                      className="export-option"
                      onClick={() => { exportData('csv'); setShowExportMenu(false); }}
                    >
                      <FileText size={16} /> Texto (.csv)
                    </button>
                  </div>
                )}
              </div>
              <label className="btn btn-primary w-full justify-center" style={{ cursor: 'pointer', margin: 0 }}>
                <Upload size={16} /> Importar
                <input type="file" accept=".csv, .xlsx, .xls" style={{ display: 'none' }} onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card flex flex-col justify-between" style={{ border: '1px solid var(--color-danger)' }}>
          <div className="card-header border-b border-secondary pb-4 mb-4">
            <h3 className="card-title flex items-center gap-2 text-danger">
              <Trash2 size={20} /> Zona de Peligro
            </h3>
          </div>
          <div className="text-sm text-muted mb-4">
            Elimina permanentemente todo tu historial financiero y datos vinculados a tu cuenta.
          </div>
          <button 
            className="btn btn-danger w-full justify-center mt-auto"
            onClick={() => setShowClearDataConfirm(true)}
          >
            <Trash2 size={16} /> Borrar Toda mi Data
          </button>
        </div>

      </div>

      <ConfirmDialog
        isOpen={showClearDataConfirm}
        onClose={() => setShowClearDataConfirm(false)}
        onConfirm={handleClearData}
        title="⚠️ Borrar todos los datos"
        message="¿Estás completamente seguro? Perderás todas tus transacciones, presupuestos e historial. Esta acción eliminará permanentemente toda tu información de nuestra base de datos en la nube."
        confirmText="Sí, borrar todo"
      />
    </div>
  );
}
