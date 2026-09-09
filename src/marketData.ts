import chalk from 'chalk';
import axios from 'axios';
import { Holding } from './parser';
import { validateAndCache, nseSymbolVariants, sleep, getCachedPrice, isPlausiblyUncorrupted } from './priceValidator';
import { fetchBatchFromAngelOne } from './angelOneProvider';

export interface MarketData {
  currentPrice: number;
  peRatio: number | null;
  pbRatio: number | null;
  sector: string;
  industry: string;
  dayHigh: number;
  dayLow: number;
  yearHigh: number;
  yearLow: number;
  volume: number;
  marketCap: number | null;
  change: number;
  changePercent: number;
  beta: number | null;
  debtToEquity: number | null;
  roe: number | null;
  eps: number | null;
  fiftyDayAvg: number | null;
  twoHundredDayAvg: number | null;
  shortName: string;
  analystRating: string | null;
  targetPrice: number | null;
  earningsGrowth: number | null;
  revenueGrowth: number | null;
  bookValue: number | null;
  aiEstimatedPE?: boolean;
  aiEstimatedPrice?: boolean;
  aiConfidence?: 'HIGH' | 'MED' | 'LOW';
  source?: string;
  trusted?: boolean;
  warning?: string;
  // Set when every live source failed and this price came from the 24h
  // disk cache instead — a real, previously-fetched price, just not from
  // this run. Deliberately NOT folded into isPriceReliable below: see that
  // function's comment for why aggregates must stay off it regardless.
  stale?: boolean;
  staleAgeHours?: number;
}

export interface MarketDataResult {
  data: Map<string, MarketData>;
  failed: string[];
  aiEstimated: number;
  // Symbols Angel One's instrument master confirmed absent — see
  // scripMaster.ts. A confident "renamed, delisted, or hit by a corporate
  // action" signal, distinct from a symbol that's simply in `failed`
  // because every source happened to fail this run.
  notFoundInMaster: string[];
}

// Single source of truth for "can this holding's currentValue/pnl be trusted
// in an aggregate". Previously computed slightly differently (or not at all)
// in riskAnalyzer.ts, stockAnalyzer.ts, and projections.ts — now shared so
// there's one place to change the definition, not three to keep in sync.
//
// Deliberately excludes `stale` (a 24h-cache fallback) as well as
// `aiEstimatedPrice`: a cached price is real, unlike an AI guess, but it is
// not a price from THIS run, and every weight/HHI/concentration/beta number
// downstream is more useful as a stable answer than one that depends on
// what time of day the report happens to run and which cache entries have
// aged in or out. A cache hit still upgrades the row itself — see
// fetchStock() below — it just doesn't upgrade the aggregates.
export function isPriceReliable(h: Holding, marketData: Map<string, MarketData>): boolean {
  const md = marketData.get(h.symbol);
  return !!md && md.aiEstimatedPrice !== true && !md.stale && !h.priceUnavailable;
}

const NEVER_AI_ESTIMATE = [
  'RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','KOTAKBANK',
  'SBIN','AXISBANK','ITC','HINDUNILVR','LT','TITAN','ASIANPAINT',
  'BHARTIARTL','MARUTI'
];

const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const MISTRAL_FAST_MODEL = process.env.MISTRAL_FAST_MODEL || 'open-mistral-7b';

function cleanSymbol(symbol: string): string {
  return symbol.replace(/\.(NS|BO)$/i, '').toUpperCase();
}

