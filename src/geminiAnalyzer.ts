import { StockAnalysis } from './stockAnalyzer';
import { RiskMetrics } from './riskAnalyzer';
import { Holding } from './parser';
import { NewsItem } from './newsFetcher';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GeminiStockInsight {
  symbol: string;
  aiReasoning: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  keyRisk: string;
  keyOpportunity: string;
}

export interface GeminiPortfolioInsight {
  overallSentiment: string;
  topConcern: string;
  topOpportunity: string;
  suggestedAllocation: string;
  marketContext: string;
  stockInsights: GeminiStockInsight[];
}

export interface StockNewsAnalysis {
  symbol: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
  headlines: NewsItem[];
  aiAnalysis: string;
}

export async function analyzeWithGemini(
  holdings: Holding[],
  analyses: StockAnalysis[],
  risk: RiskMetrics,
  apiKey: string
): Promise<GeminiPortfolioInsight | null> {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
    console.error('Gemini API key missing or invalid. Set GEMINI_API_KEY in .env');
    return null;
  }

  const MAX_STOCKS = 30;
  const limitedAnalyses = analyses.length > MAX_STOCKS
    ? analyses.slice(0, MAX_STOCKS)
    : analyses;
  if (analyses.length > MAX_STOCKS) {
    console.log(`  ℹ Gemini analysis limited to top ${MAX_STOCKS} holdings by value`);
  }

  try {
    const totalInvested = holdings.reduce((s, h) => s + h.investedValue, 0);
    const totalCurrent = holdings.reduce((s, h) => s + h.currentValue, 0);
    const pnlPercent = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

    const portfolioSummary = {
      totalInvested: `₹${(totalInvested / 100000).toFixed(2)}L`,
      totalCurrent: `₹${(totalCurrent / 100000).toFixed(2)}L`,
      overallPnL: `${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`,
      riskLevel: risk.riskLevel,
      riskScore: risk.riskScore,
      diversificationScore: risk.diversificationScore,
      beta: risk.beta,
      topSector: risk.sectorExposure[0]
        ? `${risk.sectorExposure[0].sector} (${(risk.sectorExposure[0].weight * 100).toFixed(1)}%)`
        : 'N/A',
      stocks: limitedAnalyses.map(a => ({
        symbol: a.symbol,
        company: a.companyName,
        sector: a.sector,
        pnlPercent: `${a.pnlPercent >= 0 ? '+' : ''}${a.pnlPercent.toFixed(1)}%`,
        weight: `${(a.weight * 100).toFixed(1)}%`,
        action: a.action,
        confidence: a.confidence,
        riskLevel: a.riskLevel,
        flags: a.flags,
        ruleReasoning: a.reasoning.join(' | '),
      })),
    };

    const prompt = `You are a seasoned Indian equity portfolio analyst with deep knowledge of NSE/BSE markets, Indian macro environment, and retail investor behaviour.

Analyse this portfolio and provide insights in JSON format ONLY (no markdown, no preamble):

PORTFOLIO DATA:
${JSON.stringify(portfolioSummary, null, 2)}

Respond ONLY with this exact JSON structure:
{
  "overallSentiment": "<2-3 sentence overall take on this portfolio>",
  "topConcern": "<single biggest risk or problem you see>",
  "topOpportunity": "<single best opportunity or strength>",
  "suggestedAllocation": "<brief suggestion on sector or position sizing changes>",
  "marketContext": "<how current Indian market conditions affect this portfolio>",
  "stockInsights": [
    {
      "symbol": "<symbol>",
      "aiReasoning": "<1-2 sentence AI insight that BUILDS ON (not contradicts) the rule-based analysis>",
      "sentiment": "<BULLISH|BEARISH|NEUTRAL>",
      "keyRisk": "<specific risk for this stock>",
      "keyOpportunity": "<specific opportunity for this stock>"
    }
  ]
}

IMPORTANT: Your stockInsights MUST include ALL stocks from the portfolio data. Do not skip any.
Be direct, specific to Indian markets, and avoid generic advice. Focus on actionable insights.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 16384,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
if (!res.ok) {
  const errText = await res.text().catch(() => '');
  if (res.status === 429) {
    console.log('  ⚠ Gemini rate limited — waiting 10s and retrying...');
    await new Promise(r => setTimeout(r, 10000));
    // retry once
    const retry = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 16384 },
      }),
    }).catch(() => null);
    if (!retry?.ok) {
      console.log(`  ⚠ Gemini retry failed — falling back`);
      return null;
    }
    // reassign data from retry — continue normally
    const retryData: any = await retry.json();
    const retryText = retryData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    try {
      const clean = retryText.replace(/```json|```/g, '').trim();
      return JSON.parse(clean) as GeminiPortfolioInsight;
    } catch {
      return null;
    }
  }
  console.log(`  ⚠ Gemini HTTP ${res.status}: ${errText.substring(0, 150)}`);
  return null;
}

    const data: any = await res.json();

    if (data.error) {
      return null;
    }

    const candidate = data?.candidates?.[0];
    if (!candidate) {
      console.error('Gemini response missing candidates');
      return null;
    }

    if (candidate.finishReason === 'MAX_TOKENS') {
      // Surfaced, not swallowed: this used to fall through to a generic
      // "Failed to parse Gemini JSON response" a few lines down, which hid
      // the actual, diagnosable cause (the response got cut off mid-JSON,
      // most likely because the portfolio has enough holdings that the
      // per-stock insights ran past the token budget).
      console.error(`Gemini response truncated at MAX_TOKENS (limit: 16384) — likely too many holdings for one response; the JSON below is probably incomplete`);
    }
    if (candidate.finishReason === 'SAFETY') {
      return null;
    }

    const text = candidate?.content?.parts?.[0]?.text || '';

    let parsed: GeminiPortfolioInsight;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean) as GeminiPortfolioInsight;
    } catch (parseErr: any) {
      console.error('Failed to parse Gemini JSON response:', parseErr.message);
      console.error('Raw response snippet:', text.substring(0, 200));
      return null;
    }

    if (!parsed.overallSentiment || !Array.isArray(parsed.stockInsights)) {
      console.error('Gemini response missing required fields');
      return null;
    }

    return parsed;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('Gemini analysis timed out after 30s');
    } else {
      console.error('Gemini analysis failed:', err.message);
    }
    return null;
  }
}

export async function analyzeNews(
  symbol: string,
  headlines: NewsItem[],
  apiKey: string
): Promise<StockNewsAnalysis | null> {
  if (!apiKey || headlines.length === 0) return null;

  try {
    const prompt = `You are an Indian stock market analyst. Analyze these news headlines for ${symbol} and give a brief sentiment analysis.

HEADLINES:
${headlines.map((h, i) => `${i + 1}. "${h.headline}" — ${h.source} (${h.publishedAt})`).join('\n')}

Respond ONLY with this exact JSON structure:
{
  "sentiment": "<POSITIVE|NEGATIVE|NEUTRAL|MIXED>",
  "aiAnalysis": "<2-3 sentences analyzing the news. What do these headlines mean for the stock? Be specific and mention the headlines.>"
}

Be concise and specific. Don't be generic.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 512,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const data: any = await res.json();
    const candidate = data?.candidates?.[0];
    if (!candidate) return null;

    const text = candidate?.content?.parts?.[0]?.text || '';

    let parsed: { sentiment: string; aiAnalysis: string };
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return null;
    }

    return {
      symbol,
      sentiment: parsed.sentiment as any,
      headlines,
      aiAnalysis: parsed.aiAnalysis,
    };
  } catch {
    return null;
  }
}

