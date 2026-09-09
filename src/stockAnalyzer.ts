import { Holding } from './parser';
import { MarketData } from './marketData';
import { getSectorAlternativesSync, SectorAlternative } from './sectorData';

// Unvalidated magnitude heuristic, NOT a calibrated bound. It exists only to
// catch one otherwise-undetectable case: a manually-entered or generic-CSV
// average cost that predates a stock split or bonus issue nobody adjusted for.
// Nothing in this pipeline captures a purchase date, so there is no way to
// check that directly — this is a tripwire, not a correction. A genuine large
// loss or gain on a real position will also trip it; that's a false positive
// this heuristic cannot distinguish from the case it's actually looking for.
const UNVERIFIED_COST_BASIS_PNL_THRESHOLD_PCT = 70;

// Shared with riskAnalyzer.ts so a holding can't read HOLD/"Unverified Cost
// Basis" in the recommendation section and "Deep Loss" in the risk table two
// sections later — same reasoning as isPriceReliable in marketData.ts.
export function hasUnverifiedCostBasis(h: Holding): boolean {
  const unverifiedCostBasisSource = h.source === 'custom' || h.source === 'manual';
  return unverifiedCostBasisSource && Math.abs(h.pnlPercent) > UNVERIFIED_COST_BASIS_PNL_THRESHOLD_PCT;
}

export interface StockAnalysis {
  symbol: string;
  companyName: string;
  sector: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  weight: number;
  vs52WeekHigh: number;
  vs52WeekLow: number;
  momentum: string;
  action: 'BUY' | 'HOLD' | 'SELL' | 'AVG_DOWN' | 'BOOK_PROFIT' | 'TRIM';
  confidence: number;
  reasoning: string[];
  flags: string[];
  riskLevel: 'LOW' | 'MED' | 'HIGH' | 'VERY_HIGH';
  alternatives: SectorAlternative[];
  taxLossHarvest: boolean;
  estimatedTaxBenefit: number;
  trimQuantity?: number;
}