async function fetchFromNse(nse: any, symbol: string): Promise<MarketData | null> {
  try {
    const sym = cleanSymbol(symbol);
    const details = await nse.getEquityDetails(sym);
    if (!details?.priceInfo) return null;

    const p = details.priceInfo;
    const meta = details.metadata || {};
    const trade = details.marketDeptOrderBook?.tradeInfo || {};

    const price = p.lastPrice || p.close || 0;
    if (!isPlausiblyUncorrupted(price)) return null;

    const yearHigh = parseFloat(meta.high52) || p.weekHighLow?.max || 0;
    const yearLow = parseFloat(meta.low52) || p.weekHighLow?.min || 0;

    let eps: number | null = null;
    if (meta.eps && !isNaN(parseFloat(meta.eps))) eps = parseFloat(meta.eps);

    return {
      currentPrice: price,
      peRatio: meta.pdSymbolPe ? parseFloat(meta.pdSymbolPe) : null,
      pbRatio: null,
      sector: meta.industry || '',
      industry: meta.industry || '',
      dayHigh: p.intraDayHighLow?.max || p.open || 0,
      dayLow: p.intraDayHighLow?.min || 0,
      yearHigh,
      yearLow,
      volume: trade.totalTradedVolume || 0,
      marketCap: meta.totalMarketCap ? parseFloat(String(meta.totalMarketCap).replace(/,/g, '')) : null,
      change: p.change || 0,
      changePercent: p.pChange || 0,
      beta: null, debtToEquity: null, roe: null, eps,
      fiftyDayAvg: null, twoHundredDayAvg: null,
      shortName: meta.companyName || sym,
      analystRating: null, targetPrice: null,
      earningsGrowth: null, revenueGrowth: null, bookValue: null,
      source: 'NSE',
    };
  } catch {
    return null;
  }
}

