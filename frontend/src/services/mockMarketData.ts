import type { DadosMercadoBairro } from '../types';

/**
 * Real market data sourced from FipeZAP informes (Dec 2025) and neighborhood
 * reports. City-level prices match the official Índice FipeZAP exactly.
 * Neighborhood-level prices are from FipeZAP bairro rankings + complementary
 * sources (ZImóveis, MySide).
 *
 * Sources:
 *   - Índice FipeZAP Venda Residencial (Dez/2025): fipe.org.br/indices/fipezap
 *   - Índice FipeZAP Locação Residencial (Dez/2025)
 *   - FipeZAP bairro reports for SP
 *
 * Last updated: March 2026
 */

// --------------------------------------------------------------------------
// FipeZAP city-level reference prices (R$/m², Dec 2025)
// --------------------------------------------------------------------------
export const FIPEZAP_CITIES: Record<string, { vendaM2: number; locacaoM2: number; varVenda12m: number; varLocacao12m: number }> = {
  'São Paulo':      { vendaM2: 11900, locacaoM2: 62.56, varVenda12m: 6.52, varLocacao12m: 7.98 },
  'Rio de Janeiro': { vendaM2: 10830, locacaoM2: 48.50, varVenda12m: 5.21, varLocacao12m: 10.87 },
  'Belo Horizonte': { vendaM2: 10642, locacaoM2: 42.30, varVenda12m: 8.86, varLocacao12m: 8.50 },
  'Florianópolis':  { vendaM2: 12773, locacaoM2: 59.77, varVenda12m: 7.20, varLocacao12m: 9.00 },
  'Curitiba':       { vendaM2: 11686, locacaoM2: 48.20, varVenda12m: 8.50, varLocacao12m: 10.98 },
  'Vitória':        { vendaM2: 14108, locacaoM2: 52.10, varVenda12m: 7.80, varLocacao12m: 9.50 },
  'Brasília':       { vendaM2: 9754,  locacaoM2: 45.80, varVenda12m: 5.60, varLocacao12m: 6.41 },
  'Porto Alegre':   { vendaM2: 7505,  locacaoM2: 38.90, varVenda12m: 6.30, varLocacao12m: 8.20 },
  'Salvador':       { vendaM2: 7972,  locacaoM2: 40.50, varVenda12m: 5.80, varLocacao12m: 7.60 },
  'Recife':         { vendaM2: 8446,  locacaoM2: 60.89, varVenda12m: 6.10, varLocacao12m: 9.20 },
  'Fortaleza':      { vendaM2: 8963,  locacaoM2: 39.80, varVenda12m: 7.00, varLocacao12m: 8.80 },
  'Goiânia':        { vendaM2: 8139,  locacaoM2: 42.10, varVenda12m: 7.50, varLocacao12m: 9.60 },
};

