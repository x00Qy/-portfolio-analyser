import { Holding } from './parser';
import { MarketData, isPriceReliable } from './marketData';
import { RiskMetrics } from './riskAnalyzer';

export interface ProjectionResult {
  reliableCount: number;
  totalCount: number;
  horizons: {
    months: number;
    label: string;
    bear: number;
    base: number;
    bull: number;
    baseReturn: number;
  }[];
  percentiles: {
    months: number;
    label: string;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  }[];
  lossProbability1Y: number;
  doubleProbability5Y: number;
  scenarios: {
    name: string;
    returnPct: number;
    value: number;
    description: string;
  }[];
}

export function runProjections(
  holdings: Holding[],
  marketData: Map<string, MarketData>,
  riskMetrics: RiskMetrics
): ProjectionResult {
  // Same reasoning as riskAnalyzer.ts/stockAnalyzer.ts: a fabricated
  // currentValue (priceUnavailable holdings priced at cost basis, or an
  // AI-estimated one) must not size the base every bear/base/bull/percentile
  // figure below is multiplied against. Projections therefore cover only the
  // reliably-priced portion of the portfolio — reliableCount/totalCount let
  // the caller label that rather than presenting it as the whole portfolio.
  const reliableHoldings = holdings.filter(h => isPriceReliable(h, marketData));
  const totalValue = reliableHoldings.reduce((s, h) => s + h.currentValue, 0);

  const baseVolatility = 0.18;
  const concentrationMultiplier = 1 + (riskMetrics.concentration.hhi * 2);
  const volatility = baseVolatility * concentrationMultiplier;

  const expectedReturn = 0.12;

  const horizons = [3, 6, 12, 24, 36, 60];
  const projectionHorizons = [];
  const percentiles = [];

  for (const months of horizons) {
    const years = months / 12;
    const mean = expectedReturn * years;
    const stdDev = volatility * Math.sqrt(years);

    const baseReturn = (Math.exp(mean) - 1) * 100;
    const baseValue = totalValue * Math.exp(mean);

    const bearValue = totalValue * Math.exp(mean - 2 * stdDev);
    const bullValue = totalValue * Math.exp(mean + 2 * stdDev);

    projectionHorizons.push({
      months,
      label: months >= 12 ? `${months / 12} Year${months > 12 ? 's' : ''}` : `${months} Months`,
      bear: bearValue,
      base: baseValue,
      bull: bullValue,
      baseReturn,
    });

    percentiles.push({
      months,
      label: months >= 12 ? `${months / 12} Year${months > 12 ? 's' : ''}` : `${months} Months`,
      p10: totalValue * Math.exp(mean - 1.28 * stdDev),
      p25: totalValue * Math.exp(mean - 0.67 * stdDev),
      p50: totalValue * Math.exp(mean),
      p75: totalValue * Math.exp(mean + 0.67 * stdDev),
      p90: totalValue * Math.exp(mean + 1.28 * stdDev),
    });
  }

  const lossProbability1Y = normalCDF(-expectedReturn / volatility) * 100;
  const doubleProbability5Y = (1 - normalCDF((Math.log(2) - expectedReturn * 5) / (volatility * Math.sqrt(5)))) * 100;

  const scenarios = [
    { name: '🐻 Market Crash (-30%)', returnPct: -30, value: totalValue * 0.7, description: 'Nifty drops 30% (like Mar 2020 COVID crash)' },
    { name: '📉 Bear Market (-15%)', returnPct: -15, value: totalValue * 0.85, description: 'Sustained 6-12 month selloff' },
    { name: '➡️ Flat Market (0%)', returnPct: 0, value: totalValue, description: 'Nifty sideways for 1 year' },
    { name: '📈 Bull Run (+20%)', returnPct: 20, value: totalValue * 1.2, description: 'Strong bull market year' },
    { name: '🚀 Super Bull (+40%)', returnPct: 40, value: totalValue * 1.4, description: 'Exceptional year like FY2021' },
  ];

  return {
    reliableCount: reliableHoldings.length,
    totalCount: holdings.length,
    horizons: projectionHorizons,
    percentiles,
    lossProbability1Y,
    doubleProbability5Y,
    scenarios,
  };
}

function normalCDF(x: number): number {
  const t = 1.0 / (1.0 + 0.2316419 * Math.abs(x));
  const d = 0.39894228 * Math.exp(-x * x / 2.0);
  const poly = ((((1.330274429 * t - 1.821255978) * t + 1.781477937) * t - 0.356563782) * t + 0.319381530) * t;
  return x >= 0 ? 1.0 - d * poly : d * poly;
}