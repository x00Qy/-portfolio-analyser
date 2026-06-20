/**
 * YALGO QUANT LABS — Angel One SmartAPI Provider
 * Provides real-time NSE stock prices via Angel One SmartAPI
 * Replaces NSE/Groww/Yahoo scraping as primary data source
 */

import axios from 'axios';
import * as crypto from 'crypto';
import chalk from 'chalk';
import { MarketData } from './marketData';

const BASE_URL = 'https://apiconnect.angelone.in';

// ─── TOTP Generator ──────────────────────────────────────────────────────────

function generateTOTP(secret: string): string {
  // Clean the secret — remove spaces, uppercase
  const cleanSecret = secret.replace(/\s/g, '').toUpperCase();
  
  // Base32 decode
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of cleanSecret) {
    const val = base32Chars.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  const key = Buffer.from(bytes);

  // Time step
  const timeStep = Math.floor(Date.now() / 1000 / 30);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(timeStep));

  // HMAC-SHA1
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(timeBuffer);
  const digest = hmac.digest();

  // Dynamic truncation
  const offset = digest[digest.length - 1] & 0x0f;
  const code = (
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  ) % 1000000;

  return code.toString().padStart(6, '0');
}

// ─── Session Management ───────────────────────────────────────────────────────

interface AngelSession {
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
  expiresAt: number; // epoch ms
}

let _session: AngelSession | null = null;

async function getSession(
  apiKey: string,
  clientId: string,
  mpin: string,
  totpSecret: string
): Promise<AngelSession | null> {
  // Reuse session if still valid (expires in 8 hours, refresh 30 min before)
  if (_session && Date.now() < _session.expiresAt - 30 * 60 * 1000) {
    return _session;
  }

  try {
    const totp = generateTOTP(totpSecret);

    const res = await axios.post(
      `${BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword`,
      {
        clientcode: clientId,
        password: mpin,
        totp,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': '127.0.0.1',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': apiKey,
        },
        timeout: 10000,
      }
    );

    const data = res.data;
    if (!data?.data?.jwtToken) {
      console.error('  ⚠ Angel One login failed:', data?.message || 'Unknown error');
      return null;
    }

    _session = {
      jwtToken: data.data.jwtToken,
      refreshToken: data.data.refreshToken,
      feedToken: data.data.feedToken,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
    };

    return _session;
  } catch (err: any) {
    console.error('  ⚠ Angel One session error:', err.message);
    return null;
  }
}

// ─── Symbol Token Map ─────────────────────────────────────────────────────────
// Angel One requires a numeric "token" for each symbol
// These are the NSE tokens for common large-cap stocks
// For unknown symbols, we search via API

const KNOWN_TOKENS: Record<string, string> = {
  RELIANCE:   '2885',
  // TCS:        '11536',  // wrong token — falls through to searchScrip
  // HDFCBANK:   '1333',   // wrong token — falls through to searchScrip
  ICICIBANK:  '4963',
  INFY:       '1594',
  HINDUNILVR: '1394',
  ITC:        '1660',
  SBIN:       '3045',
  BHARTIARTL: '10604',
  // KOTAKBANK:  '1922',   // wrong token — falls through to searchScrip
  LT:         '11483',
  AXISBANK:   '5900',
  ASIANPAINT: '236',
  MARUTI:     '10999',
  TITAN:      '3506',
  WIPRO:      '3787',
  HCLTECH:    '7229',
  BAJFINANCE: '317',
  NESTLEIND:  '17963',
  ULTRACEMCO: '11532',
  ADANIENT:   '25',
  ADANIPORTS: '15083',
  POWERGRID:  '14977',
  NTPC:       '11630',
  ONGC:       '2475',
};

const PRICE_SANITY_ANGEL: Record<string, [number, number]> = {
  KOTAKBANK: [1500, 3000], HDFCBANK: [1400, 2200],
  TCS: [3000, 6000], RELIANCE: [1000, 4000],
  INFY: [1000, 2500], ICICIBANK: [800, 1800],
  AXISBANK: [900, 1800], SBIN: [600, 1400],
  BHARTIARTL: [700, 2200], HINDUNILVR: [1800, 3500],
  TITAN: [2500, 5500], MARUTI: [9000, 16000],
  ASIANPAINT: [2000, 4000], LT: [3000, 6000], ITC: [200, 600],
};

async function getSymbolToken(
  symbol: string,
  apiKey: string,
  jwtToken: string
): Promise<string | null> {
  // Check known tokens first
  if (KNOWN_TOKENS[symbol]) return KNOWN_TOKENS[symbol];

  // Search via API for unknown symbols
  try {
    const res = await axios.post(
      `${BASE_URL}/rest/secure/angelbroking/order/v1/searchScrip`,
      { exchange: 'NSE', searchscrip: symbol },
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': '127.0.0.1',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': apiKey,
        },
        timeout: 5000,
      }
    );

    const scrips = res.data?.data?.scrips || [];
    // Find exact match
    const match = scrips.find(
      (s: any) => s.tradingsymbol === symbol && s.exch_seg === 'NSE'
    );
    return match?.symboltoken || null;
  } catch {
    return null;
  }
}

// ─── Main Fetch Function ──────────────────────────────────────────────────────

