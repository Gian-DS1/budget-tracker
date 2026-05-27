// FinTrack RD — Settings & Utilities Page

import { useState } from 'react';
import { Upload, Download, FileText, Settings, Moon, Sun, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import useTransactionStore from '../stores/useTransactionStore';
import useCategoryStore from '../stores/useCategoryStore';
import useThemeStore from '../stores/useThemeStore';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { autoCategorize } from '../data/defaultCategories';

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
      complete: (results) => {
        const rows = results.data;
        let importedCount = 0;
        
        const newTransactions = rows.map(row => {
          // Flexible column matching to help migrate from Google Sheets
          const date = row['Fecha'] || row['Date'] || row['fecha'];
          const desc = row['Descripción'] || row['Description'] || row['Concepto'] || row['descripcion'];
          const rawAmount = row['Monto'] || row['Amount'] || row['monto'] || '0';
          const typeStr = row['Tipo'] || row['Type'] || '';
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
            // Remove emojis and trim spaces to find a clean match
            const cleanCatStr = catStr.replace(/[\u1000-\uFFFF]/g, '').trim().toLowerCase();
            categoryMatch = categories.find(c => c.name.toLowerCase() === cleanCatStr || c.name.toLowerCase().includes(cleanCatStr));
          }
          
          if (!categoryMatch) {
            categoryMatch = autoCategorize(desc, categories);
          }

          importedCount++;
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
          bulkAddTransactions(newTransactions);
          toast.success(`Se importaron ${newTransactions.length} transacciones`);
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

  const handleClearData = () => {
    localStorage.removeItem('fintrack-transactions');
    localStorage.removeItem('fintrack-budgets');
    localStorage.removeItem('fintrack-savings');
    localStorage.removeItem('fintrack-debts');
    localStorage.removeItem('fintrack-plans');
    window.location.reload(); // Reload to reset Zustand memory stores
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Ajustes y Utilidades</h1>
        <p className="page-subtitle">Configuración de la app e importación/exportación de datos</p>
      </div>

      <div className="grid-2">
        {/* Appearance Settings */}
        <div className="card">
          <div className="card-header border-b border-secondary pb-4 mb-4">
            <h3 className="card-title flex items-center gap-2">
              <Settings size={20} /> Apariencia
            </h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold mb-1">Tema de la Aplicación</div>
              <div className="text-sm text-muted">Elige entre modo claro u oscuro</div>
            </div>
            <div className="flex gap-2">
              <button 
                className={`btn btn-sm ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTheme('light')}
              >
                <Sun size={16} /> Claro
              </button>
              <button 
                className={`btn btn-sm ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTheme('dark')}
              >
                <Moon size={16} /> Oscuro
              </button>
            </div>
          </div>
        </div>

        {/* Data Import/Export */}
        <div className="card">
          <div className="card-header border-b border-secondary pb-4 mb-4">
            <h3 className="card-title flex items-center gap-2">
              <FileText size={20} /> Importar y Exportar Datos
            </h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="font-semibold mb-1">Exportar a CSV</div>
              <div className="text-sm text-muted mb-3">
                Descarga todas tus transacciones en formato CSV, compatible con Excel o Google Sheets.
              </div>
              <button className="btn btn-secondary w-full justify-center" onClick={exportToCSV}>
                <Download size={16} /> Descargar CSV
              </button>
            </div>

            <div style={{ height: 1, background: 'var(--border-primary)' }} />

            <div>
              <div className="font-semibold mb-1">Migrar desde Google Sheets (CSV)</div>
              <div className="text-sm text-muted mb-3">
                Sube tu CSV exportado de Google Sheets. El sistema intentará detectar las columnas "Fecha", "Descripción" y "Monto" automáticamente.
              </div>
              
              {/* Custom File Input Upload Button */}
              <label className="btn btn-primary w-full justify-center" style={{ cursor: 'pointer' }}>
                <Upload size={16} /> Subir archivo CSV
                <input 
                  type="file" 
                  accept=".csv" 
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card" style={{ border: '1px solid var(--color-danger)' }}>
          <div className="card-header border-b border-secondary pb-4 mb-4">
            <h3 className="card-title flex items-center gap-2 text-danger">
              <Trash2 size={20} /> Zona de Peligro
            </h3>
          </div>
          <div>
            <div className="font-semibold mb-1">Borrar todos los datos</div>
            <div className="text-sm text-muted mb-4">
              Elimina permanentemente todas las transacciones, presupuestos, deudas y ahorros de este navegador. Esta acción NO se puede deshacer.
            </div>
            <button 
              className="btn btn-danger w-full justify-center"
              onClick={() => setShowClearDataConfirm(true)}
            >
              Borrar Toda mi Data
            </button>
          </div>
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
