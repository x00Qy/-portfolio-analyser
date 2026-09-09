/**
 * YALGO QUANT LABS — Price Validator & Cache
 * 
 * Fixes:
 *  Bug 1 & 2 & 3 — AI hallucination outlier rejection (>15% deviation from cache)
 *  Bug 4         — NSE symbol normalisation + per-call delay to reduce rate-limit failures
 * 
 * Drop this file into src/ and import { validateAndCache, nseSymbol, sleep }
 * into your marketData.ts. Then wrap every price fetch with validateAndCache().
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// 1. PERSISTENT PRICE CACHE  (written to disk so it survives between runs)
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_FILE = path.resolve(process.cwd(), '.price-cache.json');
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  price: number;
  source: string;       // 'NSE' | 'Groww' | 'AI/Groq' etc.
  fetchedAt: number;    // epoch ms
}

type PriceCache = Record<string, CacheEntry>;

function loadCache(): PriceCache {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) as PriceCache;
    }
  } catch {
    // corrupt cache → start fresh
  }
  return {};
}

function saveCache(cache: PriceCache): void {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (e) {
    // non-fatal — just warn
    console.warn('  ⚠ Could not write price cache:', (e as Error).message);
  }
}

// In-memory copy for the current run
const _cache: PriceCache = loadCache();

export interface CachedPriceLookup {
  price: number;
  source: string;
  ageHours: number;
}

/**
 * Reads a cache entry directly — no validation against a newly-fetched
 * price, because there isn't one; this is the last-resort path for when
 * every live source failed. Returns null if nothing is cached for this
 * symbol (a stock that has never once succeeded a live fetch has nothing
 * here — evictStaleCache() only clears out entries that exist, it doesn't
 * create them) or if the entry has aged past MAX_AGE_MS.
 */