export async function fetchFromAngelOne(
  symbol: string,
  apiKey: string,
  clientId: string,
  mpin: string,
  totpSecret: string
): Promise<MarketData | null> {
  try {
    const session = await getSession(apiKey, clientId, mpin, totpSecret);
    if (!session) return null;

    const token = await getSymbolToken(symbol, apiKey, session.jwtToken);
    if (!token) return null;

    const res = await axios.post(
      `${BASE_URL}/rest/secure/angelbroking/market/v1/quote/`,
      {
        mode: 'FULL',
        exchangeTokens: { NSE: [token] },
      },
      {
        headers: {
          'Authorization': `Bearer ${session.jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': '127.0.0.1',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': apiKey,
        },
        timeout: 8000,
      }
    );

    const fetched = res.data?.data?.fetched?.[0];
    if (!fetched || !fetched.ltp) return null;

    const ltp = parseFloat(fetched.ltp);
    if (ltp <= 0) return null;


    const high    = parseFloat(fetched.high)    || 0;
    const low     = parseFloat(fetched.low)     || 0;
    const close   = parseFloat(fetched.close)   || ltp;
    const week52H = parseFloat(fetched['52weekHigh'] ?? fetched['52WeekHigh'] ?? fetched['week52High']) || 0;
    const week52L = parseFloat(fetched['52weekLow'] ?? fetched['52WeekLow'] ?? fetched['week52Low']) || 0;
    const volume  = parseInt(fetched.tradeVolume)     || 0;

    return {
      currentPrice: ltp,
      peRatio: null,
      pbRatio: null,
      sector: '',
      industry: '',
      dayHigh: high,
      dayLow: low,
      yearHigh: week52H,
      yearLow: week52L,
      volume,
      marketCap: null,
      change: ltp - close,
      changePercent: close > 0 ? ((ltp - close) / close) * 100 : 0,
      beta: null,
      debtToEquity: null,
      roe: null,
      eps: null,
      fiftyDayAvg: null,
      twoHundredDayAvg: null,
      shortName: symbol,
      analystRating: null,
      targetPrice: null,
      earningsGrowth: null,
      revenueGrowth: null,
      bookValue: null,
      source: 'AngelOne',
    };
  } catch (err: any) {
    return null;
  }
}

// ─── Batch Fetch (all holdings in one session) ────────────────────────────────

export async function fetchBatchFromAngelOne(
  symbols: string[],
  apiKey: string,
  clientId: string,
  mpin: string,
  totpSecret: string
): Promise<Map<string, MarketData>> {
  const result = new Map<string, MarketData>();
  if (!symbols.length) return result;

  try {
    const session = await getSession(apiKey, clientId, mpin, totpSecret);
    if (!session) {
      console.log(chalk.yellow('  ⚠ Angel One session failed — falling back to NSE/Groww/Yahoo'));
      return result;
    }

    // Resolve all tokens
    const tokenMap: Record<string, string> = {}; // symbol → token
    for (const sym of symbols) {
      const token = await getSymbolToken(sym, apiKey, session.jwtToken);
      if (token) tokenMap[sym] = token;
    }

    const tokens = Object.values(tokenMap);
    if (!tokens.length) return result;

    // Batch quote request — all tokens in one call
    console.log(chalk.gray(`    ✓ Angel One session OK — fetching ${symbols.length} symbols...`));
    const res = await axios.post(
      `${BASE_URL}/rest/secure/angelbroking/market/v1/quote/`,
      {
        mode: 'FULL',
        exchangeTokens: { NSE: tokens },
      },
      {
        headers: {
          'Authorization': `Bearer ${session.jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': '127.0.0.1',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': apiKey,
        },
        timeout: 10000,
      }
    );

    const fetched: any[] = res.data?.data?.fetched || [];



    // Build reverse map: token → symbol
    const reverseMap: Record<string, string> = {};
    for (const [sym, tok] of Object.entries(tokenMap)) {
      reverseMap[tok] = sym;
    }

    for (const item of fetched) {
      const sym = reverseMap[item.symbolToken] || reverseMap[item.token];
      if (!sym) continue;

      const ltp = parseFloat(item.ltp);
      if (!ltp || ltp <= 0) continue;

      const range = PRICE_SANITY_ANGEL[sym];
      if (range && (ltp < range[0] || ltp > range[1])) {
        console.log(chalk.yellow(`    ⚠ AngelOne price for ${sym} (₹${ltp}) outside expected range — skipping`));
        continue;
      }

      const close   = parseFloat(item.close)         || ltp;
      const week52H = parseFloat(item['52weekHigh'] ?? item['52WeekHigh'] ?? item['week52High']) || 0;
      const week52L = parseFloat(item['52weekLow'] ?? item['52WeekLow'] ?? item['week52Low']) || 0;

      result.set(sym, {
        currentPrice: ltp,
        peRatio: null,
        pbRatio: null,
        sector: '',
        industry: '',
        dayHigh: parseFloat(item.high) || 0,
        dayLow:  parseFloat(item.low)  || 0,
        yearHigh: week52H,
        yearLow:  week52L,
        volume: parseInt(item.tradeVolume) || 0,
        marketCap: null,
        change: ltp - close,
        changePercent: close > 0 ? ((ltp - close) / close) * 100 : 0,
        beta: null, debtToEquity: null, roe: null, eps: null,
        fiftyDayAvg: null, twoHundredDayAvg: null,
        shortName: sym,
        analystRating: null, targetPrice: null,
        earningsGrowth: null, revenueGrowth: null, bookValue: null,
        source: 'AngelOne',
      });
    }

    return result;
  } catch (err: any) {
    console.log(`  ⚠ Angel One batch fetch failed: ${err.message}`);
    return result;
  }
}