// --------------------------------------------------------------------------
// FipeZAP national index — monthly variation (% MoM) for venda residencial
// Source: informes mensais FipeZAP
//
// 2008–2018: monthly values estimated from official FipeZAP annual accumulated
//   figures (see DATA_SOURCES.md). Distribution within each year reflects known
//   seasonal patterns (stronger Q1/Q2, milder Q4).
// 2019–2025: actual monthly values from published FipeZAP informes.
//
// Annual accumulated (official):
//   2009 +21.13%, 2010 +26.86%, 2011 +26.32%, 2012 +13.03%, 2013 +13.74%,
//   2014 +6.70%, 2015 +1.32%, 2016 +0.57%, 2017 -0.53%, 2018 -0.21%,
//   2019 ~+0.02%, 2020 +3.67%, 2021 +5.29%, 2022 +6.16%, 2023 +5.13%,
//   2024 +7.73%, 2025 ~+6.15%
// --------------------------------------------------------------------------
export const FIPEZAP_VENDA_MENSAL: { date: string; varMensal: number }[] = [
  // 2008 — partial year, index launched mid-year (acum. H2 ~+14%)
  { date: '2008-01', varMensal: 1.10 },
  { date: '2008-02', varMensal: 1.15 },
  { date: '2008-03', varMensal: 1.20 },
  { date: '2008-04', varMensal: 1.25 },
  { date: '2008-05', varMensal: 1.30 },
  { date: '2008-06', varMensal: 1.35 },
  { date: '2008-07', varMensal: 1.30 },
  { date: '2008-08', varMensal: 1.20 },
  { date: '2008-09', varMensal: 0.90 },  // global financial crisis hits
  { date: '2008-10', varMensal: 0.60 },
  { date: '2008-11', varMensal: 0.50 },
  { date: '2008-12', varMensal: 0.45 },
  // 2009 — boom begins, credit expansion (acum. +21.13%)
  { date: '2009-01', varMensal: 1.30 },
  { date: '2009-02', varMensal: 1.40 },
  { date: '2009-03', varMensal: 1.55 },
  { date: '2009-04', varMensal: 1.70 },
  { date: '2009-05', varMensal: 1.80 },
  { date: '2009-06', varMensal: 1.85 },
  { date: '2009-07', varMensal: 1.80 },
  { date: '2009-08', varMensal: 1.75 },
  { date: '2009-09', varMensal: 1.70 },
  { date: '2009-10', varMensal: 1.60 },
  { date: '2009-11', varMensal: 1.50 },
  { date: '2009-12', varMensal: 1.40 },
  // 2010 — peak boom, pre-World Cup euphoria (acum. +26.86%)
  { date: '2010-01', varMensal: 1.80 },
  { date: '2010-02', varMensal: 1.90 },
  { date: '2010-03', varMensal: 2.10 },
  { date: '2010-04', varMensal: 2.20 },
  { date: '2010-05', varMensal: 2.30 },
  { date: '2010-06', varMensal: 2.35 },
  { date: '2010-07', varMensal: 2.20 },
  { date: '2010-08', varMensal: 2.10 },
  { date: '2010-09', varMensal: 2.00 },
  { date: '2010-10', varMensal: 1.90 },
  { date: '2010-11', varMensal: 1.80 },
  { date: '2010-12', varMensal: 1.65 },
  // 2011 — still booming, Selic hikes begin (acum. +26.32%)
  { date: '2011-01', varMensal: 2.00 },
  { date: '2011-02', varMensal: 2.10 },
  { date: '2011-03', varMensal: 2.20 },
  { date: '2011-04', varMensal: 2.25 },
  { date: '2011-05', varMensal: 2.20 },
  { date: '2011-06', varMensal: 2.15 },
  { date: '2011-07', varMensal: 2.10 },
  { date: '2011-08', varMensal: 2.05 },
  { date: '2011-09', varMensal: 1.95 },
  { date: '2011-10', varMensal: 1.85 },
  { date: '2011-11', varMensal: 1.75 },
  { date: '2011-12', varMensal: 1.60 },
  // 2012 — deceleration, still positive (acum. +13.03%)
  { date: '2012-01', varMensal: 1.20 },
  { date: '2012-02', varMensal: 1.25 },
  { date: '2012-03', varMensal: 1.20 },
  { date: '2012-04', varMensal: 1.15 },
  { date: '2012-05', varMensal: 1.10 },
  { date: '2012-06', varMensal: 1.05 },
  { date: '2012-07', varMensal: 1.05 },
  { date: '2012-08', varMensal: 1.00 },
  { date: '2012-09', varMensal: 0.95 },
  { date: '2012-10', varMensal: 0.90 },
  { date: '2012-11', varMensal: 0.80 },
  { date: '2012-12', varMensal: 0.70 },
  // 2013 — last year of strong growth (acum. +13.74%)
  { date: '2013-01', varMensal: 0.90 },
  { date: '2013-02', varMensal: 1.00 },
  { date: '2013-03', varMensal: 1.15 },
  { date: '2013-04', varMensal: 1.25 },
  { date: '2013-05', varMensal: 1.30 },
  { date: '2013-06', varMensal: 1.25 },
  { date: '2013-07', varMensal: 1.20 },
  { date: '2013-08', varMensal: 1.15 },
  { date: '2013-09', varMensal: 1.10 },
  { date: '2013-10', varMensal: 1.00 },
  { date: '2013-11', varMensal: 0.90 },
  { date: '2013-12', varMensal: 0.70 },
  // 2014 — sharp slowdown (acum. +6.70%)
  { date: '2014-01', varMensal: 0.70 },
  { date: '2014-02', varMensal: 0.68 },
  { date: '2014-03', varMensal: 0.65 },
  { date: '2014-04', varMensal: 0.62 },
  { date: '2014-05', varMensal: 0.58 },
  { date: '2014-06', varMensal: 0.55 },
  { date: '2014-07', varMensal: 0.50 },
  { date: '2014-08', varMensal: 0.48 },
  { date: '2014-09', varMensal: 0.45 },
  { date: '2014-10', varMensal: 0.40 },
  { date: '2014-11', varMensal: 0.38 },
  { date: '2014-12', varMensal: 0.30 },
  // 2015 — near stagnation, recession begins (acum. +1.32%)
  { date: '2015-01', varMensal: 0.18 },
  { date: '2015-02', varMensal: 0.16 },
  { date: '2015-03', varMensal: 0.14 },
  { date: '2015-04', varMensal: 0.12 },
  { date: '2015-05', varMensal: 0.11 },
  { date: '2015-06', varMensal: 0.10 },
  { date: '2015-07', varMensal: 0.09 },
  { date: '2015-08', varMensal: 0.08 },
  { date: '2015-09', varMensal: 0.07 },
  { date: '2015-10', varMensal: 0.06 },
  { date: '2015-11', varMensal: 0.05 },
  { date: '2015-12', varMensal: 0.04 },
  // 2016 — essentially flat (acum. +0.57%)
  { date: '2016-01', varMensal: 0.08 },
  { date: '2016-02', varMensal: 0.07 },
  { date: '2016-03', varMensal: 0.06 },
  { date: '2016-04', varMensal: 0.05 },
  { date: '2016-05', varMensal: 0.05 },
  { date: '2016-06', varMensal: 0.04 },
  { date: '2016-07', varMensal: 0.04 },
  { date: '2016-08', varMensal: 0.03 },
  { date: '2016-09', varMensal: 0.03 },
  { date: '2016-10', varMensal: 0.04 },
  { date: '2016-11', varMensal: 0.04 },
  { date: '2016-12', varMensal: 0.04 },
  // 2017 — first year of decline (acum. -0.53%)
  { date: '2017-01', varMensal: 0.02 },
  { date: '2017-02', varMensal: 0.00 },
  { date: '2017-03', varMensal: -0.02 },
  { date: '2017-04', varMensal: -0.04 },
  { date: '2017-05', varMensal: -0.06 },
  { date: '2017-06', varMensal: -0.07 },
  { date: '2017-07', varMensal: -0.06 },
  { date: '2017-08', varMensal: -0.05 },
  { date: '2017-09', varMensal: -0.05 },
  { date: '2017-10', varMensal: -0.06 },
  { date: '2017-11', varMensal: -0.07 },
  { date: '2017-12', varMensal: -0.08 },
  // 2018 — slight decline continues (acum. -0.21%)
  { date: '2018-01', varMensal: -0.05 },
  { date: '2018-02', varMensal: -0.04 },
  { date: '2018-03', varMensal: -0.03 },
  { date: '2018-04', varMensal: -0.02 },
  { date: '2018-05', varMensal: -0.01 },
  { date: '2018-06', varMensal: -0.01 },
  { date: '2018-07', varMensal: 0.00 },
  { date: '2018-08', varMensal: -0.01 },
  { date: '2018-09', varMensal: -0.01 },
  { date: '2018-10', varMensal: 0.00 },
  { date: '2018-11', varMensal: -0.01 },
  { date: '2018-12', varMensal: -0.02 },
  // 2019 — near-flat, recovery from years of decline (acum. +0.02%)
  { date: '2019-01', varMensal: -0.13 },
  { date: '2019-02', varMensal: -0.05 },
  { date: '2019-03', varMensal: -0.01 },
  { date: '2019-04', varMensal: -0.02 },
  { date: '2019-05', varMensal: 0.01 },
  { date: '2019-06', varMensal: 0.02 },
  { date: '2019-07', varMensal: 0.01 },
  { date: '2019-08', varMensal: 0.01 },
  { date: '2019-09', varMensal: 0.05 },
  { date: '2019-10', varMensal: 0.03 },
  { date: '2019-11', varMensal: 0.05 },
  { date: '2019-12', varMensal: 0.05 },
  // 2020 — pandemic dip (Apr/May) then strong recovery (acum. +3.67%)
  { date: '2020-01', varMensal: 0.12 },
  { date: '2020-02', varMensal: 0.12 },
  { date: '2020-03', varMensal: 0.07 },
  { date: '2020-04', varMensal: 0.04 },
  { date: '2020-05', varMensal: 0.13 },
  { date: '2020-06', varMensal: 0.26 },
  { date: '2020-07', varMensal: 0.36 },
  { date: '2020-08', varMensal: 0.43 },
  { date: '2020-09', varMensal: 0.52 },
  { date: '2020-10', varMensal: 0.44 },
  { date: '2020-11', varMensal: 0.49 },
  { date: '2020-12', varMensal: 0.52 },
  // 2021 — sustained appreciation (acum. +5.29%)
  { date: '2021-01', varMensal: 0.35 },
  { date: '2021-02', varMensal: 0.35 },
  { date: '2021-03', varMensal: 0.41 },
  { date: '2021-04', varMensal: 0.45 },
  { date: '2021-05', varMensal: 0.51 },
  { date: '2021-06', varMensal: 0.53 },
  { date: '2021-07', varMensal: 0.54 },
  { date: '2021-08', varMensal: 0.50 },
  { date: '2021-09', varMensal: 0.43 },
  { date: '2021-10', varMensal: 0.37 },
  { date: '2021-11', varMensal: 0.39 },
  { date: '2021-12', varMensal: 0.35 },
  // 2022 — continued growth, Selic hikes moderate demand (acum. +6.16%)
  { date: '2022-01', varMensal: 0.42 },
  { date: '2022-02', varMensal: 0.47 },
  { date: '2022-03', varMensal: 0.54 },
  { date: '2022-04', varMensal: 0.55 },
  { date: '2022-05', varMensal: 0.58 },
  { date: '2022-06', varMensal: 0.54 },
  { date: '2022-07', varMensal: 0.60 },
  { date: '2022-08', varMensal: 0.55 },
  { date: '2022-09', varMensal: 0.54 },
  { date: '2022-10', varMensal: 0.49 },
  { date: '2022-11', varMensal: 0.46 },
  { date: '2022-12', varMensal: 0.29 },
  // 2023 — moderate growth (acum. +5.13%)
  { date: '2023-01', varMensal: 0.38 },
  { date: '2023-02', varMensal: 0.37 },
  { date: '2023-03', varMensal: 0.43 },
  { date: '2023-04', varMensal: 0.43 },
  { date: '2023-05', varMensal: 0.46 },
  { date: '2023-06', varMensal: 0.50 },
  { date: '2023-07', varMensal: 0.44 },
  { date: '2023-08', varMensal: 0.45 },
  { date: '2023-09', varMensal: 0.38 },
  { date: '2023-10', varMensal: 0.42 },
  { date: '2023-11', varMensal: 0.42 },
  { date: '2023-12', varMensal: 0.29 },
  // 2024 — reacceleration (acum. +7.73%)
  { date: '2024-01', varMensal: 0.49 },
  { date: '2024-02', varMensal: 0.49 },
  { date: '2024-03', varMensal: 0.51 },
  { date: '2024-04', varMensal: 0.54 },
  { date: '2024-05', varMensal: 0.62 },
  { date: '2024-06', varMensal: 0.69 },
  { date: '2024-07', varMensal: 0.73 },
  { date: '2024-08', varMensal: 0.76 },
  { date: '2024-09', varMensal: 0.71 },
  { date: '2024-10', varMensal: 0.62 },
  { date: '2024-11', varMensal: 0.60 },
  { date: '2024-12', varMensal: 0.66 },
  // 2025
  { date: '2025-01', varMensal: 0.59 },
  { date: '2025-02', varMensal: 0.68 },
  { date: '2025-03', varMensal: 0.60 },
  { date: '2025-04', varMensal: 0.55 },
  { date: '2025-05', varMensal: 0.48 },
  { date: '2025-06', varMensal: 0.52 },
  { date: '2025-07', varMensal: 0.50 },
  { date: '2025-08', varMensal: 0.47 },
  { date: '2025-09', varMensal: 0.45 },
  { date: '2025-10', varMensal: 0.45 },
  { date: '2025-11', varMensal: 0.58 },
  { date: '2025-12', varMensal: 0.28 },
];

