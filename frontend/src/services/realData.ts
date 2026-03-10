/**
 * Real economic indicator data for Brazil (2019–2026).
 *
 * Sources:
 *   - Selic (target rate): BCB / COPOM decisions
 *   - IPCA (monthly % change): IBGE
 *   - IGP-M (monthly % change): FGV IBRE
 *   - FipeZAP (national venda residencial index): FIPE / DataZAP
 *
 * Last updated: March 2026
 */

// ---------------------------------------------------------------------------
// Selic target rate — set by COPOM every ~45 days
// Each entry is the effective date and the new target rate (% p.a.)
// ---------------------------------------------------------------------------
export const SELIC_HISTORY: { date: string; rate: number }[] = [
  // 2019 — easing cycle, 4 consecutive 50bps cuts
  { date: '2019-01-01', rate: 6.50 },  // held from Mar 2018
  { date: '2019-07-31', rate: 6.00 },
  { date: '2019-09-18', rate: 5.50 },
  { date: '2019-10-30', rate: 5.00 },
  { date: '2019-12-11', rate: 4.50 },
  // 2020 — pandemic-era cuts to historic low of 2%
  { date: '2020-02-06', rate: 4.25 },
  { date: '2020-03-18', rate: 3.75 },
  { date: '2020-05-06', rate: 3.00 },
  { date: '2020-06-17', rate: 2.25 },
  { date: '2020-08-05', rate: 2.00 },
  // 2021 — aggressive tightening begins
  { date: '2021-03-17', rate: 2.75 },
  { date: '2021-05-05', rate: 3.50 },
  { date: '2021-06-16', rate: 4.25 },
  { date: '2021-08-04', rate: 5.25 },
  { date: '2021-09-22', rate: 6.25 },
  { date: '2021-10-27', rate: 7.75 },
  { date: '2021-12-08', rate: 9.25 },
  // 2022 — continued hikes, pause at 13.75%
  { date: '2022-02-02', rate: 10.75 },
  { date: '2022-03-16', rate: 11.75 },
  { date: '2022-05-04', rate: 12.75 },
  { date: '2022-06-15', rate: 13.25 },
  { date: '2022-08-03', rate: 13.75 },
  // 2023 — easing cycle begins
  { date: '2023-08-02', rate: 13.25 },
  { date: '2023-09-20', rate: 12.75 },
  { date: '2023-11-01', rate: 12.25 },
  { date: '2023-12-13', rate: 11.75 },
  // 2024 — cuts then renewed tightening
  { date: '2024-01-31', rate: 11.25 },
  { date: '2024-03-20', rate: 10.75 },
  { date: '2024-05-08', rate: 10.50 },
  { date: '2024-09-18', rate: 10.75 },
  { date: '2024-11-06', rate: 11.25 },
  { date: '2024-12-11', rate: 12.25 },
  // 2025 — tightening to 15%, then hold
  { date: '2025-01-29', rate: 13.25 },
  { date: '2025-03-19', rate: 14.25 },
  { date: '2025-05-07', rate: 14.75 },
  { date: '2025-06-18', rate: 15.00 },
  // 2026 — held at 15%
  { date: '2026-01-28', rate: 15.00 },
];

