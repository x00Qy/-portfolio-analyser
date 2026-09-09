import { Holding } from './parser';
import { MarketData, isPriceReliable } from './marketData';
import { hasUnverifiedCostBasis } from './stockAnalyzer';

export interface RiskMetrics {
  riskScore: number;
  riskLevel: string;
  diversificationScore: number;
  beta: number;
  reliableCount: number;
  totalCount: number;
  sectorExposure: { sector: string; weight: number; count: number }[];
  concentration: {
    topHolding: string;
    topHoldingWeight: number;
    top3Weight: number;
    top5Weight: number;
    hhi: number;
  };
  stockMetrics: {
    symbol: string;
    weight: number;
    priceReliable: boolean;
    peRatio: number;
    aiEstimatedPE: boolean;
    vs52WeekHigh: number;
    vs52WeekLow: number;
    flags: string[];
  }[];
  alerts: { level: string; message: string }[];
}

export function analyzeRisk(holdings: Holding[], marketData: Map<string, MarketData>): RiskMetrics {
  // Concentration, sector exposure, and beta must not be computed against a
  // total that includes fabricated currentValue (priceUnavailable holdings
  // are priced at cost basis, AI-estimated ones may be hallucinated) — both
  // would silently distort every weight-derived number below. totalValue is
  // therefore the sum over RELIABLY-priced holdings only; everything sized
  // off it (sector %, top3/top5/HHI, beta) reflects that reliable subset,
  // not the whole portfolio. reliableCount/totalCount let the caller label
  // this rather than presenting it as complete.
  const reliableHoldings = holdings.filter(h => isPriceReliable(h, marketData));
  const totalValue = reliableHoldings.reduce((s, h) => s + h.currentValue, 0);

  // Sector exposure — count reflects every holding (a real fact regardless of
  // price reliability); weight accumulates only from the reliable subset, so
  // weights sum to 100% of totalValue above, not of the full portfolio.
  const sectorMap = new Map<string, { weight: number; count: number }>();
  for (const h of holdings) {
    const md = marketData.get(h.symbol);
    const sector = md?.sector || h.sector || 'Unknown';
    const existing = sectorMap.get(sector) || { weight: 0, count: 0 };
    if (totalValue > 0 && isPriceReliable(h, marketData)) {
      existing.weight += h.currentValue / totalValue;
    }
    existing.count++;
    sectorMap.set(sector, existing);
  }

  const sectorExposure = Array.from(sectorMap.entries())
    .map(([sector, { weight, count }]) => ({ sector, weight, count }))
    .sort((a, b) => b.weight - a.weight);

  // Concentration — reliable holdings only, same reasoning as totalValue above.
  const sortedByValue = [...reliableHoldings].sort((a, b) => b.currentValue - a.currentValue);
  const topHolding = sortedByValue[0];
  const top3Weight = totalValue > 0 ? sortedByValue.slice(0, 3).reduce((s, h) => s + h.currentValue, 0) / totalValue : 0;
  const top5Weight = totalValue > 0 ? sortedByValue.slice(0, 5).reduce((s, h) => s + h.currentValue, 0) / totalValue : 0;
  const hhi = totalValue > 0
    ? reliableHoldings.reduce((sum, h) => { const w = h.currentValue / totalValue; return sum + w * w; }, 0)
    : 0;

  // Per-stock metrics — one row per holding (so the report still shows every
  // stock), but an unreliable holding gets weight 0 rather than a number
  // computed against a total it was excluded from — it can never register
  // as "Overweight" off a currentValue nothing here trusts.
  const stockMetrics = holdings.map(h => {
    const md = marketData.get(h.symbol);
    const priceReliable = isPriceReliable(h, marketData);
    const weight = (totalValue > 0 && priceReliable) ? h.currentValue / totalValue : 0;
    const peRatio = md?.peRatio || 0;
    const aiEstimatedPE = md?.aiEstimatedPE || false;

    // FIX: guard against 0/undefined yearHigh/yearLow → no more NaN%
    const vs52WeekHigh = (md?.yearHigh && md.yearHigh > 0)
      ? ((h.currentPrice - md.yearHigh) / md.yearHigh) * 100
      : 0;
    const vs52WeekLow = (md?.yearLow && md.yearLow > 0)
      ? ((h.currentPrice - md.yearLow) / md.yearLow) * 100
      : 0;

    const flags: string[] = [];
    if (peRatio > 50) flags.push('High PE');
    if (md && !aiEstimatedPE) {
      if (vs52WeekHigh > -10) flags.push('Near 52W High');
      if (vs52WeekLow < 20 && vs52WeekLow > 0) flags.push('Near 52W Low');
    }
    if (md?.aiEstimatedPrice === true) flags.push('AI Price');
    if (aiEstimatedPE) flags.push('AI PE');
    if (weight > 0.15) flags.push('Overweight');
    // An unverified cost basis means pnlPercent itself may not be real (see
    // stockAnalyzer.ts) — an unverified loss must not read as a loss here,
    // the same holding that shows HOLD/"Unverified Cost Basis" in the
    // recommendation section two sections earlier.
    if (hasUnverifiedCostBasis(h)) {
      flags.push('Unverified Cost Basis');
    } else if (h.pnlPercent < -25) flags.push('Deep Loss');
    else if (h.pnlPercent < -15) flags.push('Significant Loss');
    else if (h.pnlPercent < -5) flags.push('Moderate Loss');
    if (flags.length === 0) flags.push('Clean');

    return {
      symbol: h.symbol.replace('.NS', '').replace('.BO', ''),
      weight,
      priceReliable,
      peRatio,
      aiEstimatedPE,
      vs52WeekHigh,
      vs52WeekLow,
      flags,
    };
  }).sort((a, b) => b.weight - a.weight);

  // Risk score
  const concentrationRisk = Math.min(50, hhi * 100);
  const sectorRisk = Math.min(30, (sectorExposure[0]?.weight || 0) * 30);
  const sizeRisk = holdings.length < 10 ? 10 : 0;
  const lossRisk = holdings.filter(h =>
    isPriceReliable(h, marketData) && !hasUnverifiedCostBasis(h) && h.pnlPercent < -20
  ).length * 3;
  const riskScore = Math.round(Math.min(100, concentrationRisk + sectorRisk + sizeRisk + lossRisk + 5));

  const riskLevel = riskScore < 25 ? 'LOW'
    : riskScore < 50 ? 'MODERATE'
    : riskScore < 75 ? 'HIGH'
    : 'VERY HIGH';

  const diversificationScore = Math.round(Math.min(100,
    (holdings.length >= 15 ? 30 : holdings.length * 2) +
    (sectorExposure.length >= 5 ? 30 : sectorExposure.length * 6) +
    (hhi < 0.1 ? 40 : hhi < 0.2 ? 30 : hhi < 0.3 ? 20 : 10)
  ));

  // Beta estimate by sector
  const sectorBetaMap: Record<string, number> = {
    'IT': 0.85, 'Technology': 0.90, 'Financial Services': 1.10,
    'Energy': 0.95, 'Healthcare': 0.75, 'Consumer Goods': 0.80,
    'FMCG': 0.70, 'Automobile': 1.05, 'Infrastructure': 1.15,
    'Telecom': 0.90, 'Materials': 1.10, 'Industrials': 1.05,
    'Real Estate': 1.20, 'Consumer Services': 1.15, 'Logistics': 1.00,
    'Utilities': 0.65, 'Textiles': 1.00, 'Conglomerate': 1.00, 'Others': 1.00,
  };
  // Reliable holdings only, same reasoning as totalValue — an unreliable
  // holding's currentValue can't be trusted as an input to a weighted average.
  const estimatedBeta = totalValue > 0
    ? reliableHoldings.reduce((sum, h) => {
        const w = h.currentValue / totalValue;
        return sum + w * (sectorBetaMap[h.sector] ?? 1.0);
      }, 0)
    : 0;

  // Alerts
  const alerts: { level: string; message: string }[] = [];
  if (sectorExposure[0]?.weight > 0.35) {
    alerts.push({ level: 'HIGH', message: `Sector Concentration: ${(sectorExposure[0].weight * 100).toFixed(1)}% in ${sectorExposure[0].sector}` });
  } else if (sectorExposure[0]?.weight > 0.25) {
    alerts.push({ level: 'MED', message: `Sector Concentration: ${(sectorExposure[0].weight * 100).toFixed(1)}% in ${sectorExposure[0].sector}` });
  }
  if (hhi > 0.15) {
    alerts.push({ level: 'MED', message: `High Concentration Risk: HHI = ${hhi.toFixed(3)} (above 0.15 is concentrated)` });
  }
  if (holdings.length < 10) {
    alerts.push({ level: 'LOW', message: `Under-diversified: Only ${holdings.length} stocks — aim for 12-15 minimum` });
  }
  const deepLosers = holdings.filter(h =>
    isPriceReliable(h, marketData) && !hasUnverifiedCostBasis(h) && h.pnlPercent < -25
  );
  if (deepLosers.length > 0) {
    alerts.push({ level: 'HIGH', message: `${deepLosers.length} stocks down >25%: ${deepLosers.map(h => h.symbol.replace('.NS', '').replace('.BO', '')).join(', ')}` });
  }
  const highPE = stockMetrics.filter(s => s.peRatio > 50);
  if (highPE.length > 0) {
    alerts.push({ level: 'MED', message: `Expensive valuations: ${highPE.map(s => s.symbol).join(', ')} have PE > 50` });
  }

  return {
    riskScore,
    riskLevel,
    diversificationScore,
    beta: Math.round(estimatedBeta * 100) / 100,
    reliableCount: reliableHoldings.length,
    totalCount: holdings.length,
    sectorExposure,
    concentration: {
      topHolding: topHolding?.symbol.replace('.NS', '').replace('.BO', '') || '',
      topHoldingWeight: (topHolding && totalValue > 0) ? topHolding.currentValue / totalValue : 0,
      top3Weight,
      top5Weight,
      hhi,
    },
    stockMetrics,
    alerts,
  };
}