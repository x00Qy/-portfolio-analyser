import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import { parseHoldingsFile, Holding } from './parser';
import { fetchMarketData, MarketData, isPriceReliable } from './marketData';
import { analyzeRisk } from './riskAnalyzer';
import { runProjections } from './projections';
import { analyzeStocks, StockAnalysis } from './stockAnalyzer';
import { runGoalPlanner, printGoalPlanner } from './goalPlanner';
import { analyzeWithGemini, analyzeNews, estimatePEWithAI, GEMINI_MODEL } from './geminiAnalyzer';
import { analyzeWithGroq, analyzeNewsWithGroq, estimatePEWithGroq, GROQ_MODEL } from './groqAnalyzer';
import { analyzeWithMistral, analyzeNewsWithMistral, estimatePEWithMistral, MISTRAL_SMALL } from './mistralAnalyzer';
import { fetchNewsForStocks } from './newsFetcher';
import {
  printBanner,
  printPortfolioSummary,
  printStockAnalysis,
  printRiskAnalysis,
  printProjections,
  printTaxLossHarvesting,
  printRebalancingSimulator,
  printRecommendations,
  printGeminiInsights,
  printCopyPasteLedger,
  printNewsAnalysis,
} from './reporter';

const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const geminiApiKey  = process.env.GEMINI_API_KEY;
const groqApiKey    = process.env.GROQ_API_KEY;
const mistralApiKey = process.env.MISTRAL_API_KEY;
const newsApiKey    = process.env.NEWS_API_KEY;
const angelApiKey     = process.env.ANGEL_API_KEY;
const angelClientId   = process.env.ANGEL_CLIENT_ID;
const angelMpin       = process.env.ANGEL_MPIN;
const angelTotpSecret = process.env.ANGEL_TOTP_SECRET;

// ─── Helpers: try providers in order, return first success ───────────────────

async function runPortfolioInsight(holdings: Holding[], stockAnalyses: StockAnalysis[], riskMetrics: any) {
  // Primary: Gemini → Fallback 1: Groq → Fallback 2: Mistral
  if (geminiApiKey) {
    console.log(chalk.yellow(`  [AI] Running Gemini (${GEMINI_MODEL}) analysis...`));
    const result = await analyzeWithGemini(holdings, stockAnalyses, riskMetrics, geminiApiKey);
    if (result) { console.log(chalk.green('  ✓ Gemini analysis complete')); return { insight: result, provider: `Gemini – ${GEMINI_MODEL}` }; }
    console.log(chalk.yellow('  ⚠ Gemini failed — trying Groq...'));
  }
  if (groqApiKey) {
    console.log(chalk.yellow(`  [AI] Running Groq (${GROQ_MODEL}) analysis...`));
    const result = await analyzeWithGroq(holdings, stockAnalyses, riskMetrics, groqApiKey);
    if (result) { console.log(chalk.green('  ✓ Groq analysis complete')); return { insight: result, provider: `Groq – ${GROQ_MODEL}` }; }
    console.log(chalk.yellow('  ⚠ Groq failed — trying Mistral...'));
  }
  if (mistralApiKey) {
    console.log(chalk.yellow(`  [AI] Running Mistral (${MISTRAL_SMALL}) analysis...`));
    const result = await analyzeWithMistral(holdings, stockAnalyses, riskMetrics, mistralApiKey);
    if (result) { console.log(chalk.green('  ✓ Mistral analysis complete')); return { insight: result, provider: `Mistral – ${MISTRAL_SMALL}` }; }
    console.log(chalk.yellow('  ⚠ Mistral also failed'));
  }
  return null;
}

async function runNewsAnalysis(symbol: string, headlines: any[]) {
  if (geminiApiKey) {
    const result = await analyzeNews(symbol, headlines, geminiApiKey);
    // Validate result has proper string aiAnalysis
    if (result && typeof result.aiAnalysis === 'string' && result.aiAnalysis.length > 10) return result;
  }
  if (groqApiKey) {
    const result = await analyzeNewsWithGroq(symbol, headlines, groqApiKey);
    if (result && typeof result.aiAnalysis === 'string' && result.aiAnalysis.length > 10) return result;
  }
  if (mistralApiKey) {
    const result = await analyzeNewsWithMistral(symbol, headlines, mistralApiKey);
    if (result && typeof result.aiAnalysis === 'string' && result.aiAnalysis.length > 10) return result;
  }
  return null;
}