// ---------------------------------------------------------------------------
// IPCA — monthly % change (MoM)
// Source: IBGE (Índice Nacional de Preços ao Consumidor Amplo)
// ---------------------------------------------------------------------------
export const IPCA_MONTHLY: { date: string; value: number }[] = [
  // 2019 — acumulado: 4.31%
  { date: '2019-01', value: 0.32 },
  { date: '2019-02', value: 0.43 },
  { date: '2019-03', value: 0.75 },
  { date: '2019-04', value: 0.57 },
  { date: '2019-05', value: 0.13 },
  { date: '2019-06', value: 0.01 },
  { date: '2019-07', value: 0.19 },
  { date: '2019-08', value: 0.11 },
  { date: '2019-09', value: -0.04 },
  { date: '2019-10', value: 0.10 },
  { date: '2019-11', value: 0.51 },
  { date: '2019-12', value: 1.15 },
  // 2020
  { date: '2020-01', value: 0.21 },
  { date: '2020-02', value: 0.25 },
  { date: '2020-03', value: 0.07 },
  { date: '2020-04', value: -0.31 },
  { date: '2020-05', value: -0.38 },
  { date: '2020-06', value: 0.26 },
  { date: '2020-07', value: 0.36 },
  { date: '2020-08', value: 0.24 },
  { date: '2020-09', value: 0.64 },
  { date: '2020-10', value: 0.86 },
  { date: '2020-11', value: 0.89 },
  { date: '2020-12', value: 1.35 },
  // 2021
  { date: '2021-01', value: 0.25 },
  { date: '2021-02', value: 0.86 },
  { date: '2021-03', value: 0.93 },
  { date: '2021-04', value: 0.31 },
  { date: '2021-05', value: 0.83 },
  { date: '2021-06', value: 0.53 },
  { date: '2021-07', value: 0.96 },
  { date: '2021-08', value: 0.87 },
  { date: '2021-09', value: 1.16 },
  { date: '2021-10', value: 1.25 },
  { date: '2021-11', value: 0.95 },
  { date: '2021-12', value: 0.73 },
  // 2022
  { date: '2022-01', value: 0.54 },
  { date: '2022-02', value: 1.01 },
  { date: '2022-03', value: 1.62 },
  { date: '2022-04', value: 1.06 },
  { date: '2022-05', value: 0.47 },
  { date: '2022-06', value: 0.67 },
  { date: '2022-07', value: -0.68 },
  { date: '2022-08', value: -0.36 },
  { date: '2022-09', value: -0.29 },
  { date: '2022-10', value: 0.59 },
  { date: '2022-11', value: 0.41 },
  { date: '2022-12', value: 0.62 },
  // 2023
  { date: '2023-01', value: 0.53 },
  { date: '2023-02', value: 0.84 },
  { date: '2023-03', value: 0.71 },
  { date: '2023-04', value: 0.61 },
  { date: '2023-05', value: 0.23 },
  { date: '2023-06', value: -0.08 },
  { date: '2023-07', value: 0.12 },
  { date: '2023-08', value: 0.23 },
  { date: '2023-09', value: 0.26 },
  { date: '2023-10', value: 0.24 },
  { date: '2023-11', value: 0.28 },
  { date: '2023-12', value: 0.56 },
  // 2024
  { date: '2024-01', value: 0.42 },
  { date: '2024-02', value: 0.83 },
  { date: '2024-03', value: 0.16 },
  { date: '2024-04', value: 0.38 },
  { date: '2024-05', value: 0.46 },
  { date: '2024-06', value: 0.21 },
  { date: '2024-07', value: 0.38 },
  { date: '2024-08', value: -0.02 },
  { date: '2024-09', value: 0.44 },
  { date: '2024-10', value: 0.56 },
  { date: '2024-11', value: 0.39 },
  { date: '2024-12', value: 0.52 },
  // 2025
  { date: '2025-01', value: 0.16 },
  { date: '2025-02', value: 1.31 },
  { date: '2025-03', value: 0.56 },
  { date: '2025-04', value: 0.43 },
  { date: '2025-05', value: 0.36 },
  { date: '2025-06', value: 0.24 },
  { date: '2025-07', value: 0.43 },
  { date: '2025-08', value: 0.28 },
  { date: '2025-09', value: 0.44 },
  { date: '2025-10', value: 0.24 },
  { date: '2025-11', value: 0.39 },
  { date: '2025-12', value: 0.33 },
  // 2026
  { date: '2026-01', value: 0.33 },
];

// ---------------------------------------------------------------------------
// IGP-M — monthly % change (MoM)
// Source: FGV IBRE (Fundação Getúlio Vargas)
// ---------------------------------------------------------------------------
export const IGPM_MONTHLY: { date: string; value: number }[] = [
  // 2019 — acumulado: ~7.32%
  { date: '2019-01', value: 0.01 },
  { date: '2019-02', value: 0.88 },
  { date: '2019-03', value: 1.26 },
  { date: '2019-04', value: 0.92 },
  { date: '2019-05', value: 0.45 },
  { date: '2019-06', value: 0.80 },
  { date: '2019-07', value: 0.40 },
  { date: '2019-08', value: -0.67 },
  { date: '2019-09', value: -0.01 },
  { date: '2019-10', value: 0.68 },
  { date: '2019-11', value: 0.30 },
  { date: '2019-12', value: 2.09 },
  // 2020
  { date: '2020-01', value: 0.48 },
  { date: '2020-02', value: -0.04 },
  { date: '2020-03', value: 1.24 },
  { date: '2020-04', value: 0.80 },
  { date: '2020-05', value: 0.28 },
  { date: '2020-06', value: 1.56 },
  { date: '2020-07', value: 2.23 },
  { date: '2020-08', value: 2.74 },
  { date: '2020-09', value: 4.34 },
  { date: '2020-10', value: 3.23 },
  { date: '2020-11', value: 3.28 },
  { date: '2020-12', value: 0.96 },
  // 2021
  { date: '2021-01', value: 2.58 },
  { date: '2021-02', value: 2.53 },
  { date: '2021-03', value: 2.94 },
  { date: '2021-04', value: 1.51 },
  { date: '2021-05', value: 4.10 },
  { date: '2021-06', value: 0.60 },
  { date: '2021-07', value: 0.78 },
  { date: '2021-08', value: 0.66 },
  { date: '2021-09', value: -0.64 },
  { date: '2021-10', value: 0.64 },
  { date: '2021-11', value: 0.02 },
  { date: '2021-12', value: 0.87 },
  // 2022
  { date: '2022-01', value: 1.82 },
  { date: '2022-02', value: 1.83 },
  { date: '2022-03', value: 1.74 },
  { date: '2022-04', value: 1.41 },
  { date: '2022-05', value: 0.52 },
  { date: '2022-06', value: 0.59 },
  { date: '2022-07', value: 0.21 },
  { date: '2022-08', value: -0.70 },
  { date: '2022-09', value: -0.95 },
  { date: '2022-10', value: 0.02 },
  { date: '2022-11', value: -0.56 },
  { date: '2022-12', value: 0.45 },
  // 2023
  { date: '2023-01', value: 0.21 },
  { date: '2023-02', value: -0.06 },
  { date: '2023-03', value: 0.05 },
  { date: '2023-04', value: -0.95 },
  { date: '2023-05', value: -1.84 },
  { date: '2023-06', value: -1.93 },
  { date: '2023-07', value: -0.72 },
  { date: '2023-08', value: -0.14 },
  { date: '2023-09', value: 0.37 },
  { date: '2023-10', value: 0.50 },
  { date: '2023-11', value: 0.59 },
  { date: '2023-12', value: 0.74 },
  // 2024
  { date: '2024-01', value: 0.07 },
  { date: '2024-02', value: -0.52 },
  { date: '2024-03', value: -0.47 },
  { date: '2024-04', value: -0.31 },
  { date: '2024-05', value: 0.89 },
  { date: '2024-06', value: 0.81 },
  { date: '2024-07', value: 0.61 },
  { date: '2024-08', value: 0.29 },
  { date: '2024-09', value: 0.62 },
  { date: '2024-10', value: 1.52 },
  { date: '2024-11', value: 1.30 },
  { date: '2024-12', value: 0.94 },
  // 2025
  { date: '2025-01', value: 0.27 },
  { date: '2025-02', value: 1.06 },
  { date: '2025-03', value: -0.34 },
  { date: '2025-04', value: -0.72 },
  { date: '2025-05', value: -1.32 },
  { date: '2025-06', value: -0.80 },
  { date: '2025-07', value: 0.40 },
  { date: '2025-08', value: 0.33 },
  { date: '2025-09', value: 0.27 },
  { date: '2025-10', value: 0.00 },
  { date: '2025-11', value: 0.27 },
  { date: '2025-12', value: -0.01 },
  // 2026
  { date: '2026-01', value: 0.41 },
  { date: '2026-02', value: -0.73 },
];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Compute accumulated rate over the last N months (compound). */
function acumulado(series: { value: number }[], months: number): number {
  const slice = series.slice(-months);
  const compound = slice.reduce((acc, { value }) => acc * (1 + value / 100), 1);
  return (compound - 1) * 100;
}

