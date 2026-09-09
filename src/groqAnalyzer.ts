import { StockAnalysis } from './stockAnalyzer';
import { RiskMetrics } from './riskAnalyzer';
import { Holding } from './parser';
import { NewsItem } from './newsFetcher';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

export interface GroqStockInsight {
  symbol: string;
  aiReasoning: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  keyRisk: string;
  keyOpportunity: string;
}

export interface GroqPortfolioInsight {
  overallSentiment: string;
  topConcern: string;
  topOpportunity: string;
  suggestedAllocation: string;
  marketContext: string;
  stockInsights: GroqStockInsight[];
}

export interface StockNewsAnalysis {
  symbol: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
  headlines: NewsItem[];
  aiAnalysis: string;
}

async function callGroq(prompt: string, apiKey: string, maxTokens: number = 2048): Promise<string | null> {
  if (!apiKey || apiKey.length < 10) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'You are a seasoned Indian equity portfolio analyst. Respond ONLY with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      // Silently return null for rate limits (429) — fallback chain handles it
      if (res.status !== 429) {
        const errText = await res.text().catch(() => 'Unknown error');
        console.error(`Groq API HTTP ${res.status}: ${errText.substring(0, 100)}`);
      }
      return null;
    }

    const data: any = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (err: any) {
    // Silently swallow timeouts and network errors — fallback chain handles it
    return null;
  }
}

export async function analyzeWithGroq(
  holdings: Holding[],
  analyses: StockAnalysis[],
  risk: RiskMetrics,
  apiKey: string
): Promise<GroqPortfolioInsight | null> {
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
        confidence: a.confidence,
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
      "aiReasoning": "1-2 sentence insight building on rule-based analysis",
      "sentiment": "BULLISH|BEARISH|NEUTRAL",
      "keyRisk": "specific risk",
      "keyOpportunity": "specific opportunity"
    }
  ]
}

Include ALL stocks. Be direct, specific to Indian markets, avoid generic advice.`;

    const text = await callGroq(prompt, apiKey, 4096);
    if (!text) return null;

    let parsed: GroqPortfolioInsight;
    try {
      parsed = JSON.parse(text) as GroqPortfolioInsight;
    } catch {
      return null;
    }

    if (!parsed.overallSentiment || !Array.isArray(parsed.stockInsights)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function analyzeNewsWithGroq(
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
  "aiAnalysis": "2-3 sentences analyzing what these headlines mean for the stock. Be specific."
}

Be concise and specific. Don't be generic.`;

    const text = await callGroq(prompt, apiKey, 512);
    if (!text) return null;

    let parsed: { sentiment: string; aiAnalysis: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      return null;
    }

    if (!parsed.aiAnalysis || typeof parsed.aiAnalysis !== 'string') return null;

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

export async function estimatePEWithGroq(
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
  "confidence": "HIGH|MED|LOW",
  "reasoning": "one sentence explaining why"
}

Base on recent earnings trends, sector averages in Indian markets, and comparable companies. Be realistic.`;

    const text = await callGroq(prompt, apiKey, 256);
    if (!text) return null;

    let parsed: { peRatio: number; confidence: string; reasoning: string };
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


export async function estimatePEBatchWithGroq(
  stocks: { symbol: string; companyName: string; sector: string; currentPrice: number }[],
  apiKey: string
): Promise<Record<string, number>> {
  if (!apiKey || stocks.length === 0) return {};

  try {
    const stockList = stocks.map(s =>
      `${s.symbol} (${s.companyName}, ${s.sector} sector, CMP ₹${s.currentPrice})`
    ).join('\n');

    const prompt = `You are an Indian equity analyst. Estimate the current PE ratio for each of these NSE-listed stocks.

STOCKS:
${stockList}

Return ONLY a JSON object with symbol as key and PE ratio as number:
{"SYMBOL1": 24.5, "SYMBOL2": 18.2, ...}

Rules:
- Use realistic PE ratios based on current (${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}) Indian market conditions
- Banks typically 10-25, IT 20-30, FMCG 40-70, Auto 20-35, Infra 20-30
- Return null for any stock you're unsure about
- No explanation, just the JSON`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'You are an Indian equity analyst. Respond ONLY with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 512,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) return {};
    const data: any = await res.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(text);

    // Filter out nulls and non-numbers
    const result: Record<string, number> = {};
    for (const [sym, pe] of Object.entries(parsed)) {
      if (typeof pe === 'number' && pe > 0 && pe < 300) {
        result[sym] = Math.round((pe as number) * 10) / 10;
      }
    }
    return result;
  } catch {
    return {};
  }
}