export function getCachedPrice(symbol: string): CachedPriceLookup | null {
  const cached = _cache[symbol];
  if (!cached) return null;
  const ageMs = Date.now() - cached.fetchedAt;
  if (ageMs >= MAX_AGE_MS) return null;
  return { price: cached.price, source: cached.source, ageHours: ageMs / 3600000 };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. OUTLIER REJECTION THRESHOLD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maximum allowed single-day move before we consider a price suspicious.
 * Indian circuit limits are 5/10/20% but AI hallucinations can be 30-70% off.
 * We use 20% as a safe ceiling — genuine limit-up/down days will still pass
 * (Nifty stocks rarely hit 20% but small-caps can; adjust if needed).
 */
const OUTLIER_THRESHOLD = 0.20; // 20%

export interface ValidationResult {
  price: number;
  source: string;
  trusted: boolean;         // false → AI price AND no valid cached fallback
  warning?: string;         // set when we fell back or rejected
}

/**
 * validateAndCache()
 * 
 * Call this instead of using the raw fetched price directly.
 * 
 * @param symbol    NSE ticker, e.g. 'BHARTIARTL'
 * @param newPrice  Price just fetched (from NSE, Groww, or AI)
 * @param source    Label for the source ('NSE' | 'Groww' | 'AI/Groq' | 'AI/Gemini')
 * @returns         A ValidationResult with the best price to use
 */
export function validateAndCache(
  symbol: string,
  newPrice: number,
  source: string,
): ValidationResult {
  const isAI = source.toLowerCase().includes('ai');
  const cached = _cache[symbol];

  // Check if cached price is still fresh (within 24 hours)
  const cacheIsFresh = cached &&
    !cached.source.toLowerCase().includes('ai') &&
    (Date.now() - cached.fetchedAt) < MAX_AGE_MS;

  // ── 2a. Only use cache as reference if it's fresh (within 24h) ──
  if (cacheIsFresh) {
    const deviation = Math.abs(newPrice - cached.price) / cached.price;

    if (deviation > OUTLIER_THRESHOLD) {
      const pct = (deviation * 100).toFixed(1);
      const warning =
        `⚠ AI GUESS REJECTED for ${symbol}: ₹${newPrice.toFixed(2)} is ${pct}% ` +
        `away from last real price ₹${cached.price.toFixed(2)}. Using cached price.`;

      return {
        price: cached.price,
        source: `${cached.source} (cached — AI rejected)`,
        trusted: false,
        warning,
      };
    }
  }

  // ── 2b. Cache is stale or missing — accept new price if it passes PRICE_SANITY ──
  // (PRICE_SANITY check is in marketData.ts isSane() — already done before this call)

  // ── 2c. Price is acceptable — update cache only for real sources ──
  if (!isAI) {
    _cache[symbol] = { price: newPrice, source, fetchedAt: Date.now() };
    saveCache(_cache);
    return { price: newPrice, source, trusted: true };
  }

  // ── 2d. AI price — don't cache, mark untrusted ──
  return {
    price: newPrice,
    source,
    trusted: false,
    warning: `⚠ AI ESTIMATE for ${symbol}: ₹${newPrice.toFixed(2)} — may be ±20% inaccurate`,
  };
}
// ─────────────────────────────────────────────────────────────────────────────
// 3. NSE SYMBOL NORMALISATION  (Bug 4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Known problem symbols that need alternate forms when the default lookup fails.
 * Extend this map as you discover more inconsistencies.
 */
const SYMBOL_ALTERNATES: Record<string, string[]> = {
  BHARTIARTL:  ['BHARTIARTL', 'BHARTI-ARTL', 'BHARTIAIRTEL'],
  HDFCBANK:    ['HDFCBANK', 'HDFC-BANK'],
  KOTAKBANK:   ['KOTAKBANK', 'KOTAK-BANK', 'KOTAKMAHINDRA'],
  MARUTI:      ['MARUTI', 'MARUTI-SUZUKI', 'MARUTISUZUKI'],
  TCS:         ['TCS'],
  INFY:        ['INFY', 'INFOSYS'],
  LT:          ['LT', 'L&T'],
  HINDUNILVR:  ['HINDUNILVR', 'HUL'],
  ASIANPAINT:  ['ASIANPAINT', 'ASIANPAINTS'],
  ICICIBANK:   ['ICICIBANK', 'ICICI-BANK'],
};

/**
 * Returns all symbol variants to try for a given ticker.
 * Your fetch loop should iterate these and stop at the first success.
 */
export function nseSymbolVariants(symbol: string): string[] {
  return SYMBOL_ALTERNATES[symbol] ?? [symbol];
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. RATE-LIMIT HELPER  (Bug 4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add this between NSE API calls to avoid rate-limit bans.
 * 150ms is enough to stay under most public NSE rate limits.
 */
export function sleep(ms = 150): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. BETTER WARNING LABEL FORMATTER  (Bug 3 / UX)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call this in reporter.ts to render a clear, honest label next to AI prices.
 * 
 * Example output:
 *   trusted   → "₹1,840.20 (NSE)"
 *   untrusted → "₹1,347.15 ⚠ AI GUESS (±20%)"
 */
export function formatPrice(price: number, result: ValidationResult): string {
  const p = `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (result.trusted) return `${p} (${result.source})`;
  return `${p} ⚠ AI GUESS (±20%)`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ENHANCED AI PROMPT BUILDER  (Bug 1 & 2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Use this to build the AI price-estimation prompt.
 * Anchors the model to the last known real price so it can't hallucinate freely.
 */
export function buildAIPricePrompt(symbols: string[]): string {
  const anchors = symbols
    .map(sym => {
      const cached = _cache[sym];
      if (cached && !cached.source.toLowerCase().includes('ai')) {
        return `${sym}: last known real price ₹${cached.price.toFixed(2)} (from ${cached.source} on ${new Date(cached.fetchedAt).toDateString()})`;
      }
      return `${sym}: no cached price available`;
    })
    .join('\n');

  return `
You are a financial data assistant for Indian equity markets.
Estimate the CURRENT market price for each stock listed below.

CRITICAL RULES:
1. Base your estimate on the "last known real price" provided for each stock.
2. Do NOT deviate more than 5% from the last known price unless you have
   specific, high-confidence knowledge of a major corporate event (split,
   merger, earnings surprise) that occurred after that date.
3. If you are unsure, return the last known price unchanged.
4. Return ONLY a JSON object: { "SYMBOL": price_as_number, ... }
5. No explanation, no markdown, no units — just the JSON.

Last known prices:
${anchors}

Stocks to estimate: ${symbols.join(', ')}
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CACHE INSPECTION UTILITY  (debugging helper)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Print the current cache state to console — useful for debugging.
 * Call it with: import { inspectCache } from './priceValidator'; inspectCache();
 */
export function inspectCache(): void {
  console.log('\n  ── Price Cache State ──');
  const entries = Object.entries(_cache);
  if (entries.length === 0) {
    console.log('  (empty — no prices cached yet)');
    return;
  }
  for (const [sym, entry] of entries) {
    const age = ((Date.now() - entry.fetchedAt) / 3600000).toFixed(1);
    console.log(`  ${sym.padEnd(14)} ₹${entry.price.toFixed(2).padStart(10)}  ${entry.source.padEnd(8)}  ${age}h ago`);
  }
  console.log('');
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. CACHE EVICTION UTILITY
// ─────────────────────────────────────────────────────────────────────────────

export function evictStaleCache(): void {
  let evicted = 0;
  for (const sym of Object.keys(_cache)) {
    if ((Date.now() - _cache[sym].fetchedAt) >= MAX_AGE_MS) {
      delete _cache[sym];
      evicted++;
    }
  }
  if (evicted > 0) {
    saveCache(_cache);
  }
}