async function fetchFromGroww(symbol: string): Promise<MarketData | null> {
  try {
    const sym = cleanSymbol(symbol);
    const url = `https://groww.in/v1/api/stocks_data/v1/accord_points/exchange/NSE/segment/CASH/latest_prices_ohlc/search/${sym}`;
    const res = await axios.get(url, {
      timeout: 4000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    const d = res.data;
    if (!d?.ltp || !isPlausiblyUncorrupted(d.ltp)) return null;

    return {
      currentPrice: d.ltp,
      peRatio: null, pbRatio: null,
      sector: '', industry: '',
      dayHigh: d.high || 0,
      dayLow: d.low || 0,
      yearHigh: d['52weekHigh'] || 0,
      yearLow: d['52weekLow'] || 0,
      volume: d.volume || 0,
      marketCap: null,
      change: d.dayChange || 0,
      changePercent: d.dayChangePerc || 0,
      beta: null, debtToEquity: null, roe: null, eps: null,
      fiftyDayAvg: null, twoHundredDayAvg: null,
      shortName: sym,
      analystRating: null, targetPrice: null,
      earningsGrowth: null, revenueGrowth: null, bookValue: null,
      source: 'Groww',
    };
  } catch {
    return null;
  }
}

async function fetchFromYahoo(symbol: string): Promise<MarketData | null> {
  try {
    const sym = cleanSymbol(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}.NS?range=1d&interval=1d`;
    const res = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
      },
    });
    const meta = res.data?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice || !isPlausiblyUncorrupted(meta.regularMarketPrice)) return null;

    return {
      currentPrice: meta.regularMarketPrice,
      peRatio: null, pbRatio: null,
      sector: '', industry: '',
      dayHigh: meta.regularMarketDayHigh || 0,
      dayLow: meta.regularMarketDayLow || 0,
      yearHigh: meta.fiftyTwoWeekHigh || 0,
      yearLow: meta.fiftyTwoWeekLow || 0,
      volume: meta.regularMarketVolume || 0,
      marketCap: meta.marketCap || null,
      change: meta.regularMarketPrice - meta.previousClose || 0,
      changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100 || 0,
      beta: null, debtToEquity: null, roe: null, eps: null,
      fiftyDayAvg: meta.fiftyDayAverage || null,
      twoHundredDayAvg: meta.twoHundredDayAverage || null,
      shortName: meta.shortName || sym,
      analystRating: null, targetPrice: null,
      earningsGrowth: null, revenueGrowth: null, bookValue: null,
      source: 'Yahoo',
    };
  } catch {
    return null;
  }
}

async function estimatePriceWithAI(
  symbol: string,
  companyName: string,
  sector: string,
  avgCost: number,
  apiKey: string
): Promise<MarketData | null> {
  if (!apiKey || apiKey.length < 10) return null;

  try {
    const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const prompt = `You are an Indian stock market data provider. Estimate the current market price and PE ratio for ${companyName} (${symbol}) in the ${sector} sector as of ${currentMonthYear}.

The investor average cost is Rs${avgCost} - use ONLY as context, NOT as the current price.

Return ONLY this JSON:
{"currentPrice": <number>, "peRatio": <number or null>, "yearHigh": <number>, "yearLow": <number>, "confidence": "HIGH|MED|LOW"}

Be realistic for Indian large-cap stocks.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'You are an Indian stock market data provider. Respond ONLY with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 256,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) return null;

    const data: any = await res.json();
    const text = data?.choices?.[0]?.message?.content || '';
    let parsed: any;
    try { parsed = JSON.parse(text); } catch { return null; }

    if (typeof parsed.currentPrice !== 'number' || parsed.currentPrice <= 0) return null;

    // Must be within 50% of what the investor actually paid — the only
    // plausibility signal available with no fresh cached real price to
    // compare against. This used to be OR'd with a per-stock sanity band
    // that was vacuous for every symbol actually reaching this code path
    // (see priceValidator.ts); it's now the sole, unconditional gate, plus
    // the universal corruption guard applied everywhere else too.
    const diffOk = Math.abs(parsed.currentPrice - avgCost) / avgCost <= 0.50;
    if (!diffOk || !isPlausiblyUncorrupted(parsed.currentPrice)) return null;

    const yearHigh = parsed.yearHigh > 0 ? parsed.yearHigh : Math.round(parsed.currentPrice * 1.3);
    const yearLow  = parsed.yearLow  > 0 ? parsed.yearLow  : Math.round(parsed.currentPrice * 0.75);

    return {
      currentPrice: Math.round(parsed.currentPrice * 100) / 100,
      peRatio: parsed.peRatio && parsed.peRatio > 0 ? Math.round(parsed.peRatio * 10) / 10 : null,
      pbRatio: null, sector: '', industry: '',
      dayHigh: yearHigh, dayLow: yearLow, yearHigh, yearLow,
      volume: 0, marketCap: null, change: 0, changePercent: 0,
      beta: null, debtToEquity: null, roe: null, eps: null,
      fiftyDayAvg: null, twoHundredDayAvg: null,
      shortName: symbol,
      analystRating: null, targetPrice: null,
      earningsGrowth: null, revenueGrowth: null, bookValue: null,
      aiEstimatedPrice: true,
      aiEstimatedPE: true,
      aiConfidence: parsed.confidence as 'HIGH' | 'MED' | 'LOW',
      source: 'AI/Groq',
    };
  } catch {
    return null;
  }
}

async function estimatePriceWithMistral(
  symbol: string,
  companyName: string,
  sector: string,
  avgCost: number,
  apiKey: string
): Promise<MarketData | null> {
  if (!apiKey || apiKey.length < 10) return null;

  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_FAST_MODEL,
        messages: [
          { role: 'system', content: 'Indian stock market data provider. Respond ONLY with valid JSON.' },
          { role: 'user', content: `Current price for ${companyName} (${symbol}) ${sector} sector ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}. Return ONLY JSON: {"currentPrice": <number>, "peRatio": <number or null>, "yearHigh": <number>, "yearLow": <number>}` }
        ],
        temperature: 0.1,
        max_tokens: 256,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) return null;
    const data: any = await res.json();
    const text = data?.choices?.[0]?.message?.content || '';
    let parsed: any;
    try { parsed = JSON.parse(text); } catch { return null; }

    if (typeof parsed.currentPrice !== 'number' || parsed.currentPrice <= 0) return null;

    // Same reasoning as estimatePriceWithAI above — an unconditional gate,
    // not the old OR against a per-stock band that never fired.
    const diffOk = Math.abs(parsed.currentPrice - avgCost) / avgCost <= 0.50;
    if (!diffOk || !isPlausiblyUncorrupted(parsed.currentPrice)) return null;

    const yearHigh = parsed.yearHigh > 0 ? parsed.yearHigh : Math.round(parsed.currentPrice * 1.3);
    const yearLow  = parsed.yearLow  > 0 ? parsed.yearLow  : Math.round(parsed.currentPrice * 0.75);

    return {
      currentPrice: Math.round(parsed.currentPrice * 100) / 100,
      peRatio: parsed.peRatio && parsed.peRatio > 0 ? Math.round(parsed.peRatio * 10) / 10 : null,
      pbRatio: null, sector: '', industry: '',
      dayHigh: yearHigh, dayLow: yearLow, yearHigh, yearLow,
      volume: 0, marketCap: null, change: 0, changePercent: 0,
      beta: null, debtToEquity: null, roe: null, eps: null,
      fiftyDayAvg: null, twoHundredDayAvg: null,
      shortName: symbol,
      analystRating: null, targetPrice: null,
      earningsGrowth: null, revenueGrowth: null, bookValue: null,
      aiEstimatedPrice: true,
      aiEstimatedPE: true,
      source: 'AI/Mistral',
    };
  } catch {
    return null;
  }
}