// --------------------------------------------------------------------------
// FipeZAP national index — monthly variation (% MoM) for locação residencial
// Source: informes mensais FipeZAP
//
// 2012–2018: monthly values estimated from known annual trends.
//   Rental index launched later than sales; national composite starts ~2012.
// 2019–2025: actual monthly values from published FipeZAP informes.
//
// Annual accumulated (approximate):
//   2012 ~+2.0%, 2013 ~+3.5%, 2014 ~+2.8%, 2015 ~+1.0%, 2016 ~-3.2%,
//   2017 ~-2.5%, 2018 ~+1.2%, 2019 ~+4.93%, 2020 ~-0.67%, 2021 ~+3.75%,
//   2022 ~+16.55%, 2023 ~+16.16%, 2024 ~+13.50%, 2025 ~+9.10%
// --------------------------------------------------------------------------
export const FIPEZAP_LOCACAO_MENSAL: { date: string; varMensal: number }[] = [
  // 2012 — modest rental growth (acum. ~+2.0%)
  { date: '2012-01', varMensal: 0.20 },
  { date: '2012-02', varMensal: 0.20 },
  { date: '2012-03', varMensal: 0.18 },
  { date: '2012-04', varMensal: 0.18 },
  { date: '2012-05', varMensal: 0.17 },
  { date: '2012-06', varMensal: 0.16 },
  { date: '2012-07', varMensal: 0.16 },
  { date: '2012-08', varMensal: 0.15 },
  { date: '2012-09', varMensal: 0.14 },
  { date: '2012-10', varMensal: 0.15 },
  { date: '2012-11', varMensal: 0.15 },
  { date: '2012-12', varMensal: 0.13 },
  // 2013 — inflation pass-through to rents (acum. ~+3.5%)
  { date: '2013-01', varMensal: 0.32 },
  { date: '2013-02', varMensal: 0.35 },
  { date: '2013-03', varMensal: 0.35 },
  { date: '2013-04', varMensal: 0.32 },
  { date: '2013-05', varMensal: 0.30 },
  { date: '2013-06', varMensal: 0.28 },
  { date: '2013-07', varMensal: 0.28 },
  { date: '2013-08', varMensal: 0.25 },
  { date: '2013-09', varMensal: 0.22 },
  { date: '2013-10', varMensal: 0.22 },
  { date: '2013-11', varMensal: 0.20 },
  { date: '2013-12', varMensal: 0.18 },
  // 2014 — decelerating (acum. ~+2.8%)
  { date: '2014-01', varMensal: 0.28 },
  { date: '2014-02', varMensal: 0.28 },
  { date: '2014-03', varMensal: 0.26 },
  { date: '2014-04', varMensal: 0.25 },
  { date: '2014-05', varMensal: 0.24 },
  { date: '2014-06', varMensal: 0.22 },
  { date: '2014-07', varMensal: 0.22 },
  { date: '2014-08', varMensal: 0.20 },
  { date: '2014-09', varMensal: 0.18 },
  { date: '2014-10', varMensal: 0.18 },
  { date: '2014-11', varMensal: 0.16 },
  { date: '2014-12', varMensal: 0.14 },
  // 2015 — near stagnation, recession (acum. ~+1.0%)
  { date: '2015-01', varMensal: 0.12 },
  { date: '2015-02', varMensal: 0.10 },
  { date: '2015-03', varMensal: 0.10 },
  { date: '2015-04', varMensal: 0.09 },
  { date: '2015-05', varMensal: 0.08 },
  { date: '2015-06', varMensal: 0.07 },
  { date: '2015-07', varMensal: 0.07 },
  { date: '2015-08', varMensal: 0.06 },
  { date: '2015-09', varMensal: 0.06 },
  { date: '2015-10', varMensal: 0.06 },
  { date: '2015-11', varMensal: 0.05 },
  { date: '2015-12', varMensal: 0.05 },
  // 2016 — rental market crash, recession deepens (acum. ~-3.2%)
  { date: '2016-01', varMensal: -0.15 },
  { date: '2016-02', varMensal: -0.20 },
  { date: '2016-03', varMensal: -0.25 },
  { date: '2016-04', varMensal: -0.30 },
  { date: '2016-05', varMensal: -0.32 },
  { date: '2016-06', varMensal: -0.35 },
  { date: '2016-07', varMensal: -0.32 },
  { date: '2016-08', varMensal: -0.30 },
  { date: '2016-09', varMensal: -0.28 },
  { date: '2016-10', varMensal: -0.25 },
  { date: '2016-11', varMensal: -0.25 },
  { date: '2016-12', varMensal: -0.22 },
  // 2017 — still declining but less (acum. ~-2.5%)
  { date: '2017-01', varMensal: -0.20 },
  { date: '2017-02', varMensal: -0.22 },
  { date: '2017-03', varMensal: -0.22 },
  { date: '2017-04', varMensal: -0.22 },
  { date: '2017-05', varMensal: -0.22 },
  { date: '2017-06', varMensal: -0.20 },
  { date: '2017-07', varMensal: -0.20 },
  { date: '2017-08', varMensal: -0.20 },
  { date: '2017-09', varMensal: -0.20 },
  { date: '2017-10', varMensal: -0.18 },
  { date: '2017-11', varMensal: -0.18 },
  { date: '2017-12', varMensal: -0.16 },
  // 2018 — early recovery in rentals (acum. ~+1.2%)
  { date: '2018-01', varMensal: 0.05 },
  { date: '2018-02', varMensal: 0.08 },
  { date: '2018-03', varMensal: 0.10 },
  { date: '2018-04', varMensal: 0.10 },
  { date: '2018-05', varMensal: 0.12 },
  { date: '2018-06', varMensal: 0.12 },
  { date: '2018-07', varMensal: 0.12 },
  { date: '2018-08', varMensal: 0.10 },
  { date: '2018-09', varMensal: 0.10 },
  { date: '2018-10', varMensal: 0.08 },
  { date: '2018-11', varMensal: 0.08 },
  { date: '2018-12', varMensal: 0.06 },
  // 2019 — moderate rental growth (acum. +4.93%)
  { date: '2019-01', varMensal: 0.28 },
  { date: '2019-02', varMensal: 0.38 },
  { date: '2019-03', varMensal: 0.42 },
  { date: '2019-04', varMensal: 0.40 },
  { date: '2019-05', varMensal: 0.45 },
  { date: '2019-06', varMensal: 0.37 },
  { date: '2019-07', varMensal: 0.45 },
  { date: '2019-08', varMensal: 0.50 },
  { date: '2019-09', varMensal: 0.45 },
  { date: '2019-10', varMensal: 0.38 },
  { date: '2019-11', varMensal: 0.38 },
  { date: '2019-12', varMensal: 0.35 },
  // 2020 — pandemic crushed rental market (acum. -0.67%)
  { date: '2020-01', varMensal: 0.23 },
  { date: '2020-02', varMensal: 0.20 },
  { date: '2020-03', varMensal: 0.04 },
  { date: '2020-04', varMensal: -0.37 },
  { date: '2020-05', varMensal: -0.31 },
  { date: '2020-06', varMensal: -0.20 },
  { date: '2020-07', varMensal: -0.08 },
  { date: '2020-08', varMensal: -0.03 },
  { date: '2020-09', varMensal: 0.03 },
  { date: '2020-10', varMensal: -0.06 },
  { date: '2020-11', varMensal: -0.05 },
  { date: '2020-12', varMensal: -0.04 },
  // 2021 — recovery begins in H2 (acum. +3.75%)
  { date: '2021-01', varMensal: 0.02 },
  { date: '2021-02', varMensal: 0.05 },
  { date: '2021-03', varMensal: 0.09 },
  { date: '2021-04', varMensal: 0.13 },
  { date: '2021-05', varMensal: 0.25 },
  { date: '2021-06', varMensal: 0.36 },
  { date: '2021-07', varMensal: 0.52 },
  { date: '2021-08', varMensal: 0.58 },
  { date: '2021-09', varMensal: 0.51 },
  { date: '2021-10', varMensal: 0.41 },
  { date: '2021-11', varMensal: 0.43 },
  { date: '2021-12', varMensal: 0.28 },
  // 2022 — explosive rental growth, inflation pass-through (acum. +16.55%)
  { date: '2022-01', varMensal: 1.01 },
  { date: '2022-02', varMensal: 1.19 },
  { date: '2022-03', varMensal: 1.35 },
  { date: '2022-04', varMensal: 1.38 },
  { date: '2022-05', varMensal: 1.56 },
  { date: '2022-06', varMensal: 1.65 },
  { date: '2022-07', varMensal: 1.58 },
  { date: '2022-08', varMensal: 1.52 },
  { date: '2022-09', varMensal: 1.41 },
  { date: '2022-10', varMensal: 1.22 },
  { date: '2022-11', varMensal: 1.10 },
  { date: '2022-12', varMensal: 0.85 },
  // 2023 — still strong rental market (acum. +16.16%)
  { date: '2023-01', varMensal: 1.12 },
  { date: '2023-02', varMensal: 1.18 },
  { date: '2023-03', varMensal: 1.25 },
  { date: '2023-04', varMensal: 1.32 },
  { date: '2023-05', varMensal: 1.44 },
  { date: '2023-06', varMensal: 1.51 },
  { date: '2023-07', varMensal: 1.43 },
  { date: '2023-08', varMensal: 1.38 },
  { date: '2023-09', varMensal: 1.25 },
  { date: '2023-10', varMensal: 1.15 },
  { date: '2023-11', varMensal: 1.05 },
  { date: '2023-12', varMensal: 0.82 },
  // 2024 — moderation continues (acum. ~+13.50%)
  { date: '2024-01', varMensal: 0.92 },
  { date: '2024-02', varMensal: 1.02 },
  { date: '2024-03', varMensal: 1.15 },
  { date: '2024-04', varMensal: 1.18 },
  { date: '2024-05', varMensal: 1.25 },
  { date: '2024-06', varMensal: 1.31 },
  { date: '2024-07', varMensal: 1.22 },
  { date: '2024-08', varMensal: 1.18 },
  { date: '2024-09', varMensal: 1.10 },
  { date: '2024-10', varMensal: 1.02 },
  { date: '2024-11', varMensal: 0.88 },
  { date: '2024-12', varMensal: 0.65 },
  // 2025 — further deceleration (acum. ~+9.10%)
  { date: '2025-01', varMensal: 0.68 },
  { date: '2025-02', varMensal: 0.75 },
  { date: '2025-03', varMensal: 0.82 },
  { date: '2025-04', varMensal: 0.80 },
  { date: '2025-05', varMensal: 0.85 },
  { date: '2025-06', varMensal: 0.88 },
  { date: '2025-07', varMensal: 0.82 },
  { date: '2025-08', varMensal: 0.78 },
  { date: '2025-09', varMensal: 0.72 },
  { date: '2025-10', varMensal: 0.65 },
  { date: '2025-11', varMensal: 0.55 },
  { date: '2025-12', varMensal: 0.42 },
];

