// FinTrack RD — Tasa de cambio USD → DOP (fuente única de verdad)
//
// Antes la tasa vivía hardcodeada en constants.js (USD_TO_DOP_RATE = 60) y se
// usaba para valorar deudas y totales, mientras que las transacciones usaban una
// tasa en vivo. Eso daba dos valoraciones distintas. Este store centraliza la
// tasa "actual" usada para valorar balances en toda la app:
//   - liveRate:   última tasa de mercado obtenida (con spread bancario).
//   - manualRate: override opcional fijado por el usuario en Ajustes.
// `getRate()` devuelve el override si existe; si no, la tasa en vivo.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { USD_TO_DOP_RATE } from '../utils/constants';

// Spread estándar de venta de la banca dominicana (~+1.2%).
const BANK_SPREAD = 1.012;

const useRateStore = create(
  persist(
    (set, get) => ({
      liveRate: USD_TO_DOP_RATE, // fallback hasta el primer fetch
      manualRate: null,
      lastFetched: null,
      loading: false,

      /** Tasa efectiva usada en toda la app para valorar balances en USD. */
      getRate: () => {
        const { manualRate, liveRate } = get();
        const m = Number(manualRate);
        if (manualRate != null && !isNaN(m) && m > 0) return m;
        const live = Number(liveRate);
        return !isNaN(live) && live > 0 ? live : USD_TO_DOP_RATE;
      },

      /** Obtiene la tasa de mercado actual y le aplica el spread bancario. */
      fetchRate: async () => {
        set({ loading: true });
        try {
          const res = await fetch(
            'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json'
          );
          if (res.ok) {
            const data = await res.json();
            if (data && data.usd && typeof data.usd.dop === 'number') {
              const withSpread = Math.round(data.usd.dop * BANK_SPREAD * 100) / 100;
              set({ liveRate: withSpread, lastFetched: new Date().toISOString(), loading: false });
              return withSpread;
            }
          }
        } catch (e) {
          console.warn('No se pudo obtener la tasa USD→DOP:', e);
        }
        set({ loading: false });
        return get().liveRate;
      },

      /** Fija un override manual (number) o lo limpia (null/'') para volver a la tasa en vivo. */
      setManualRate: (value) => {
        if (value === null || value === undefined || value === '') {
          set({ manualRate: null });
          return;
        }
        const v = Number(value);
        if (!isNaN(v) && v > 0) set({ manualRate: v });
      },
    }),
    {
      name: 'fintrack-rate-cache',
    }
  )
);

export default useRateStore;
