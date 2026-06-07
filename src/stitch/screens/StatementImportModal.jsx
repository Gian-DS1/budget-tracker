import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import ModalShell from '../ModalShell';
import useTransactionStore from '../../stores/useTransactionStore';
import useCreditCardStore from '../../stores/useCreditCardStore';
import useCategoryStore from '../../stores/useCategoryStore';
import { autoCategorize } from '../../data/defaultCategories';
import { matchTransactions } from '../../utils/statementMatcher';

export default function StatementImportModal({ onClose, pdfData }) {
  const existingTxs = useTransactionStore((s) => s.transactions);
  const bulkAddTransactions = useTransactionStore((s) => s.bulkAddTransactions);
  const bulkAssignCard = useTransactionStore((s) => s.bulkAssignCard);
  const cards = useCreditCardStore((s) => s.cards);
  const categories = useCategoryStore((s) => s.categories);

  // Tarjeta sugerida: derivada de los datos, no sincronizada con un effect. Si el
  // nombre de una tarjeta incluye los últimos 4 dígitos del PDF (ej. "CCN 3093")
  // la preferimos; si no, la primera tarjeta. (FinTrack no guarda last4 nativo.)
  const suggestedCardId = useMemo(() => {
    if (!pdfData?.cardLast4 || cards.length === 0) return '';
    const match = cards.find((c) => c.name.includes(pdfData.cardLast4));
    return (match || cards[0])?.id || '';
  }, [cards, pdfData]);

  // El usuario puede cambiar la tarjeta; mientras no lo haga (null), usamos la
  // sugerida. Esto evita un useEffect que sincronice estado derivado.
  const [pickedCardId, setPickedCardId] = useState(null);
  const targetCardId = pickedCardId ?? suggestedCardId;

  const [importing, setImporting] = useState(false);

  // Cruce de datos: derivado puro de (pdfData, existingTxs, categories). Antes
  // era un useEffect + setState; como solo depende de props/estado de stores, un
  // useMemo es el patrón correcto (https://react.dev/learn/you-might-not-need-an-effect).
  const matchResult = useMemo(() => {
    if (!pdfData || !pdfData.transactions) return { matched: [], ambiguous: [], toImport: [] };
    const result = matchTransactions(pdfData.transactions, existingTxs);
    result.toImport = result.toImport.map((tx) => {
      const cat = autoCategorize(tx.description, categories);
      return { ...tx, suggestedCategoryId: cat ? cat.id : null };
    });
    return result;
  }, [pdfData, existingTxs, categories]);

  const handleImport = async (requestClose) => {
    if (!targetCardId) {
      toast.error('Selecciona una tarjeta destino');
      return;
    }

    setImporting(true);
    try {
      // 1. Crear las nuevas transacciones
      const newTxs = matchResult.toImport.map(pdfTx => ({
        date: pdfTx.txDate,
        amount: pdfTx.amount,
        type: 'expense',
        description: pdfTx.description,
        categoryId: pdfTx.suggestedCategoryId || '',
        cardId: targetCardId,
        currency: 'DOP', // Asumimos DOP por ahora
        notes: `Importado desde estado de cuenta ${pdfData.bank}`
      }));

      // Para las ambiguas, por ahora las importamos como nuevas (o el usuario podría resolverlas en una v2)
      // Agregaremos las ambiguas a newTxs también, a menos que el usuario las ignore.
      // Para esta versión, las agregamos con una nota especial.
      const ambiguousTxs = matchResult.ambiguous.map(item => ({
        date: item.pdfTx.txDate,
        amount: item.pdfTx.amount,
        type: 'expense',
        description: item.pdfTx.description,
        categoryId: autoCategorize(item.pdfTx.description, categories)?.id || '',
        cardId: targetCardId,
        currency: 'DOP',
        notes: `Importado (Ambigüedad detectada en el estado de cuenta)`
      }));

      const allNew = [...newTxs, ...ambiguousTxs];
      let addedCount = 0;
      if (allNew.length > 0) {
        addedCount = await bulkAddTransactions(allNew);
      }

      // 2. Vincular los matches a la tarjeta usando bulkAssignCard para recalcular cashback
      const matchedIds = matchResult.matched.map(m => m.existingTx.id);
      if (matchedIds.length > 0) {
        await bulkAssignCard(matchedIds, targetCardId);
      }

      toast.success(`Importadas: ${addedCount}. Vinculadas/Actualizadas: ${matchedIds.length}`);
      requestClose();
    } catch (e) {
      console.error(e);
      toast.error('Error al importar: ' + e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      className="bg-surface-panel border border-border-subtle rounded-lg shadow-elevation-modal w-full max-w-[600px] flex flex-col overflow-hidden relative"
      style={{ maxHeight: '90vh' }}
    >
      {(requestClose) => (
        <>
          <div className="p-md sm:p-lg border-b border-border-subtle shrink-0">
            <h2 className="font-headline-sm text-on-surface mb-xs">Importar Estado de Cuenta</h2>
            <p className="font-body-md text-on-surface-variant">
              Banco detectado: <strong className="uppercase">{pdfData.bank}</strong>. Se encontraron {pdfData.transactions.length} consumos.
            </p>
          </div>

          <div className="p-md sm:p-lg flex-1 overflow-y-auto min-h-0 flex flex-col gap-md">
            <div>
              <label className="block font-label-sm text-text-muted mb-xs">Tarjeta de Destino</label>
              <select
                value={targetCardId}
                onChange={(e) => setPickedCardId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-on-surface focus:outline-none focus:border-primary inner-glow"
              >
                <option value="" disabled>Selecciona la tarjeta...</option>
                {cards.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-surface-container-high rounded p-md flex flex-col gap-sm">
              <div className="flex justify-between items-center">
                <span className="font-label-sm text-on-surface">Coinciden con gastos ya registrados</span>
                <span className="font-mono-data text-primary font-bold">{matchResult.matched.length}</span>
              </div>
              <p className="text-text-muted font-body-sm">
                Se les asignará la tarjeta seleccionada automáticamente para evitar duplicados.
              </p>
            </div>

            <div className="bg-surface-container-high rounded p-md flex flex-col gap-sm">
              <div className="flex justify-between items-center">
                <span className="font-label-sm text-on-surface">Transacciones Nuevas</span>
                <span className="font-mono-data text-secondary font-bold">{matchResult.toImport.length}</span>
              </div>
              <p className="text-text-muted font-body-sm">
                Se agregarán como nuevos gastos.
              </p>
            </div>

            {matchResult.ambiguous.length > 0 && (
              <div className="bg-error/10 border border-error/30 rounded p-md flex flex-col gap-sm">
                <div className="flex justify-between items-center">
                  <span className="font-label-sm text-error">Posibles duplicados (Ambiguas)</span>
                  <span className="font-mono-data text-error font-bold">{matchResult.ambiguous.length}</span>
                </div>
                <p className="text-error/80 font-body-sm">
                  Existen gastos parecidos pero no hay seguridad total. Se importarán como nuevas por precaución.
                </p>
              </div>
            )}
            
            {/* Pequeña vista previa de las transacciones a importar */}
            {matchResult.toImport.length > 0 && (
               <div className="mt-sm">
                 <h4 className="font-label-sm text-text-muted mb-sm">Vista previa de nuevas:</h4>
                 <div className="flex flex-col gap-xs max-h-[150px] overflow-y-auto">
                    {matchResult.toImport.slice(0, 5).map((t, i) => (
                      <div key={i} className="flex justify-between border-b border-border-subtle pb-xs last:border-0 font-mono-data text-[12px] text-on-surface-variant">
                         <span className="truncate flex-1">{t.description}</span>
                         <span className="shrink-0 ml-md">RD$ {t.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    {matchResult.toImport.length > 5 && (
                      <div className="text-center font-label-sm text-text-muted mt-xs">
                        + {matchResult.toImport.length - 5} más...
                      </div>
                    )}
                 </div>
               </div>
            )}
          </div>

          <div className="p-md sm:p-lg border-t border-border-subtle shrink-0 flex justify-end gap-md bg-surface-panel/50">
            <button
              onClick={requestClose}
              disabled={importing}
              className="px-lg py-sm rounded border border-border-subtle text-on-surface hover:bg-surface-container transition-colors font-label-sm uppercase tracking-widest disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleImport(requestClose)}
              disabled={importing || !targetCardId}
              className="px-lg py-sm rounded bg-primary text-on-primary hover:bg-primary-container transition-colors font-label-sm uppercase tracking-widest disabled:opacity-50 flex items-center gap-sm"
            >
              {importing ? 'Importando...' : 'Confirmar Importación'}
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}