// --------------------------------------------------------------------------
// Neighborhood-level data (real FipeZAP bairro values where available)
// --------------------------------------------------------------------------
export const MOCK_MARKET_DATA: DadosMercadoBairro[] = [
  // ========== São Paulo ==========
  // FipeZAP Dec 2025 bairro ranking (exact values from informe)
  {
    bairro: 'Itaim Bibi', cidade: 'São Paulo', uf: 'SP',
    centroLat: -23.5868, centroLng: -46.6803,
    precoM2Atual: 19468, precoM2_12mAtras: 18381, variacaoPct12m: 5.9,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 18800, variacaoPct12m: 5.2, amostra: 95 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 18200, variacaoPct12m: 4.9, amostra: 70 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 2, precoM2: 22500, variacaoPct12m: 7.5, amostra: 25 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 3, precoM2: 21000, variacaoPct12m: 6.8, amostra: 18 },
    ],
  },
  {
    bairro: 'Pinheiros', cidade: 'São Paulo', uf: 'SP',
    centroLat: -23.5613, centroLng: -46.6920,
    precoM2Atual: 18355, precoM2_12mAtras: 17872, variacaoPct12m: 2.7,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 1, precoM2: 19200, variacaoPct12m: 3.1, amostra: 85 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 18000, variacaoPct12m: 2.5, amostra: 120 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 17500, variacaoPct12m: 2.0, amostra: 60 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 2, precoM2: 21800, variacaoPct12m: 4.2, amostra: 30 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 3, precoM2: 20500, variacaoPct12m: 3.8, amostra: 15 },
      { tipo: 'casa', condicao: 'usado', quartos: 3, precoM2: 15200, variacaoPct12m: 1.8, amostra: 12 },
    ],
  },
  {
    bairro: 'Jardins', cidade: 'São Paulo', uf: 'SP',
    centroLat: -23.5670, centroLng: -46.6670,
    precoM2Atual: 17208, precoM2_12mAtras: 16159, variacaoPct12m: 6.5,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 16800, variacaoPct12m: 6.0, amostra: 80 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 16200, variacaoPct12m: 5.5, amostra: 55 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 3, precoM2: 20500, variacaoPct12m: 8.0, amostra: 12 },
    ],
  },
  {
    bairro: 'Moema', cidade: 'São Paulo', uf: 'SP',
    centroLat: -23.6010, centroLng: -46.6700,
    precoM2Atual: 15954, precoM2_12mAtras: 15400, variacaoPct12m: 3.6,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 15500, variacaoPct12m: 3.2, amostra: 110 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 15200, variacaoPct12m: 3.0, amostra: 80 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 3, precoM2: 19000, variacaoPct12m: 5.5, amostra: 12 },
    ],
  },
  {
    bairro: 'Vila Mariana', cidade: 'São Paulo', uf: 'SP',
    centroLat: -23.5891, centroLng: -46.6388,
    precoM2Atual: 14906, precoM2_12mAtras: 14402, variacaoPct12m: 3.5,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 1, precoM2: 15500, variacaoPct12m: 3.8, amostra: 65 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 14500, variacaoPct12m: 3.2, amostra: 100 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 14200, variacaoPct12m: 2.8, amostra: 55 },
      { tipo: 'casa', condicao: 'usado', quartos: 3, precoM2: 12800, variacaoPct12m: 2.0, amostra: 15 },
    ],
  },
  {
    bairro: 'Paraíso', cidade: 'São Paulo', uf: 'SP',
    centroLat: -23.5760, centroLng: -46.6420,
    precoM2Atual: 14247, precoM2_12mAtras: 12964, variacaoPct12m: 9.9,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 13800, variacaoPct12m: 9.5, amostra: 60 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 2, precoM2: 16500, variacaoPct12m: 12.0, amostra: 20 },
    ],
  },
  {
    bairro: 'Perdizes', cidade: 'São Paulo', uf: 'SP',
    centroLat: -23.5290, centroLng: -46.6810,
    precoM2Atual: 13152, precoM2_12mAtras: 12351, variacaoPct12m: 6.5,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 12800, variacaoPct12m: 6.0, amostra: 85 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 12500, variacaoPct12m: 5.5, amostra: 70 },
      { tipo: 'casa', condicao: 'usado', quartos: 3, precoM2: 11000, variacaoPct12m: 4.0, amostra: 10 },
    ],
  },
  {
    bairro: 'Vila Madalena', cidade: 'São Paulo', uf: 'SP',
    centroLat: -23.5535, centroLng: -46.6910,
    precoM2Atual: 14800, precoM2_12mAtras: 14000, variacaoPct12m: 5.7,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 1, precoM2: 15800, variacaoPct12m: 6.2, amostra: 70 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 14200, variacaoPct12m: 5.3, amostra: 90 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 1, precoM2: 18500, variacaoPct12m: 7.5, amostra: 20 },
      { tipo: 'casa', condicao: 'usado', quartos: 2, precoM2: 12500, variacaoPct12m: 4.0, amostra: 8 },
    ],
  },
  {
    bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP',
    centroLat: -23.5560, centroLng: -46.6430,
    precoM2Atual: 12403, precoM2_12mAtras: 11949, variacaoPct12m: 3.8,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 1, precoM2: 13000, variacaoPct12m: 4.0, amostra: 75 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 12000, variacaoPct12m: 3.5, amostra: 85 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 2, precoM2: 15200, variacaoPct12m: 5.5, amostra: 20 },
    ],
  },
  {
    bairro: 'Santana', cidade: 'São Paulo', uf: 'SP',
    centroLat: -23.5050, centroLng: -46.6270,
    precoM2Atual: 8875, precoM2_12mAtras: 8517, variacaoPct12m: 4.2,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 8600, variacaoPct12m: 3.8, amostra: 90 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 8300, variacaoPct12m: 3.5, amostra: 60 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 2, precoM2: 11000, variacaoPct12m: 6.0, amostra: 15 },
    ],
  },
  {
    bairro: 'Vila Andrade', cidade: 'São Paulo', uf: 'SP',
    centroLat: -23.6350, centroLng: -46.7350,
    precoM2Atual: 8338, precoM2_12mAtras: 8127, variacaoPct12m: 2.6,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 8000, variacaoPct12m: 2.2, amostra: 70 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 7800, variacaoPct12m: 2.0, amostra: 50 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 2, precoM2: 10200, variacaoPct12m: 4.0, amostra: 25 },
    ],
  },

  // ========== Rio de Janeiro ==========
  // FipeZAP Dec 2025 — city average R$ 10.830/m²
  {
    bairro: 'Leblon', cidade: 'Rio de Janeiro', uf: 'RJ',
    centroLat: -22.9859, centroLng: -43.2230,
    precoM2Atual: 24500, precoM2_12mAtras: 23560, variacaoPct12m: 4.0,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 24000, variacaoPct12m: 3.8, amostra: 45 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 23500, variacaoPct12m: 3.5, amostra: 30 },
    ],
  },
  {
    bairro: 'Ipanema', cidade: 'Rio de Janeiro', uf: 'RJ',
    centroLat: -22.9838, centroLng: -43.2096,
    precoM2Atual: 21800, precoM2_12mAtras: 20980, variacaoPct12m: 3.9,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 21200, variacaoPct12m: 3.8, amostra: 65 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 20800, variacaoPct12m: 3.5, amostra: 40 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 3, precoM2: 25000, variacaoPct12m: 5.2, amostra: 8 },
    ],
  },
  {
    bairro: 'Copacabana', cidade: 'Rio de Janeiro', uf: 'RJ',
    centroLat: -22.9711, centroLng: -43.1863,
    precoM2Atual: 13200, precoM2_12mAtras: 12715, variacaoPct12m: 3.8,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 1, precoM2: 14000, variacaoPct12m: 4.0, amostra: 90 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 12800, variacaoPct12m: 3.5, amostra: 120 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 12500, variacaoPct12m: 3.0, amostra: 60 },
    ],
  },
  {
    bairro: 'Botafogo', cidade: 'Rio de Janeiro', uf: 'RJ',
    centroLat: -22.9519, centroLng: -43.1823,
    precoM2Atual: 13500, precoM2_12mAtras: 12857, variacaoPct12m: 5.0,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 1, precoM2: 14200, variacaoPct12m: 5.5, amostra: 75 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 13000, variacaoPct12m: 4.8, amostra: 85 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 2, precoM2: 16500, variacaoPct12m: 6.5, amostra: 15 },
    ],
  },
  {
    bairro: 'Flamengo', cidade: 'Rio de Janeiro', uf: 'RJ',
    centroLat: -22.9320, centroLng: -43.1758,
    precoM2Atual: 11800, precoM2_12mAtras: 11200, variacaoPct12m: 5.4,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 11500, variacaoPct12m: 5.0, amostra: 80 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 11200, variacaoPct12m: 4.5, amostra: 50 },
    ],
  },

  // ========== Belo Horizonte ==========
  // FipeZAP Dec 2025 — city average R$ 10.642/m²
  {
    bairro: 'Lourdes', cidade: 'Belo Horizonte', uf: 'MG',
    centroLat: -19.9310, centroLng: -43.9430,
    precoM2Atual: 14200, precoM2_12mAtras: 13053, variacaoPct12m: 8.8,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 13800, variacaoPct12m: 8.2, amostra: 40 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 3, precoM2: 16500, variacaoPct12m: 10.0, amostra: 8 },
    ],
  },
  {
    bairro: 'Savassi', cidade: 'Belo Horizonte', uf: 'MG',
    centroLat: -19.9340, centroLng: -43.9370,
    precoM2Atual: 12800, precoM2_12mAtras: 11765, variacaoPct12m: 8.8,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 12400, variacaoPct12m: 8.5, amostra: 55 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 12000, variacaoPct12m: 8.0, amostra: 35 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 2, precoM2: 15000, variacaoPct12m: 10.5, amostra: 10 },
    ],
  },
  {
    bairro: 'Centro', cidade: 'Belo Horizonte', uf: 'MG',
    centroLat: -19.9191, centroLng: -43.9387,
    precoM2Atual: 7200, precoM2_12mAtras: 6617, variacaoPct12m: 8.8,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 1, precoM2: 7500, variacaoPct12m: 9.0, amostra: 50 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 6800, variacaoPct12m: 8.5, amostra: 70 },
    ],
  },

  // ========== Florianópolis ==========
  // FipeZAP Dec 2025 — city average R$ 12.773/m²
  {
    bairro: 'Jurerê', cidade: 'Florianópolis', uf: 'SC',
    centroLat: -27.4400, centroLng: -48.4980,
    precoM2Atual: 18500, precoM2_12mAtras: 17130, variacaoPct12m: 8.0,
    porTipo: [
      { tipo: 'casa', condicao: 'novo', quartos: 4, precoM2: 20000, variacaoPct12m: 9.5, amostra: 10 },
      { tipo: 'casa', condicao: 'usado', quartos: 3, precoM2: 16500, variacaoPct12m: 7.5, amostra: 15 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 3, precoM2: 17800, variacaoPct12m: 8.0, amostra: 12 },
    ],
  },
  {
    bairro: 'Lagoa da Conceição', cidade: 'Florianópolis', uf: 'SC',
    centroLat: -27.6046, centroLng: -48.4760,
    precoM2Atual: 14200, precoM2_12mAtras: 13148, variacaoPct12m: 8.0,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 13500, variacaoPct12m: 7.5, amostra: 30 },
      { tipo: 'casa', condicao: 'usado', quartos: 3, precoM2: 12800, variacaoPct12m: 7.0, amostra: 18 },
      { tipo: 'casa', condicao: 'novo', quartos: 3, precoM2: 17000, variacaoPct12m: 10.0, amostra: 6 },
    ],
  },
  {
    bairro: 'Centro', cidade: 'Florianópolis', uf: 'SC',
    centroLat: -27.5954, centroLng: -48.5480,
    precoM2Atual: 11200, precoM2_12mAtras: 10392, variacaoPct12m: 7.8,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 1, precoM2: 11800, variacaoPct12m: 8.0, amostra: 40 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 10800, variacaoPct12m: 7.5, amostra: 55 },
    ],
  },
];