/** Get the current Selic target rate. */
export function getSelicAtual(): number {
  return SELIC_HISTORY[SELIC_HISTORY.length - 1].rate;
}

/** Get the Selic rate at a specific date. */
export function getSelicAtDate(dateStr: string): number {
  let rate = SELIC_HISTORY[0].rate;
  for (const entry of SELIC_HISTORY) {
    if (entry.date <= dateStr) rate = entry.rate;
    else break;
  }
  return rate;
}

/** Compute IPCA accumulated over the last 12 months. */
export function getIpca12m(): number {
  return acumulado(IPCA_MONTHLY, 12);
}

/** Compute IGP-M accumulated over the last 12 months. */
export function getIgpm12m(): number {
  return acumulado(IGPM_MONTHLY, 12);
}

/**
 * Compute poupança annual yield.
 * Rule: when Selic > 8.5%, poupança = 0.5%/month + TR.
 * TR has been around 0.06-0.12%/month recently; we approximate.
 */
export function getPoupancaAnual(): number {
  const selic = getSelicAtual();
  if (selic > 8.5) {
    // 0.5%/month + ~0.09% TR/month ≈ compounded annually
    const monthlyRate = 0.5 + 0.09;
    return (Math.pow(1 + monthlyRate / 100, 12) - 1) * 100;
  }
  // 70% of Selic + TR
  return selic * 0.7;
}

/**
 * Average housing finance rate.
 * With Selic at 15%, average rates are ~11-12% (subsidized programs like
 * SBPE/FGTS offer lower, but average market rate is higher).
 */
export function getFinanciamentoTx(): number {
  const selic = getSelicAtual();
  // Empirical relationship: finance rate ≈ Selic - 3pp (floor ~8.5%)
  return Math.max(8.5, selic - 3.0);
}

/** Build real benchmark data from actual indicators. */
export function getRealBenchmarks() {
  return {
    selicAnual: getSelicAtual(),
    ipca12m: Math.round(getIpca12m() * 100) / 100,
    igpm12m: Math.round(getIgpm12m() * 100) / 100,
    poupancaAnual: Math.round(getPoupancaAnual() * 100) / 100,
    financiamentoTx: getFinanciamentoTx(),
  };
}

/** Monthly Selic series (for charts): interpolate rate at each month. */
export function getSelicMonthlySeries(): { date: string; value: number }[] {
  const result: { date: string; value: number }[] = [];
  const startDate = new Date(2019, 0, 1);
  const endDate = new Date(2026, 1, 1);

  for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const fullDate = `${dateStr}-15`;
    result.push({ date: dateStr, value: getSelicAtDate(fullDate) });
  }
  return result;
}
