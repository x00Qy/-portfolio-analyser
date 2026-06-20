import chalk from 'chalk';
import axios from 'axios';

export interface NewsItem {
  headline: string;
  source: string;
  publishedAt: string;
  url: string;
}

export interface StockNews {
  symbol: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED' | 'UNKNOWN';
  headlines: NewsItem[];
  aiAnalysis: string;
}

const NEWS_API_URL = 'https://newsapi.org/v2/everything';

function cleanSymbol(symbol: string): string {
  return symbol.replace(/\.(NS|BO)$/i, '').toUpperCase();
}

export async function fetchNewsForStocks(
  symbols: string[],
  apiKey: string | undefined
): Promise<Map<string, NewsItem[]>> {
  const newsMap = new Map<string, NewsItem[]>();

  if (!apiKey || apiKey.length < 10) {
    console.log(chalk.gray('  ℹ No NEWS_API_KEY found — skipping news fetch'));
    return newsMap;
  }

  for (const symbol of symbols) {
    const cleanSym = cleanSymbol(symbol);
    try {
      const lowerSym = cleanSym.toLowerCase();
      const companyName = symbol.toLowerCase();

      const res = await axios.get(NEWS_API_URL, {
        params: {
          q: `${lowerSym} Indian stock market NSE`,
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: 10,
          apiKey: apiKey,
        },
        timeout: 5000,
      });

      const articles = res.data?.articles || [];

      const relevantArticles = articles.filter((a: any) => {
        const title = (a.title || '').toLowerCase();
        const description = (a.description || '').toLowerCase();
        return title.includes(lowerSym) || description.includes(lowerSym) ||
               title.includes(companyName) || description.includes(companyName);
      });

      const items: NewsItem[] = relevantArticles.map((a: any) => ({
        headline: a.title || '',
        source: a.source?.name || 'Unknown',
        publishedAt: a.publishedAt || '',
        url: a.url || '',
      }));

      // Only log stocks that actually have news — skip the "no news" noise
      if (items.length > 0) {
        console.log(chalk.gray(`    ✓ ${cleanSym}: ${items.length} news ${items.length === 1 ? 'article' : 'articles'}`));
      }

      newsMap.set(symbol, items);
    } catch {
      // Silent fail — news is optional, don't spam errors
      newsMap.set(symbol, []);
    }
  }

  return newsMap;
}