async function runPEEstimation(symbol: string, companyName: string, sector: string, currentPrice: number): Promise<number | null> {
  // Primary: Groq → Fallback 1: Mistral → Fallback 2: Gemini
  if (groqApiKey) {
    const result = await estimatePEWithGroq(symbol, companyName, sector, currentPrice, groqApiKey);
    if (result) return result;
  }
  if (mistralApiKey) {
    const result = await estimatePEWithMistral(symbol, companyName, sector, currentPrice, mistralApiKey);
    if (result) return result;
  }
  if (geminiApiKey) {
    const result = await estimatePEWithAI(symbol, companyName, sector, currentPrice, geminiApiKey);
    if (result) return result;
  }
  return null;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  printBanner();

  const inputFile = process.argv[2];
  const goalTarget = parseInt(process.argv[3] || '10000000');
  const goalYears  = parseInt(process.argv[4] || '10');

  let holdings: Holding[] = [];
  let source = 'interactive';
  let totalInvested = 0;
  let errors: string[] = [];

  if (!inputFile) {
    console.log(chalk.yellow('  📋 Interactive Mode — Paste your holdings CSV'));
    console.log(chalk.gray('  Supports: Groww CSV, Kotak CSV, or SYMBOL,QTY,AVG_COST format'));
    console.log(chalk.gray('  Press ENTER twice when done'));
    console.log();

    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin });
    const lines: string[] = [];
    let emptyCount = 0;

    await new Promise<void>((resolve) => {
      rl.on('line', (line: string) => {
        if (line.trim() === '') {
          emptyCount++;
          if (emptyCount >= 2) { rl.close(); resolve(); }
        } else {
          emptyCount = 0;
          lines.push(line);
        }
      });
      rl.on('close', () => resolve());
    });

    if (lines.length === 0) { console.log(chalk.red('  ✗ No data provided!')); process.exit(1); }

    const tmpFile = path.join(os.tmpdir(), `yalgo_paste_${Date.now()}.csv`);
    fs.writeFileSync(tmpFile, lines.join('\n'));

    try {
      const parseResult = parseHoldingsFile(tmpFile);
      holdings = parseResult.holdings;
      source = parseResult.source;
      totalInvested = parseResult.totalInvested;
      errors = parseResult.errors;
    } finally {
      fs.unlinkSync(tmpFile);
    }

    if (holdings.length === 0) {
      for (const line of lines) {
        const parts = line.split(',').map((p: string) => p.trim());
        if (parts.length >= 3) {
          const symbol = parts[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
          const qty = parseFloat(parts[1]) || 0;
          const avgCost = parseFloat(parts[2]) || 0;
          if (symbol && qty > 0 && avgCost > 0) {
            holdings.push({
              symbol: `${symbol}.NS`,
              companyName: symbol,
              quantity: qty,
              avgCost,
              currentPrice: avgCost,
              sector: 'Others',
              investedValue: qty * avgCost,
              currentValue: qty * avgCost,
              pnl: 0,
              pnlPercent: 0,
              source: 'manual',
            });
          }
        }
      }
      source = 'manual';
    }

    if (holdings.length === 0) {
      console.log(chalk.red('  ✗ No valid holdings found!'));
      console.log(chalk.gray('  Try format: SYMBOL,QTY,AVG_COST e.g. RELIANCE,100,2450'));
      process.exit(1);
    }

    if (errors.length > 0) console.log(chalk.yellow(`  ⚠ Parse warnings: ${errors.join(', ')}`));
    totalInvested = holdings.reduce((s, h) => s + h.investedValue, 0);
    console.log(chalk.green(`  ✓ Found ${holdings.length} holdings (format: ${source}) | Invested: ₹${(totalInvested / 100000).toFixed(2)}L`));
    console.log();

  } else {
    const filePath = path.resolve(inputFile);
    console.log(chalk.yellow('  [1/5] Parsing holdings file...'));
    const parseResult = parseHoldingsFile(filePath);
    holdings = parseResult.holdings;
    source = parseResult.source;
    totalInvested = parseResult.totalInvested;
    errors = parseResult.errors;

    if (errors.length > 0) console.log(chalk.yellow(`  ⚠ Parse warnings: ${errors.join(', ')}`));
    if (holdings.length === 0) { console.log(chalk.red('  ✗ No valid holdings found. Check your file format.')); process.exit(1); }
    console.log(chalk.green(`  ✓ Found ${holdings.length} holdings (format: ${source}) | Invested: ₹${(totalInvested / 100000).toFixed(2)}L`));
  }

  // [2/5] Market data — Mistral added as AI price fallback in marketData.ts
  console.log(chalk.yellow('  [2/5] Fetching live market data...'));
  console.log(chalk.gray('        (Trying: Angel One → NSE India → Groww → Yahoo → 24h Cache → AI Estimate)'));

  const marketResult = await fetchMarketData(
  holdings,
  groqApiKey,
  mistralApiKey,
  angelApiKey,
  angelClientId,
  angelMpin,
  angelTotpSecret
);
  const marketData: Map<string, MarketData> = marketResult.data;
  const failed: string[] = marketResult.failed;
  const notFoundInMaster = new Set(marketResult.notFoundInMaster);

  if (failed.length > 0 && marketData.size === 0) {
    console.log(chalk.yellow('  ⚠ Live API unavailable — will use statement prices where available'));
  } else if (failed.length > 0) {
    console.log(chalk.yellow(`  ⚠ Could not fetch live data for: ${failed.join(', ')}`));
  }

  let fetchedCount = 0;
  let staleCount = 0;
  const noDataSymbols: string[] = [];
  const staleSymbols: string[] = [];
  const notFoundSymbols: string[] = [];

  for (const h of holdings) {
    const d = marketData.get(h.symbol);
    const bareSymbol = h.symbol.replace(/\.(NS|BO)$/i, '').toUpperCase();
    if (d && d.currentPrice > 0) {
      h.currentPrice = d.currentPrice;
      h.currentValue = h.quantity * h.currentPrice;
      h.pnl = h.currentValue - h.investedValue;
      h.pnlPercent = (h.pnl / h.investedValue) * 100;
      // A cache hit is a real price, just not from this run — only show
      // "no data" (avgCost fallback, priceUnavailable) when there truly is
      // nothing, cached or otherwise.
      if (d.stale) {
        staleCount++;
        staleSymbols.push(`${h.symbol.replace('.NS', '').replace('.BO', '')} (${d.staleAgeHours!.toFixed(1)}h old)`);
      } else {
        fetchedCount++;
      }
    } else {
      h.currentPrice = h.avgCost;
      h.currentValue = h.investedValue;
      h.pnl = 0;
      h.pnlPercent = 0;
      h.priceUnavailable = true;
      const displaySym = h.symbol.replace('.NS', '').replace('.BO', '');
      if (notFoundInMaster.has(bareSymbol)) {
        h.symbolNotFoundInMaster = true;
        notFoundSymbols.push(displaySym);
      } else {
        noDataSymbols.push(displaySym);
      }
    }
  }

  if (fetchedCount > 0) console.log(chalk.green(`  ✓ Live prices: ${fetchedCount}/${holdings.length} stocks`));
  if (staleCount > 0) console.log(chalk.yellow(`  ⚠ Cached (stale) prices: ${staleSymbols.join(', ')} — all live sources failed`));
  if (noDataSymbols.length > 0) console.log(chalk.red(`  ✗ No price data for: ${noDataSymbols.join(', ')}`));
  if (notFoundSymbols.length > 0) {
    console.log(chalk.red(`  ✗ Symbol not found in NSE instrument master: ${notFoundSymbols.join(', ')}`));
    console.log(chalk.red(`    It may have been renamed, delisted, or affected by a corporate action — verify the current ticker.`));
  }

    // PE Estimation — batch all missing PEs into one Groq call
  let peFixed = 0;
  const peMissing = holdings.filter(h => {
    const md = marketData.get(h.symbol);
    return md && (!md.peRatio || md.peRatio <= 0);
  }).map(h => ({
    symbol: h.symbol.replace('.NS', '').replace('.BO', ''),
    companyName: h.companyName,
    sector: h.sector,
    currentPrice: h.currentPrice,
  }));

  if (peMissing.length > 0 && groqApiKey) {
    const { estimatePEBatchWithGroq } = require('./groqAnalyzer');
    const peBatch = await estimatePEBatchWithGroq(peMissing, groqApiKey);
    for (const h of holdings) {
      const sym = h.symbol.replace('.NS', '').replace('.BO', '');
      const md = marketData.get(h.symbol);
      if (peBatch[sym] && md) {
        md.peRatio = peBatch[sym];
        md.aiEstimatedPE = true;
        peFixed++;
      }
    }
  }
  if (peFixed > 0) console.log(chalk.green(`  ✓ AI estimated PE ratios for ${peFixed} stocks`));

  console.log(chalk.yellow('  [3/5] Analyzing each holding...'));
  const stockAnalyses = analyzeStocks(holdings, marketData);
  console.log(chalk.green(`  ✓ Generated ${stockAnalyses.length} stock reports with recommendations`));

  console.log(chalk.yellow('  [4/5] Running portfolio risk analysis...'));
  const riskMetrics = analyzeRisk(holdings, marketData);
  console.log(chalk.green(`  ✓ Risk analysis complete — Risk Level: ${riskMetrics.riskLevel}`));

  console.log(chalk.yellow('  [5/5] Running Monte Carlo projections...'));
  const projections = runProjections(holdings, marketData, riskMetrics);
  console.log(chalk.green('  ✓ Projections complete'));
  console.log();

  // Portfolio Insight — Gemini → Groq → Mistral
  const insightResult = await runPortfolioInsight(holdings, stockAnalyses, riskMetrics);
  console.log();

  // News Analysis — Gemini → Groq → Mistral
  let newsAnalyses: any[] = [];
  if (newsApiKey) {
    const hasAI = geminiApiKey || groqApiKey || mistralApiKey;
    if (hasAI) {
      console.log(chalk.yellow('  [AI] Fetching recent news & analyzing...'));
      const symbols = holdings.map((h: Holding) => h.symbol.replace('.NS', '').replace('.BO', ''));
      const newsMap = await fetchNewsForStocks(symbols, newsApiKey);
      let newsCount = 0;
      for (const [symbol, headlines] of newsMap.entries()) {
        if (headlines.length > 0) {
          const analysis = await runNewsAnalysis(symbol, headlines);
          if (analysis) { newsAnalyses.push(analysis); newsCount += headlines.length; }
        }
      }
      if (newsCount > 0) {
        console.log(chalk.green(`  ✓ Analyzed ${newsCount} news headlines across ${newsAnalyses.length} stocks`));
      } else {
        console.log(chalk.yellow('  ⚠ No news found — check NEWS_API_KEY or try again later'));
      }
      console.log();
    }
  } else {
    console.log(chalk.gray('  ℹ Skipping news — set NEWS_API_KEY in .env to enable'));
    console.log();
  }

  // Print report
  printPortfolioSummary(holdings, marketData);
  printStockAnalysis(stockAnalyses);
  printTaxLossHarvesting(stockAnalyses);
  printRebalancingSimulator(stockAnalyses, holdings);
  printRiskAnalysis(riskMetrics);
  printProjections(projections);
  printRecommendations(riskMetrics, projections, stockAnalyses);
  if (insightResult) printGeminiInsights(insightResult.insight, insightResult.provider);
  if (newsAnalyses.length > 0) printNewsAnalysis(newsAnalyses, 'AI');
  printCopyPasteLedger(holdings, stockAnalyses, riskMetrics, projections, marketData);

  // Goal Planner — currentValue deliberately INCLUDES holdings with an
  // unreliable price (at their best-available value), unlike every other
  // aggregate above. Excluding them would shrink the wealth-projection
  // starting capital and push years-to-goal/required-SIP wrong in a
  // different, arguably worse direction than the price uncertainty itself.
  // The coverage count is still passed through so the printed roadmap can
  // say so rather than presenting the starting value as fully verified.
  const currentValue = holdings.reduce((s: number, h: Holding) => s + h.currentValue, 0);
  const reliableForGoal = holdings.filter(h => isPriceReliable(h, marketData)).length;
  const totalTaxBenefit = stockAnalyses.reduce((s: number, a: StockAnalysis) => s + a.estimatedTaxBenefit, 0);
  const goalResult = runGoalPlanner(currentValue, goalTarget, goalYears, 0, totalTaxBenefit, reliableForGoal, holdings.length);

  printGoalPlanner(goalResult);

  console.log(chalk.green('╔═══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.green('║              ✓ ANALYSIS COMPLETE — YALGO QUANT LABS              ║'));
  console.log(chalk.green('╚═══════════════════════════════════════════════════════════════════╝'));
  console.log();

  process.exit(0);
}

main().catch((err: any) => {
  console.error(chalk.red('  Fatal error:'), err.message);
  process.exit(1);
});