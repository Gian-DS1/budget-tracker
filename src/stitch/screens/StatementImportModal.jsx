import { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useI18n } from '../../contexts/I18nContext';
import ModalShell from '../ModalShell';
import MS from '../MS';
import useTransactionStore from '../../stores/useTransactionStore';
import useCreditCardStore from '../../stores/useCreditCardStore';
import useCategoryStore from '../../stores/useCategoryStore';
import { autoCategorize } from '../../data/defaultCategories';
import { suggestFromHistory } from '../../data/transactionMemory';
import { matchTransactions } from '../../utils/statementMatcher';
import { getCurrency } from '../../utils/currencyRuntime';
import { formatCurrency } from '../../utils/formatters';

export default function StatementImportModal({ onClose, pdfData }) {
  const { t } = useI18n();
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

  // Categoría sugerida para una descripción: historial del usuario primero
  // (comercios ya corregidos a mano llegan bien clasificados); keywords de
  // fábrica como fallback. O(filas × historial): ok para estados de cuenta.
  const suggestCategoryId = useCallback(
    (description) =>
      suggestFromHistory(description, existingTxs)?.categoryId
        || autoCategorize(description, categories)?.id || '',
    [existingTxs, categories],
  );

  // Cruce de datos: derivado puro de (pdfData, existingTxs, categories). Antes
  // era un useEffect + setState; como solo depende de props/estado de stores, un
  // useMemo es el patrón correcto (https://react.dev/learn/you-might-not-need-an-effect).
  const matchResult = useMemo(() => {
    if (!pdfData || !pdfData.transactions) return { matched: [], ambiguous: [], toImport: [] };
    const result = matchTransactions(pdfData.transactions, existingTxs);
    result.toImport = result.toImport.map((tx) => (
      { ...tx, suggestedCategoryId: suggestCategoryId(tx.description) || null }
    ));
    return result;
  }, [pdfData, existingTxs, suggestCategoryId]);

  // Tipo derivado de la categoría (la categoría manda). Sin categoría o sin tipo
  // de gasto válido, cae a 'variable_expense' (ya no usamos el genérico 'expense').
  const typeForCategory = (categoryId) => {
    const t = categories.find((c) => c.id === categoryId)?.type;
    return t === 'fixed_expense' || t === 'variable_expense' ? t : 'variable_expense';
  };

  const handleImport = async (requestClose) => {
    if (!targetCardId) {
      toast.error(t('screens.settings.selectTargetCard'));
      return;
    }

    setImporting(true);
    try {
      // 1. Crear las nuevas transacciones
      const newTxs = matchResult.toImport.map(pdfTx => ({
        date: pdfTx.txDate,
        amount: pdfTx.amount,
        type: typeForCategory(pdfTx.suggestedCategoryId),
        description: pdfTx.description,
        categoryId: pdfTx.suggestedCategoryId || '',
        cardId: targetCardId,
        currency: getCurrency(),
        notes: t('screens.settings.importedFromStatement').replace('{bank}', pdfData.bank)
      }));

      // Para las ambiguas, por ahora las importamos como nuevas (o el usuario podría resolverlas en una v2)
      // Agregaremos las ambiguas a newTxs también, a menos que el usuario las ignore.
      // Para esta versión, las agregamos con una nota especial.
      const ambiguousTxs = matchResult.ambiguous.map(item => {
        const categoryId = suggestCategoryId(item.pdfTx.description);
        return {
          date: item.pdfTx.txDate,
          amount: item.pdfTx.amount,
          type: typeForCategory(categoryId),
          description: item.pdfTx.description,
          categoryId,
          cardId: targetCardId,
          currency: getCurrency(),
          notes: t('screens.settings.importedAmbiguous')
        };
      });

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

      toast.success(t('screens.settings.importResult').replace('{a}', addedCount).replace('{b}', matchedIds.length));
      requestClose();
    } catch (e) {
      console.error(e);
      toast.error(t('screens.settings.importError') + e.message);
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
            <h2 className="font-headline-sm text-on-surface mb-xs">{t('screens.settings.importStatementTitle')}</h2>
            <p className="font-body-md text-on-surface-variant">
              {t('screens.settings.bankDetected')} <strong className="uppercase">{pdfData.bank}</strong>. {t('screens.settings.foundN').replace('{n}', pdfData.transactions.length)}
            </p>
            <div className="flex items-start gap-sm mt-sm px-md py-sm rounded bg-secondary/10 border border-secondary/30">
              <MS name="info" className="!text-[16px] text-secondary shrink-0 mt-[1px]" />
              <span className="font-mono-data text-mono-data text-secondary normal-case tracking-normal">
                {t('screens.settings.importRdNotice')}
              </span>
            </div>
          </div>

          <div className="p-md sm:p-lg flex-1 overflow-y-auto min-h-0 flex flex-col gap-md">
            <div>
              <label className="block font-label-sm text-text-muted mb-xs">{t('screens.settings.targetCard')}</label>
              <select
                value={targetCardId}
                onChange={(e) => setPickedCardId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-on-surface focus:outline-none focus:border-primary inner-glow"
              >
                <option value="" disabled>{t('screens.settings.selectCardPlaceholder')}</option>
                {cards.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-surface-container-high rounded p-md flex flex-col gap-sm">
              <div className="flex justify-between items-center">
                <span className="font-label-sm text-on-surface">{t('screens.settings.matchedExisting')}</span>
                <span className="font-mono-data text-primary font-bold">{matchResult.matched.length}</span>
              </div>
              <p className="text-text-muted font-body-sm">
                {t('screens.settings.matchedNote')}
              </p>
            </div>

            <div className="bg-surface-container-high rounded p-md flex flex-col gap-sm">
              <div className="flex justify-between items-center">
                <span className="font-label-sm text-on-surface">{t('screens.settings.newTransactions')}</span>
                <span className="font-mono-data text-secondary font-bold">{matchResult.toImport.length}</span>
              </div>
              <p className="text-text-muted font-body-sm">
                {t('screens.settings.newNote')}
              </p>
            </div>

            {matchResult.ambiguous.length > 0 && (
              <div className="bg-error/10 border border-error/30 rounded p-md flex flex-col gap-sm">
                <div className="flex justify-between items-center">
                  <span className="font-label-sm text-error">{t('screens.settings.ambiguousTitle')}</span>
                  <span className="font-mono-data text-error font-bold">{matchResult.ambiguous.length}</span>
                </div>
                <p className="text-error/80 font-body-sm">
                  {t('screens.settings.ambiguousNote')}
                </p>
              </div>
            )}
            
            {/* Pequeña vista previa de las transacciones a importar */}
            {matchResult.toImport.length > 0 && (
               <div className="mt-sm">
                 <h4 className="font-label-sm text-text-muted mb-sm">{t('screens.settings.previewNew')}</h4>
                 <div className="flex flex-col gap-xs max-h-[150px] overflow-y-auto">
                    {matchResult.toImport.slice(0, 5).map((t, i) => (
                      <div key={i} className="flex justify-between border-b border-border-subtle pb-xs last:border-0 font-mono-data text-[12px] text-on-surface-variant">
                         <span className="truncate flex-1">{t.description}</span>
                         <span className="shrink-0 ml-md">{formatCurrency(t.amount)}</span>
                      </div>
                    ))}
                    {matchResult.toImport.length > 5 && (
                      <div className="text-center font-label-sm text-text-muted mt-xs">
                        + {matchResult.toImport.length - 5} {t('screens.settings.more')}
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
              {t('common.cancel')}
            </button>
            <button
              onClick={() => handleImport(requestClose)}
              disabled={importing || !targetCardId}
              className="px-lg py-sm rounded bg-primary text-on-primary hover:bg-primary-container transition-colors font-label-sm uppercase tracking-widest disabled:opacity-50 flex items-center gap-sm"
            >
              {importing ? t('screens.settings.importing') : t('screens.settings.confirmImport')}
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}
