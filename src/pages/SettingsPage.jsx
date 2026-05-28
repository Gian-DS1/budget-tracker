// FinTrack RD — Settings & Utilities Page

import { useState } from 'react';
import { Upload, Download, FileText, Settings, Moon, Sun, Trash2, PlayCircle } from 'lucide-react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import useTransactionStore from '../stores/useTransactionStore';
import useCategoryStore from '../stores/useCategoryStore';
import useThemeStore from '../stores/useThemeStore';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { autoCategorize } from '../data/defaultCategories';
import { supabase } from '../lib/supabase';

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const { transactions, bulkAddTransactions } = useTransactionStore();
  const { categories } = useCategoryStore();
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);

  // ─── CSV Export ──────────────────────────────────────────────

  const exportToCSV = () => {
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

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `FinTrack_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Archivo CSV exportado exitosamente');
  };

  // ─── CSV Import ──────────────────────────────────────────────

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        
        const newTransactions = rows.map(row => {
          // Flexible column matching to help migrate from Google Sheets
          const date = row['Fecha'] || row['Date'] || row['fecha'] || row['Date'];
          const desc = row['Descripción'] || row['Description'] || row['Concepto'] || row['descripcion'] || row['concepto'];
          const rawAmount = row['Monto'] || row['Amount'] || row['monto'] || row['amount'] || '0';
          const typeStr = row['Tipo'] || row['Type'] || row['tipo'] || '';
          const catStr = row['Categoría'] || row['Categoria'] || row['Category'] || row['categoría'] || row['categoria'] || '';
          
          if (!date || !rawAmount) return null;

          // Parse amount cleanly
          const amount = Math.abs(parseFloat(String(rawAmount).replace(/[^\d.-]/g, '')));
          if (isNaN(amount) || amount === 0) return null;

          // Infer Type
          let type = 'expense';
          if (typeStr.toLowerCase().includes('ingreso') || typeStr.toLowerCase().includes('income')) {
            type = 'income';
          } else if (String(rawAmount).trim().startsWith('+')) {
             type = 'income';
          }

          // Format Date to YYYY-MM-DD
          let formattedDate = new Date().toISOString().split('T')[0];
          try {
            // Very simple date parse attempt
            const d = new Date(date);
            if (!isNaN(d.getTime())) {
              formattedDate = d.toISOString().split('T')[0];
            }
          } catch (err) { console.error(err); }

          // Auto-categorize: First try to match the CSV's Category column, fallback to Description parsing
          let categoryMatch = null;
          if (catStr) {
            // Robustly strip emojis and special symbols, leaving clean text
            const cleanCatStr = catStr.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ]/gu, '').trim().toLowerCase();
            categoryMatch = categories.find(c => {
              const catName = c.name.toLowerCase();
              return catName === cleanCatStr || catName.includes(cleanCatStr) || cleanCatStr.includes(catName);
            });
          }
          
          if (!categoryMatch) {
            categoryMatch = autoCategorize(desc, categories);
          }

          return {
            date: formattedDate,
            amount,
            type,
            description: desc || 'Importado de CSV',
            categoryId: categoryMatch ? categoryMatch.id : '',
            currency: 'DOP',
            notes: 'Importado de Google Sheets / CSV'
          };
        }).filter(Boolean);

        if (newTransactions.length > 0) {
          const insertedCount = await bulkAddTransactions(newTransactions);
          if (insertedCount > 0) {
            toast.success(`Se importaron ${insertedCount} transacciones exitosamente`);
          }
        } else {
          toast.error('No se pudo procesar el archivo. Verifica el formato de las columnas.');
        }
      },
      error: () => {
        toast.error('Error leyendo el archivo CSV');
      }
    });
    
    // reset input
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
        supabase.from('plans').delete().eq('user_id', user.id)
      ]);
    }

    localStorage.removeItem('fintrack-transactions');
    localStorage.removeItem('fintrack-budgets');
    localStorage.removeItem('fintrack-savings');
    localStorage.removeItem('fintrack-debts');
    localStorage.removeItem('fintrack-plans');
    
    toast.success('Datos borrados exitosamente', { id: 'clear-data' });
    setTimeout(() => {
      window.location.reload(); // Reload to reset Zustand memory stores
    }, 500);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Ajustes y Utilidades</h1>
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
              <FileText size={20} /> Datos CSV
            </h3>
          </div>
          <div className="text-sm text-muted mb-4">
            Guarda un respaldo de tus transacciones o cárgalas desde una hoja de cálculo.
          </div>
          <div className="mt-auto">
            <div className="flex gap-4">
              <button className="btn btn-secondary flex-1 justify-center" onClick={exportToCSV}>
                <Download size={16} /> Exportar
              </button>
              <label className="btn btn-primary flex-1 justify-center" style={{ cursor: 'pointer' }}>
                <Upload size={16} /> Importar
                <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
              </label>
            </div>
            <div className="text-xs text-muted mt-3 text-center">Soporta Excel y Google Sheets</div>
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
            Elimina permanentemente todo el historial y datos almacenados en este navegador.
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
        message="¿Estás completamente seguro? Perderás todas tus transacciones, presupuestos e historial. Esta acción eliminará permanentemente la base de datos local."
        confirmText="Sí, borrar todo"
      />
    </div>
  );
}
