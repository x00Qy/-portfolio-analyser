import { StockAnalysis } from './stockAnalyzer';
import { RiskMetrics } from './riskAnalyzer';
import { ProjectionResult } from './projections';
import { Holding } from './parser';
import { MarketData } from './marketData';
import chalk from 'chalk';

export function printBanner() {
  console.log(chalk.cyan('\n╔═══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║        YALGO QUANT LABS  ⟨  Indian Equity Portfolio Bot  ⟩        ║'));
  console.log(chalk.cyan('║      Powered by Angel One | NSE India | Groww | Yahoo Finance | Gemini AI | Groq AI | Mistral AI | NewsAPI      ║'));
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════╝'));
  console.log(chalk.gray(`  Analysis Date: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`));
}

export function printPortfolioSummary(holdings: Holding[], marketData: Map<string, MarketData>) {
  const totalInvested = holdings.reduce((s, h) => s + h.investedValue, 0);
  const totalCurrent = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const aiSymbols = holdings.filter(h => {
  const md = marketData.get(h.symbol);
  return md && md.aiEstimatedPrice === true;
}).map(h => h.symbol.replace('.NS', '').replace('.BO', ''));

  console.log(chalk.white('\n ◆ PORTFOLIO SUMMARY'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  console.log(`  INVESTED    ${formatCurrency(totalInvested)}`);
  console.log(`  CURRENT     ${formatCurrency(totalCurrent)}`);
  const pnlColor = totalPnl >= 0 ? chalk.green : chalk.red;
  console.log(`  TOTAL P&L   ${pnlColor(`${totalPnl >= 0 ? '+' : ''}${formatCurrency(totalPnl)} (${totalPnl >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%)`)}`);
  console.log(`  STOCKS      ${holdings.length}`);
  if (aiSymbols.length > 0) {
    console.log(`  AI PRICES   ${aiSymbols.length} (APIs unavailable, AI estimated)`);
  }

  // Holdings table
  console.log();
  console.log(chalk.gray('┌────────────┬──────┬───────────┬───────────┬─────────────┬──────────────┬─────────┐'));
  console.log(chalk.gray('│ Symbol     │  Qty │  Avg Cost │       LTP │       Value │          P&L │  Weight │'));
  console.log(chalk.gray('├────────────┼──────┼───────────┼───────────┼─────────────┼──────────────┼─────────┤'));

  const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
  for (const h of sorted) {
    const md = marketData.get(h.symbol);
    const isAI = md && md.aiEstimatedPrice === true;
    const priceUnavailable = h.priceUnavailable === true;
    const ltpStr = priceUnavailable ? 'N/A' : (isAI ? `₹${h.currentPrice.toFixed(2)}*` : `₹${h.currentPrice.toFixed(2)}`);
    const pnlStr = priceUnavailable ? 'N/A' : `${h.pnl >= 0 ? '+' : ''}${formatCurrency(h.pnl)}`;
    const pnlPctStr = priceUnavailable ? 'N/A' : `${h.pnlPercent >= 0 ? '+' : ''}${h.pnlPercent.toFixed(2)}%`;
    const weightStr = `${(h.currentValue / totalCurrent * 100).toFixed(1)}%`;
    console.log(chalk.gray(`│ ${h.symbol.replace('.NS', '').replace('.BO', '').padEnd(10)} │ ${h.quantity.toString().padStart(4)} │ ${formatCurrency(h.avgCost).padStart(9)} │ ${ltpStr.padStart(9)} │ ${formatCurrency(h.currentValue).padStart(11)} │ ${pnlStr.padStart(12)} │ ${weightStr.padStart(6)} │`));
    console.log(chalk.gray(`│ ${''.padEnd(10)} │ ${''.padStart(4)} │ ${''.padStart(9)} │ ${''.padStart(9)} │ ${''.padStart(11)} │ ${pnlPctStr.padStart(12)} │ ${''.padStart(6)} │`));
    console.log(chalk.gray('├────────────┼──────┼───────────┼───────────┼─────────────┼──────────────┼─────────┤'));
  }
  console.log(chalk.gray('└────────────┴──────┴───────────┴───────────┴─────────────┴──────────────┴─────────┘'));

  if (aiSymbols.length > 0) {
    console.log(chalk.yellow(`  ⚠ AI GUESS (±20% accuracy) for: ${aiSymbols.join(', ')} — real price unavailable`));
  }


}

export function printStockAnalysis(stockAnalyses: StockAnalysis[]) {
  console.log(chalk.white('\n ◆ DETAILED HOLDING ANALYSIS'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  console.log(chalk.gray('  Action Key: [B] BUY  [H] HOLD  [A] AVG_DOWN  [S] SELL  [T] TRIM  [P] BOOK_PROFIT'));
  console.log();

  for (const a of stockAnalyses) {
    const actionMap: Record<string, string> = { BUY: 'B', HOLD: 'H', AVG_DOWN: 'A', SELL: 'S', TRIM: 'T', BOOK_PROFIT: 'P' };
    const actionCode = actionMap[a.action] || 'H';
    const actionColor = a.action === 'SELL' ? chalk.red : a.action === 'BOOK_PROFIT' ? chalk.green : a.action === 'AVG_DOWN' ? chalk.yellow : a.action === 'TRIM' ? chalk.cyan : chalk.white;
    const pnlColor = a.pnlPercent >= 0 ? chalk.green : chalk.red;
    const riskColor = a.riskLevel === 'HIGH' ? chalk.red : a.riskLevel === 'MED' ? chalk.yellow : chalk.green;

    console.log(`  [${actionColor(actionCode)}] ${a.companyName.padEnd(25)} ${a.symbol.padEnd(8)} ${pnlColor(`${a.pnlPercent >= 0 ? '+' : ''}${a.pnlPercent.toFixed(1)}%`)}  Wt:${(a.weight * 100).toFixed(1)}%  ${riskColor(a.riskLevel)}`);

    for (const r of a.reasoning) {
      console.log(`      → ${r}`);
    }

    for (const f of a.flags) {
      const flagColor = f.includes('Loss') ? chalk.red : f.includes('Profit') ? chalk.green : f.includes('High') ? chalk.yellow : chalk.gray;
      console.log(`      ${flagColor(`⚠ ${f}`)}`);
    }

    if (a.alternatives && a.alternatives.length > 0) {
      console.log(`      🔄 Alternatives in ${a.sector}:`);
      for (const alt of a.alternatives.slice(0, 3)) {
        console.log(`         • ${alt.symbol.padEnd(8)} ${alt.name.padEnd(20)} | ${alt.riskProfile} | ${alt.dividendYield} | ${alt.why}`);
      }
    }

    if (a.taxLossHarvest) {
      console.log(`      💰 Tax Loss Harvest: Book ${formatCurrency(Math.abs(a.pnl))} loss → Save ~${formatCurrency(a.estimatedTaxBenefit)} in taxes`);
    }

    console.log();
  }
}

export function printTaxLossHarvesting(stockAnalyses: StockAnalysis[]) {
  const harvestStocks = stockAnalyses.filter(a => a.taxLossHarvest);

  console.log(chalk.white('\n ◆ TAX LOSS HARVESTING OPPORTUNITIES'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));

  if (harvestStocks.length === 0) {
    console.log(chalk.gray('  No tax loss harvesting opportunities found.'));
    console.log(chalk.gray('  All stocks are currently at or near breakeven/profit.'));
    console.log();
    return;
  }

  console.log(chalk.gray('  Book these losses before 31 March to offset capital gains tax'));
  console.log();
  console.log(chalk.gray('┌────────────┬──────────────┬──────────────┬──────────────┬──────────────┐'));
  console.log(chalk.gray('│ Stock      │  Loss Amount │  Tax Benefit │  Action      │  Rebuy After │'));
  console.log(chalk.gray('├────────────┼──────────────┼──────────────┼──────────────┼──────────────┤'));

  let totalLoss = 0;
  let totalBenefit = 0;
  for (const a of harvestStocks) {
    const loss = Math.abs(a.pnl);
    totalLoss += loss;
    totalBenefit += a.estimatedTaxBenefit;
    console.log(chalk.gray(`│ ${a.symbol.padEnd(10)} │ ${formatCurrency(-loss).padStart(12)} │ ${formatCurrency(a.estimatedTaxBenefit).padStart(12)} │  SELL + REBUY │  After 2 days │`));
  }
  console.log(chalk.gray('├────────────┼──────────────┼──────────────┼──────────────┼──────────────┤'));
  console.log(chalk.gray(`│ TOTAL      │ ${formatCurrency(-totalLoss).padStart(12)} │ ${formatCurrency(totalBenefit).padStart(12)} │              │              │`));
  console.log(chalk.gray('└────────────┴──────────────┴──────────────┴──────────────┴──────────────┘'));
  console.log(chalk.gray('  Note: Sell and rebuy after T+2 days to maintain position while booking loss'));
  console.log(chalk.gray('  This offsets Short Term Capital Gains (STCG) taxed at 15%'));
}

export function printRebalancingSimulator(stockAnalyses: StockAnalysis[]) {
  const sellStocks = stockAnalyses.filter(a => a.action === 'SELL' || a.action === 'TRIM');

  console.log(chalk.white('\n ◆ REBALANCING SIMULATOR'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  console.log(chalk.gray('  What if you sell losers and trim overweight positions?'));

  if (sellStocks.length === 0) {
    console.log(chalk.gray('  No rebalancing needed — no SELL or TRIM actions triggered.'));
    console.log(chalk.gray('  All positions are within target weight ranges.'));
    console.log();
    return;
  }
  console.log();

  let totalReleased = 0;
  let totalLoss = 0;
  console.log(chalk.gray(`  Sell/Trim these ${sellStocks.length} stocks:`));
  for (const a of sellStocks) {
    // FIX: StockAnalysis doesn't have currentValue, calculate from currentPrice * quantity
    const released = a.currentPrice * a.quantity;
    totalReleased += released;
    if (a.pnl < 0) totalLoss += Math.abs(a.pnl);
    console.log(`    ${a.action} ${a.symbol.padEnd(10)} ${a.companyName.padEnd(20)} ${a.action === 'SELL' ? 'Loss:' : 'Trim:'} ${formatCurrency(a.pnl < 0 ? -a.pnl : a.pnl)}`);
  }
  console.log(`  Total released:   ${formatCurrency(totalReleased)}`);
  console.log(`  Loss booked:      ${formatCurrency(totalLoss)} (offsets STCG tax)`);
  console.log();

  const sellSymbols = new Set(sellStocks.map(a => a.symbol));
  const allAlternatives = sellStocks
    .flatMap(a => a.alternatives || [])
    .filter(alt => !sellSymbols.has(alt.symbol))
    .filter((alt, idx, arr) => arr.findIndex(x => x.symbol === alt.symbol) === idx) // dedupe
    .slice(0, 4);

  if (allAlternatives.length > 0) {
    console.log(chalk.gray('  Redeploy SELL proceeds into alternatives (equal allocation):'));
    const alloc = totalReleased / allAlternatives.length;
    for (const alt of allAlternatives) {
      console.log(`    ${alt.symbol.padEnd(8)} ${alt.name.padEnd(20)} ${formatCurrency(alloc)} | ${alt.why}`);
    }
  }
}

export function printRecommendations(riskMetrics: RiskMetrics, projections: ProjectionResult, stockAnalyses: StockAnalysis[]) {
  console.log(chalk.white('\n ◆ ACTIONABLE RECOMMENDATIONS'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));

  const recs: string[] = [];

  // Always add a general recommendation
  recs.push('Review your portfolio regularly and rebalance if any sector exceeds 35%');

  if (riskMetrics.sectorExposure[0]?.weight > 0.35) {
    recs.push(`Diversify away from ${riskMetrics.sectorExposure[0].sector} (${(riskMetrics.sectorExposure[0].weight * 100).toFixed(1)}% concentrated)`);
  }

  if (projections.lossProbability1Y > 30) {
    recs.push(`High probability of loss in 1 year (${projections.lossProbability1Y.toFixed(1)}%). Consider defensive positions or hedging`);
  }

  const sells = stockAnalyses.filter(a => a.action === 'SELL');
  if (sells.length > 0) {
    recs.push(`Immediate sells: ${sells.map(s => s.symbol).join(', ')} — cut losses before they deepen`);
  }

  const avgs = stockAnalyses.filter(a => a.action === 'AVG_DOWN');
  if (avgs.length > 0) {
    recs.push(`Consider averaging: ${avgs.map(s => s.symbol).join(', ')} — good fundamentals at lower prices`);
  }

  const profits = stockAnalyses.filter(a => a.action === 'BOOK_PROFIT');
  if (profits.length > 0) {
    recs.push(`Book partial profits: ${profits.map(s => s.symbol).join(', ')} — lock in gains`);
  }

  for (let i = 0; i < recs.length; i++) {
    console.log(`  [${i + 1}] ${recs[i]}`);
  }
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  console.log(chalk.gray('  ⚠  Not financial advice. Consult a SEBI-registered advisor.'));
}

export function printGeminiInsights(aiInsight: any, aiProvider: string) {
  console.log(chalk.cyan('\n╔═══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan(`║           ✦ AI PORTFOLIO INSIGHTS  (${aiProvider})  ✦            ║`));
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════╝'));

  console.log(chalk.white('\n ◆ OVERALL ASSESSMENT'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  console.log(`  ${aiInsight.overallSentiment}`);

  console.log(chalk.white('\n ◆ MARKET CONTEXT'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  console.log(`  ${aiInsight.marketContext}`);

  console.log(chalk.white('\n ◆ KEY SIGNALS'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  console.log(`  ${chalk.red('⚠')} TOP CONCERN:      ${aiInsight.topConcern}`);
  console.log(`  ${chalk.green('✦')} TOP OPPORTUNITY: ${aiInsight.topOpportunity}`);
  console.log(`  ${chalk.blue('⟳')} ALLOCATION TIP:  ${aiInsight.suggestedAllocation}`);

  console.log(chalk.white('\n ◆ AI STOCK-LEVEL INSIGHTS'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  for (const stock of aiInsight.stockInsights) {
    const sentimentColor = stock.sentiment === 'BULLISH' ? chalk.green
      : stock.sentiment === 'BEARISH' ? chalk.red
      : chalk.yellow;
    console.log(`\n  [${sentimentColor(stock.sentiment)}] ${stock.symbol.padEnd(10)}`);
    console.log(`    ${stock.aiReasoning}`);
    console.log(`    ${chalk.red('⚠')} Risk:        ${stock.keyRisk}`);
    console.log(`    ${chalk.green('✦')} Opportunity: ${stock.keyOpportunity}`);
    if (stock.peerSuggestion) {
      console.log(`    ${chalk.blue('🔄')} Peer:        ${stock.peerSuggestion}`);
    }
  }
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  console.log(chalk.gray(`  ✦ AI insights by ${aiProvider}. Not financial advice.\n`));
}

export function printNewsAnalysis(newsAnalyses: any[], provider?: string) {
  if (newsAnalyses.length === 0) return;

  console.log(chalk.white('\n ◆ NEWS ANALYSIS'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  console.log(chalk.gray(`  Analyzed by: ${provider || 'AI'}\n`));

  for (const news of newsAnalyses) {
    const sentimentColor = news.sentiment === 'POSITIVE' ? chalk.green 
      : news.sentiment === 'NEGATIVE' ? chalk.red 
      : chalk.yellow;
    console.log(`  ${sentimentColor(`[${news.sentiment}]`)} ${news.symbol || ''}`);
   console.log(`    ${typeof news.aiAnalysis === 'string' ? news.aiAnalysis : JSON.stringify(news.aiAnalysis)}`);
    console.log();
  }
}

export function printCopyPasteLedger(holdings: Holding[], stockAnalyses: StockAnalysis[], riskMetrics: RiskMetrics, projections: ProjectionResult) {
  console.log(chalk.white('\n ◆ COPY-PASTE LEDGER'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  console.log(chalk.gray('  Quick summary for sharing or record-keeping'));
  console.log();

  const totalInvested = holdings.reduce((s, h) => s + h.investedValue, 0);
  const totalCurrent = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalPnl = totalCurrent - totalInvested;

  console.log(`  Invested:     ${formatCurrency(totalInvested)}`);
  console.log(`  Current:      ${formatCurrency(totalCurrent)}`);
  console.log(`  P&L:          ${totalPnl >= 0 ? '+' : ''}${formatCurrency(totalPnl)} (${totalPnl >= 0 ? '+' : ''}${((totalPnl / totalInvested) * 100).toFixed(2)}%)`);
  console.log(`  Risk:         ${riskMetrics.riskLevel}`);
  console.log(`  Stocks:       ${holdings.length}`);
  console.log(`  1Y Loss Prob: ${projections.lossProbability1Y.toFixed(1)}%`);
  console.log();
  console.log(`  Actions: ${stockAnalyses.map(a => `${a.symbol}=${a.action}`).join(', ')}`);
  console.log();
}

export function printPersonalizedSummary(summary: any) {
  console.log(chalk.cyan('\n╔═══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║         ✦ YOUR PORTFOLIO STORY — AI-POWERED SUMMARY  ✦            ║'));
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════╝'));

  console.log(chalk.white('\n ◆ THE BIG PICTURE'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  console.log(`  ${summary.bigPicture}`);

  console.log(chalk.white('\n ◆ THE GOOD'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  for (const g of summary.theGood) console.log(`  ${chalk.green('✓')} ${g}`);

  console.log(chalk.white('\n ◆ THE BAD'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  for (const b of summary.theBad) console.log(`  ${chalk.red('✗')} ${b}`);

  console.log(chalk.white('\n ◆ WHAT THIS MEANS FOR YOU'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  console.log(`  ${summary.whatThisMeans}`);

  console.log(chalk.white('\n ◆ YOUR IMMEDIATE MOVES'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  for (let i = 0; i < summary.immediateMoves.length; i++) {
    console.log(`  ${i + 1}. ${String(summary.immediateMoves[i]).replace(/₹(\d+(\.\d+)?)/g, (_, n) => formatCurrency(parseFloat(n)))}`);
  }

  console.log(chalk.white('\n ◆ BOTTOM LINE'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  console.log(`  ${chalk.bold(summary.bottomLine)}`);

  console.log(chalk.gray('\n═══════════════════════════════════════════════════════════════════════\n'));
}

export function printRiskAnalysis(riskMetrics: RiskMetrics) {
  console.log(chalk.white('\n ◆ RISK ANALYSIS'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  const riskScore = riskMetrics.riskScore;
  const riskBar = '█'.repeat(Math.min(28, Math.max(0, Math.round(riskScore / 3.5)))) + '░'.repeat(Math.max(0, 28 - Math.round(riskScore / 3.5)));
  const riskColor = riskScore < 25 ? chalk.green : riskScore < 50 ? chalk.yellow : riskScore < 75 ? chalk.red : chalk.red;
  console.log(`  Risk Score:  ${riskColor(riskBar)} ${riskScore}/100 — ${riskMetrics.riskLevel}`);
  console.log(`  Diversif:    ${chalk.green('█'.repeat(Math.min(28, Math.max(0, Math.round(riskMetrics.diversificationScore / 3.5)))) + '░'.repeat(Math.max(0, 28 - Math.round(riskMetrics.diversificationScore / 3.5))))} ${riskMetrics.diversificationScore}/100`);
  console.log(`  Beta:        ${riskMetrics.beta} (estimated — portfolio moves ${riskMetrics.beta > 1 ? 'MORE' : 'LESS'} than Nifty)`);
  console.log();

  console.log(chalk.gray('  Sector Exposure:'));
  for (const s of riskMetrics.sectorExposure) {
    const bar = '█'.repeat(Math.round(s.weight * 30)) + '░'.repeat(30 - Math.round(s.weight * 30));
    console.log(`  ${s.sector.padEnd(20)} ${bar} ${(s.weight * 100).toFixed(1)}%  (${s.count} stocks)`);
  }
  console.log();

  console.log(chalk.gray('  Concentration:'));
  console.log(`    Top holding:  ${riskMetrics.concentration.topHolding} at ${(riskMetrics.concentration.topHoldingWeight * 100).toFixed(1)}%`);
  console.log(`    Top 3 stocks: ${(riskMetrics.concentration.top3Weight * 100).toFixed(1)}% of portfolio`);
  console.log(`    Top 5 stocks: ${(riskMetrics.concentration.top5Weight * 100).toFixed(1)}% of portfolio`);
  console.log(`    HHI Index:    ${riskMetrics.concentration.hhi.toFixed(3)} (0=diversified, 1=concentrated)`);
  console.log();

  console.log(chalk.gray('  Stock-Level Risk:'));
  console.log(chalk.gray('┌──────────┬─────────┬────────┬────────┬────────┬──────────────────────────────┐'));
  console.log(chalk.gray('│ Symbol   │ Weight  │ PE(*=AI) │ vs52WH │ vs52WL │ Flags                      │'));
  console.log(chalk.gray('├──────────┼─────────┼────────┼────────┼────────┼──────────────────────────────┤'));
  for (const s of riskMetrics.stockMetrics) {
    const peStr = s.peRatio > 0 ? `${s.peRatio.toFixed(1)}${s.aiEstimatedPE ? '*' : ''}` : 'N/A';
    const flags = s.flags.join(', ');
    console.log(chalk.gray(`│ ${s.symbol.padEnd(8)} │ ${(s.weight * 100).toFixed(1).padStart(5)}% │ ${peStr.padStart(6)} │ ${s.vs52WeekHigh.toFixed(1).padStart(6)}% │ ${s.vs52WeekLow.toFixed(1).padStart(6)}% │ ${flags.padEnd(28)} │`));
  }
  console.log(chalk.gray('└──────────┴─────────┴────────┴────────┴────────┴──────────────────────────────┘'));
  console.log();

  if (riskMetrics.alerts.length > 0) {
    console.log(chalk.gray('  Risk Alerts:'));
    for (const alert of riskMetrics.alerts) {
      const alertColor = alert.level === 'HIGH' ? chalk.red : alert.level === 'MED' ? chalk.yellow : chalk.gray;
      console.log(`  ${alertColor(`⚡ ${alert.level}`)} ${alert.message}`);
    }
  }
}

export function printProjections(projections: ProjectionResult) {
  console.log(chalk.white('\n ◆ FUTURE PROJECTIONS'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  console.log(chalk.gray('  Based on log-normal projections + portfolio risk model'));
  console.log();

  console.log(chalk.gray('┌────────────┬──────────────┬──────────────┬──────────────┬──────────────┐'));
  console.log(chalk.gray('│ Period     │    Bear Case │    Base Case │    Bull Case │  Base Return │'));
  console.log(chalk.gray('├────────────┼──────────────┼──────────────┼──────────────┼──────────────┤'));
  for (const h of projections.horizons) {
    console.log(chalk.gray(`│ ${h.label.padEnd(10)} │ ${formatCurrency(h.bear).padStart(12)} │ ${formatCurrency(h.base).padStart(12)} │ ${formatCurrency(h.bull).padStart(12)} │ ${`${h.baseReturn >= 0 ? '+' : ''}${h.baseReturn.toFixed(2)}%`.padStart(12)} │`));
  }
  console.log(chalk.gray('└────────────┴──────────────┴──────────────┴──────────────┴──────────────┘'));
  console.log();

  console.log(chalk.gray('  Monte Carlo Percentiles:'));
  console.log(chalk.gray('┌────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐'));
  console.log(chalk.gray('│ Horizon    │  P10 (Worst) │          P25 │ P50 (Median) │          P75 │   P90 (Best) │'));
  console.log(chalk.gray('├────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤'));
  for (const p of projections.percentiles) {
    console.log(chalk.gray(`│ ${p.label.padEnd(10)} │ ${formatCurrency(p.p10).padStart(12)} │ ${formatCurrency(p.p25).padStart(12)} │ ${formatCurrency(p.p50).padStart(12)} │ ${formatCurrency(p.p75).padStart(12)} │ ${formatCurrency(p.p90).padStart(12)} │`));
  }
  console.log(chalk.gray('└────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘'));
  console.log(`  Probability of loss in 1Y: ${projections.lossProbability1Y.toFixed(1)}%`);
  console.log(`  Probability of doubling in 5Y: ${projections.doubleProbability5Y.toFixed(1)}%`);
  console.log();

  console.log(chalk.gray('  Scenario Analysis (1 Year):'));
  for (const s of projections.scenarios) {
    const color = s.returnPct < -20 ? chalk.red : s.returnPct < 0 ? chalk.yellow : s.returnPct > 20 ? chalk.green : chalk.white;
    console.log(`  ${s.name} ${color(`${s.returnPct >= 0 ? '+' : ''}${s.returnPct.toFixed(1)}%`)}  →   ${formatCurrency(s.value)}`);
    console.log(`    ${chalk.gray(s.description)}`);
  }
}

function formatCurrency(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}