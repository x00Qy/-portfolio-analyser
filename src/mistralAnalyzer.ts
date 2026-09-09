import { StockAnalysis } from './stockAnalyzer';
import { RiskMetrics } from './riskAnalyzer';
import { Holding } from './parser';
import { NewsItem } from './newsFetcher';

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
export const MISTRAL_SMALL = process.env.MISTRAL_MODEL || 'mistral-small-latest';
const MISTRAL_FAST  = process.env.MISTRAL_FAST_MODEL || 'open-mistral-7b';

export interface MistralStockInsight {
  symbol: string;
  aiReasoning: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  keyRisk: string;
  keyOpportunity: string;
}

export interface MistralPortfolioInsight {
  overallSentiment: string;
  topConcern: string;
  topOpportunity: string;
  suggestedAllocation: string;
  marketContext: string;
  stockInsights: MistralStockInsight[];
}

export interface StockNewsAnalysis {
  symbol: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
  headlines: NewsItem[];
  aiAnalysis: string;
}

async function callMistral(
  prompt: string,
  apiKey: string,
  maxTokens: number = 2048,
  fast: boolean = false
): Promise<string | null> {
  if (!apiKey || apiKey.length < 10) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: fast ? MISTRAL_FAST : MISTRAL_SMALL,
        messages: [
          { role: 'system', content: 'You are a seasoned Indian equity portfolio analyst. Respond ONLY with valid JSON. No markdown, no preamble.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      console.error(`Mistral API HTTP ${res.status}: ${errText.substring(0, 200)}`);
      return null;
    }

    const data: any = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('Mistral API timed out after 30s');
    } else {
      console.error('Mistral API failed:', err.message);
    }
    return null;
  }
}

export async function analyzeWithMistral(
  holdings: Holding[],
  analyses: StockAnalysis[],
  risk: RiskMetrics,
  apiKey: string
): Promise<MistralPortfolioInsight | null> {
  const MAX_STOCKS = 30;
  const limitedAnalyses = analyses.length > MAX_STOCKS ? analyses.slice(0, MAX_STOCKS) : analyses;

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
        riskLevel: a.riskLevel,
        flags: a.flags,
        ruleReasoning: a.reasoning.join(' | '),
      })),
    };

    const prompt = `Analyze this Indian equity portfolio and return ONLY JSON:

${JSON.stringify(portfolioSummary, null, 2)}

Return this exact structure:
{
  "overallSentiment": "2-3 sentence overall take",
  "topConcern": "single biggest risk",
  "topOpportunity": "single best opportunity",
  "suggestedAllocation": "brief sector/position suggestion",
  "marketContext": "how current Indian market affects this portfolio",
  "stockInsights": [
    {
      "symbol": "SYMBOL",
      "aiReasoning": "1-2 sentence insight",
      "sentiment": "BULLISH|BEARISH|NEUTRAL",
      "keyRisk": "specific risk",
      "keyOpportunity": "specific opportunity"
    }
  ]
}

Include ALL stocks. Be direct, specific to Indian markets.`;

    const text = await callMistral(prompt, apiKey, 4096);
    if (!text) return null;

    let parsed: MistralPortfolioInsight;
    try {
      parsed = JSON.parse(text) as MistralPortfolioInsight;
    } catch (e: any) {
      console.error('Failed to parse Mistral insight JSON:', e.message);
      return null;
    }

    if (!parsed.overallSentiment || !Array.isArray(parsed.stockInsights)) return null;
    return parsed;
  } catch (err: any) {
    console.error('Mistral portfolio analysis failed:', err.message);
    return null;
  }
}

export async function analyzeNewsWithMistral(
  symbol: string,
  headlines: NewsItem[],
  apiKey: string
): Promise<StockNewsAnalysis | null> {
  if (headlines.length === 0) return null;

  try {
    const prompt = `Analyze these news headlines for ${symbol} and return ONLY JSON:

HEADLINES:
${headlines.map((h, i) => `${i + 1}. "${h.headline}" — ${h.source} (${h.publishedAt})`).join('\n')}

Return this exact structure:
{
  "sentiment": "POSITIVE|NEGATIVE|NEUTRAL|MIXED",
  "aiAnalysis": "2-3 sentences analyzing what these headlines mean for the stock."
}`;

    const text = await callMistral(prompt, apiKey, 512, true);
    if (!text) return null;

    let parsed: { sentiment: string; aiAnalysis: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      return null;
    }

    return { symbol, sentiment: parsed.sentiment as any, headlines, aiAnalysis: parsed.aiAnalysis };
  } catch {
    return null;
  }
}

export async function estimatePEWithMistral(
  symbol: string,
  companyName: string,
  sector: string,
  currentPrice: number,
  apiKey: string
): Promise<number | null> {
  try {
    const prompt = `Estimate the current PE ratio for ${companyName} (${symbol}) in the ${sector} sector, trading at ₹${currentPrice}. Return ONLY JSON:

{
  "peRatio": <number>,
  "confidence": "HIGH|MED|LOW"
}

Base on recent earnings trends and sector averages in Indian markets. Be realistic.`;

    const text = await callMistral(prompt, apiKey, 256, true);
    if (!text) return null;

    let parsed: { peRatio: number; confidence: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      return null;
    }

    if (typeof parsed.peRatio !== 'number' || parsed.peRatio <= 0 || parsed.peRatio > 200) return null;
    return Math.round(parsed.peRatio * 10) / 10;
  } catch {
    return null;
  }
}

export async function estimatePriceWithMistral(
  symbol: string,
  companyName: string,
  sector: string,
  avgCost: number,
  apiKey: string
): Promise<{ currentPrice: number; peRatio: number | null; yearHigh: number; yearLow: number } | null> {
  try {
    const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const prompt = `Estimate the current market price for ${companyName} (${symbol}) in the ${sector} sector as of ${currentMonthYear}.
The investor's average cost is ₹${avgCost} — use ONLY as reference, not as the current price.

Return ONLY JSON:
{
  "currentPrice": <number>,
  "peRatio": <number or null>,
  "yearHigh": <number>,
  "yearLow": <number>
}

Be realistic for Indian large-cap stocks. Do not use avgCost as the price.`;

    const text = await callMistral(prompt, apiKey, 256, true);
    if (!text) return null;

    let parsed: { currentPrice: number; peRatio: number | null; yearHigh: number; yearLow: number };
    try {
      parsed = JSON.parse(text);
    } catch {
      return null;
    }

    if (typeof parsed.currentPrice !== 'number' || parsed.currentPrice <= 0) return null;

    const priceDiff = Math.abs(parsed.currentPrice - avgCost) / avgCost;
    if (priceDiff > 0.50) return null;

    return {
      currentPrice: Math.round(parsed.currentPrice * 100) / 100,
      peRatio: parsed.peRatio && parsed.peRatio > 0 ? Math.round(parsed.peRatio * 10) / 10 : null,
      yearHigh: parsed.yearHigh > 0 ? parsed.yearHigh : Math.round(parsed.currentPrice * 1.3),
      yearLow: parsed.yearLow > 0 ? parsed.yearLow : Math.round(parsed.currentPrice * 0.75),
    };
  } catch {
    return null;
  }
}