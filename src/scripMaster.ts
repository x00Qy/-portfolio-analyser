/**
 * Angel One's public bulk instrument master — one file covering every
 * exchange/segment/instrument they list (NSE, BSE, NFO, ...). Replaces the
 * old hardcoded KNOWN_TOKENS table (~23 symbols, silently stale the moment
 * a token changes) and the per-symbol searchScrip lookup, which hit Angel
 * One's rate limit after two sequential calls when tested directly
 * ("Access denied because of exceeding access rate"). This file instead
 * downloads the full master once, caches it to disk for 24h, and answers
 * every symbol lookup after that from an in-memory map — no further
 * network calls until the cache expires.
 *
 * Unauthenticated, public endpoint — no session/TOTP needed here.
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const SCRIP_MASTER_URL = 'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json';
const CACHE_FILE = path.resolve(process.cwd(), '.scrip-master-cache.json');
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface ScripMasterCache {
  fetchedAt: number;
  // Bare NSE equity symbol (no "-EQ" suffix) -> Angel One token. Built by
  // filtering the ~145,000-row master down to exch_seg "NSE" rows whose
  // symbol ends in "-EQ" (~2,670 of them). The other suffixes on the same
  // company (-BE, -BL, -AF, -RL, -IQ, ...) are different instrument series,
  // not equity, and are deliberately excluded.
  nseEquityTokens: Record<string, string>;
}

let _cache: ScripMasterCache | null = null;
let _fetchPromise: Promise<ScripMasterCache> | null = null;

function loadFromDisk(): ScripMasterCache | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) as ScripMasterCache;
      if (Date.now() - parsed.fetchedAt < MAX_AGE_MS) return parsed;
    }
  } catch {
    // corrupt cache -> refetch
  }
  return null;
}

function saveToDisk(cache: ScripMasterCache): void {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf-8');
  } catch (e) {
    console.warn('  ⚠ Could not write scrip master cache:', (e as Error).message);
  }
}

async function fetchFresh(): Promise<ScripMasterCache> {
  const res = await axios.get(SCRIP_MASTER_URL, { timeout: 30000 });
  const rows: any[] = res.data;
  const nseEquityTokens: Record<string, string> = {};
  for (const row of rows) {
    if (row?.exch_seg === 'NSE' && typeof row?.symbol === 'string' && row.symbol.endsWith('-EQ')) {
      nseEquityTokens[row.symbol.slice(0, -3)] = row.token;
    }
  }
  const cache: ScripMasterCache = { fetchedAt: Date.now(), nseEquityTokens };
  saveToDisk(cache);
  return cache;
}

// Loads from disk if fresh, otherwise fetches once — concurrent callers in
// the same run share one in-flight fetch rather than each downloading 34MB.
async function getScripMaster(): Promise<ScripMasterCache> {
  if (_cache) return _cache;
  if (_fetchPromise) return _fetchPromise;
  const fromDisk = loadFromDisk();
  if (fromDisk) {
    _cache = fromDisk;
    return _cache;
  }
  _fetchPromise = fetchFresh().then(c => { _cache = c; return c; });
  return _fetchPromise;
}

export type ScripLookupResult =
  | { status: 'found'; token: string }
  | { status: 'not_found' }
  | { status: 'unavailable'; reason: string };

/**
 * Looks up an NSE equity symbol's Angel One token.
 *
 * `not_found` is a confident, specific signal — the symbol genuinely is not
 * in the current instrument master (delisting, rename, demerger, etc.), not
 * a transient failure. It's what actually happened when this file's test
 * run looked up TATAMOTORS: absent, while every neighbouring Tata entity
 * (TATASTEEL, TATAPOWER, ...) resolved fine, and TMPV — its post-demerger
 * successor — was present under its own new symbol.
 *
 * `unavailable` means the master itself couldn't be loaded this run
 * (network down on first use) — that's a statement about connectivity, not
 * about the symbol, and callers should not treat it as "not found".
 */
export async function lookupNseEquityToken(symbol: string): Promise<ScripLookupResult> {
  try {
    const master = await getScripMaster();
    const token = master.nseEquityTokens[symbol];
    return token ? { status: 'found', token } : { status: 'not_found' };
  } catch (err: any) {
    return { status: 'unavailable', reason: err?.message || 'unknown error' };
  }
}