export async function fetchMarketData(
  holdings: Holding[],
  groqApiKey?: string,
  mistralApiKey?: string,
  angelApiKey?: string,
  angelClientId?: string,
  angelMpin?: string,
  angelTotpSecret?: string,
): Promise<MarketDataResult> {
  const data = new Map<string, MarketData>();
  const failed: string[] = [];
  // Symbols Angel One's instrument master confirmed it doesn't have — a
  // specific "renamed/delisted/corporate action" signal, carried through so
  // the final failure message (if every other source also fails) can say
  // something more useful than generic "no data". Populated even when the
  // symbol never reaches `failed` at all — cleared of meaning at the point
  // of use, not here.
  const notFoundInMaster = new Set<string>();
  let aiEstimated = 0;
  let remaining = holdings; // default: all holdings need fetching

  // Purge stale cache entries before fetching
  const { evictStaleCache } = require('./priceValidator');
  evictStaleCache();

  // 0. Angel One SmartAPI — batch fetch all symbols in one call
  if (angelApiKey && angelClientId && angelMpin && angelTotpSecret) {
    console.log(chalk.gray('        Trying Angel One SmartAPI...'));
    const symbols = holdings.map(h => cleanSymbol(h.symbol));
    const angelResult = await fetchBatchFromAngelOne(
      symbols, angelApiKey, angelClientId, angelMpin, angelTotpSecret
    );
    const angelData = angelResult.data;
    for (const sym of angelResult.notFoundInMaster) notFoundInMaster.add(sym);
    if (angelData.size > 0) {
      for (const h of holdings) {
        const sym = cleanSymbol(h.symbol);
        const md = angelData.get(sym);
        if (md) {
          const validation = validateAndCache(sym, md.currentPrice, 'AngelOne');
          md.currentPrice = validation.price;
          md.source = validation.source;
          md.trusted = validation.trusted;
          md.warning = validation.warning;
          data.set(h.symbol, md);
          process.stdout.write(chalk.green(`    ✓ ${sym}: ₹${md.currentPrice} (AngelOne)
`));
        }
      }
      remaining = holdings.filter(h => !data.has(h.symbol));
      if (remaining.length === 0) {
        if (aiEstimated > 0) {
          console.log(chalk.magenta(`  ℹ ${aiEstimated} stock(s) used AI-estimated prices`));
        }
        return { data, failed, aiEstimated, notFoundInMaster: [...notFoundInMaster] };
      }
      // If some symbols missed, continue with remaining via fallback chain below
    }
  }

  // Only fetch stocks Angel One missed
  console.log(chalk.gray(`        Angel One missed ${remaining.length} stocks — trying fallbacks...`));

  let nse: any = null;
  try {
    const { NseIndia } = require('stock-nse-india');
    nse = new NseIndia();
    console.log(chalk.gray('  ✓ stock-nse-india package loaded'));
  } catch (err: any) {
    console.log(chalk.yellow(`  ⚠ stock-nse-india not available, using Groww + Yahoo + AI fallback`));
  }

  const BATCH_SIZE = 5;
  const fetchStock = async (h: Holding) => {
    const displaySym = cleanSymbol(h.symbol);
    let result: MarketData | null = null;
    let source = '';

    // 1. NSE (with symbol variants)
    if (nse) {
      const variants = nseSymbolVariants(displaySym);
      for (const variant of variants) {
        result = await Promise.race([
          fetchFromNse(nse, variant),
          new Promise<null>((_, r) => setTimeout(() => r(new Error('timeout')), 6000)),
        ]).catch(() => null);
        if (result) { source = 'NSE'; break; }
        await sleep(150);
      }
    }

    // 2. Groww
    if (!result) {
      result = await Promise.race([
        fetchFromGroww(h.symbol),
        new Promise<null>((_, r) => setTimeout(() => r(new Error('timeout')), 5000)),
      ]).catch(() => null);
      if (result) source = 'Groww';
    }

    // 3. Yahoo Finance
    if (!result) {
      result = await Promise.race([
        fetchFromYahoo(h.symbol),
        new Promise<null>((_, r) => setTimeout(() => r(new Error('timeout')), 5000)),
      ]).catch(() => null);
      if (result) source = 'Yahoo';
    }

    // 3.5. Last-known-good cache — a stale real price beats a hallucinated
    // "current" one, so this runs before AI estimation, not after. Only
    // fires when every live source above failed; does nothing for a symbol
    // that has never once succeeded a live fetch, since there's nothing to
    // read (see getCachedPrice's own comment).
    if (!result) {
      const cached = getCachedPrice(displaySym);
      if (cached) {
        result = {
          currentPrice: cached.price,
          peRatio: null, pbRatio: null, sector: '', industry: '',
          dayHigh: 0, dayLow: 0, yearHigh: 0, yearLow: 0,
          volume: 0, marketCap: null, change: 0, changePercent: 0,
          beta: null, debtToEquity: null, roe: null, eps: null,
          fiftyDayAvg: null, twoHundredDayAvg: null,
          shortName: displaySym,
          analystRating: null, targetPrice: null,
          earningsGrowth: null, revenueGrowth: null, bookValue: null,
          stale: true,
          staleAgeHours: cached.ageHours,
          source: `Cached (${cached.source})`,
        };
        source = `Cached (${cached.source})`;
      }
    }

    // 4. Groq AI — skip for large-caps
    if (!result && groqApiKey && !NEVER_AI_ESTIMATE.includes(displaySym)) {
      result = await estimatePriceWithAI(
        displaySym, h.companyName || displaySym, h.sector || 'Unknown', h.avgCost, groqApiKey
      ).catch(() => null);
      if (result) { source = 'AI/Groq'; aiEstimated++; }
    }

    // 5. Mistral AI — skip for large-caps
    if (!result && mistralApiKey && !NEVER_AI_ESTIMATE.includes(displaySym)) {
      result = await estimatePriceWithMistral(
        displaySym, h.companyName || displaySym, h.sector || 'Unknown', h.avgCost, mistralApiKey
      ).catch(() => null);
      if (result) { source = 'AI/Mistral'; aiEstimated++; }
    }

    if (result && result.stale) {
      // Deliberately skips validateAndCache(): that function re-saves the
      // cache with fetchedAt = Date.now() for any non-AI source, which
      // would silently reset this exact entry's age back to zero — the
      // one thing this path exists to preserve and show honestly.
      result.trusted = false;
      data.set(h.symbol, result);
      process.stdout.write(chalk.yellow(
        `    ⚠ ${displaySym}: ₹${result.currentPrice} · ${result.staleAgeHours!.toFixed(1)}h old (cached — all live sources failed)
`));
    } else if (result && result.currentPrice > 0) {
      const validation = validateAndCache(displaySym, result.currentPrice, source);
      result.currentPrice = validation.price;
      result.source = validation.source;
      result.trusted = validation.trusted;
      result.warning = validation.warning;
      if (validation.warning) {
        process.stdout.write(chalk.yellow(`    ${validation.warning}
`));
      }
      data.set(h.symbol, result);
      const badge = source.startsWith('AI') ? chalk.magenta(source) : chalk.green(source);
      process.stdout.write(chalk.green(`    ✓ ${displaySym}: ₹${result.currentPrice} (${badge})
`));
    } else {
      failed.push(displaySym);
      process.stdout.write(chalk.red(`    ✗ ${displaySym}: no data
`));
    }
  };

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(h => fetchStock(h)));
    if (i + BATCH_SIZE < remaining.length) {
      await sleep(2000);
    }
  }

  if (aiEstimated > 0) {
    console.log(chalk.magenta(`  ℹ ${aiEstimated} stock(s) used AI-estimated prices (APIs unavailable)`));
  }

  return { data, failed, aiEstimated, notFoundInMaster: [...notFoundInMaster] };
}