export function analyzeStocks(
  holdings: Holding[],
  marketData: Map<string, MarketData>
): StockAnalysis[] {
  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);

  return holdings.map(h => {
    const md = marketData.get(h.symbol);
    const weight = h.currentValue / totalValue;

    const priceIsReliable = md &&
      md.aiEstimatedPrice !== true &&
      !h.priceUnavailable;

    const vs52WH = (md?.yearHigh && md.yearHigh > 0 && !isNaN(md.yearHigh))
      ? ((h.currentPrice - md.yearHigh) / md.yearHigh) * 100
      : NaN;
    const vs52WL = (md?.yearLow && md.yearLow > 0 && !isNaN(md.yearLow))
      ? ((h.currentPrice - md.yearLow) / md.yearLow) * 100
      : NaN;

    let momentum = 'NEUTRAL';
    if (!isNaN(vs52WH) && vs52WH > -5) momentum = 'NEAR_HIGH';
    else if (!isNaN(vs52WL) && vs52WL < 20 && vs52WL > 0) momentum = 'NEAR_LOW';
    else if (!isNaN(vs52WH) && vs52WH > -20) momentum = 'MID_RANGE';
    else if (!isNaN(vs52WH)) momentum = 'DEEP_VALUE';

    const reasoning: string[] = [];
    const flags: string[] = [];
    let riskLevel: StockAnalysis['riskLevel'] = 'MED';
    let trimQuantity: number | undefined;

    let action: StockAnalysis['action'];
    let confidence: number;

    if (!priceIsReliable) {
      action = 'HOLD';
      confidence = 0;
      reasoning.push('STALE/UNAVAILABLE PRICE — cannot recommend action without live data');
      riskLevel = 'MED';
    } else if (h.pnlPercent <= -30) {
      action = 'SELL';
      confidence = 80;
      reasoning.push(`Deep loss at ${h.pnlPercent.toFixed(1)}% — cut before it gets worse`);
      reasoning.push('Tax loss harvesting opportunity — book loss to offset capital gains');
      flags.push('Deep Loss');
      riskLevel = 'HIGH';
    } else if (h.pnlPercent <= -15) {
      action = 'AVG_DOWN';
      confidence = 60;
      reasoning.push(`Moderate loss at ${h.pnlPercent.toFixed(1)}% — consider averaging if fundamentals intact`);
      flags.push('Significant Loss');
      riskLevel = 'MED';
    } else if (h.pnlPercent < 0) {
      action = 'HOLD';
      confidence = 55;
      reasoning.push(`Small loss of ${h.pnlPercent.toFixed(1)}% — monitor for reversal or add on further dip`);
      riskLevel = 'MED';
    } else if (h.pnlPercent >= 25) {
      action = 'BOOK_PROFIT';
      confidence = 70;
      reasoning.push(`Strong gain at +${h.pnlPercent.toFixed(1)}% — book partial profits, keep rest running`);
      flags.push('High Profit');
      riskLevel = 'LOW';
    } else if (h.pnlPercent >= 5) {
      action = 'HOLD';
      confidence = 60;
      reasoning.push(`Gain of +${h.pnlPercent.toFixed(1)}% — let winners run with a trailing stop loss`);
      riskLevel = 'LOW';
    } else {
      action = 'HOLD';
      confidence = 50;
      reasoning.push('Near breakeven — wait for clear direction before adding or exiting');
      riskLevel = 'MED';
    }

    if (weight > 0.15) {
      flags.push('Overweight');
      const targetWeight = 0.10;

      if (weight > targetWeight) {
        trimQuantity = Math.floor(h.quantity * (1 - targetWeight / weight));
      }

      // Guard: if calculated trim is 0 or negative, don't show TRIM
      if (trimQuantity !== undefined && trimQuantity <= 0) {
        trimQuantity = undefined;
      }

      if (action !== 'SELL') {
        if (h.pnlPercent >= 0 && trimQuantity && trimQuantity > 0) {
          action = 'TRIM';
          confidence = 65;
          reasoning.length = 0;
          reasoning.push(`Position too large at ${(weight * 100).toFixed(1)}% — sell ${trimQuantity} shares to reach ~10%`);
        } else if (h.pnlPercent > -15 && trimQuantity && trimQuantity > 0) {
          action = 'TRIM';
          confidence = 60;
          reasoning.length = 0;
          reasoning.push(`Overweight at ${(weight * 100).toFixed(1)}% with loss — sell ${trimQuantity} shares to reduce risk`);
        } else {
          action = 'SELL';
          confidence = 75;
          trimQuantity = undefined;
          reasoning.length = 0;
          reasoning.push(`Large position (${(weight * 100).toFixed(1)}%) with significant loss — exit fully`);
        }
      }
    }

    if (!isNaN(vs52WH) && momentum === 'NEAR_HIGH' && h.pnlPercent > 5) {
      flags.push('Near 52W High');
      reasoning.push('Near 52-week high — limited short-term upside, consider partial exit');
    }
    if (!isNaN(vs52WL) && momentum === 'NEAR_LOW' && h.pnlPercent < -20) {
      flags.push('Near 52W Low');
      reasoning.push('Near 52-week low — potential value trap, verify fundamentals before averaging');
    }

    const sectorCount = holdings.filter(x => x.sector === h.sector).length;
    if (sectorCount === 1 && weight > 0.08) {
      flags.push('Sole Sector Exposure');
      reasoning.push(`Only stock in ${h.sector} sector — consider adding a peer for sector diversification`);
    }

    const taxLossHarvest = !!priceIsReliable && h.pnlPercent < -10 && h.pnl < -5000;
    const estimatedTaxBenefit = taxLossHarvest ? Math.abs(h.pnl) * 0.15 : 0;

    const showAlts = action === 'SELL' || action === 'AVG_DOWN' || action === 'TRIM';
    const cleanSym = h.symbol.replace('.NS', '').replace('.BO', '');
    const alts = showAlts
      ? getSectorAlternativesSync(h.sector, h.symbol).filter(a => a.symbol !== cleanSym)
      : [];

    return {
      symbol: h.symbol.replace('.NS', '').replace('.BO', ''),
      companyName: h.companyName,
      sector: h.sector,
      quantity: h.quantity,
      avgCost: h.avgCost,
      currentPrice: h.currentPrice,
      pnl: h.pnl,
      pnlPercent: h.pnlPercent,
      weight,
      vs52WeekHigh: vs52WH,
      vs52WeekLow: vs52WL,
      momentum,
      action,
      confidence,
      reasoning,
      flags,
      riskLevel,
      alternatives: alts,
      taxLossHarvest,
      estimatedTaxBenefit,
      trimQuantity,
    };
  }).sort((a, b) => b.pnlPercent - a.pnlPercent);
}