export async function estimatePEWithAI(
  symbol: string,
  companyName: string,
  sector: string,
  currentPrice: number,
  apiKey: string
): Promise<number | null> {
  if (!apiKey || apiKey.length < 10) return null;

  try {
    const prompt = `You are an Indian equity analyst. Estimate the current PE (Price-to-Earnings) ratio for ${companyName} (${symbol}) in the ${sector} sector.

The stock is currently trading at ₹${currentPrice}.

Respond ONLY with a JSON object:
{
  "peRatio": <number>,
  "confidence": "<HIGH|MED|LOW>",
  "reasoning": "<one sentence explaining why>"
}

Base your estimate on:
- Recent quarterly earnings trends for this company
- Sector average PE ratios in Indian markets
- Comparable companies in the same sector
- Current market conditions

Be realistic. If unsure, provide a conservative estimate.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 256,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const data: any = await res.json();
    const candidate = data?.candidates?.[0];
    if (!candidate) return null;

    const text = candidate?.content?.parts?.[0]?.text || '';

    let parsed: { peRatio: number; confidence: string; reasoning: string };
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return null;
    }

    if (typeof parsed.peRatio !== 'number' || parsed.peRatio <= 0 || parsed.peRatio > 200) {
      return null;
    }

    return Math.round(parsed.peRatio * 10) / 10;
  } catch {
    return null;
  }
}