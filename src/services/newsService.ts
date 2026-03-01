import axios from 'axios';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

export interface NewsArticle {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface FormattedNewsArticle {
  id: number;
  title: string;
  summary: string;
  source: string;
  imageUrl: string;
  articleUrl: string;
  publishedAt: string;
  relatedSymbols: string[];
  category: string;
  timeAgo: string;
}



const getTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp * 1000;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days}d ago`;
  } else {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
};

const formatArticle = (article: NewsArticle): FormattedNewsArticle => {
  return {
    id: article.id,
    title: article.headline,
    summary: article.summary,
    source: article.source,
    imageUrl: article.image || '',
    articleUrl: article.url,
    publishedAt: new Date(article.datetime * 1000).toISOString(),
    relatedSymbols: article.related ? article.related.split(',').map(s => s.trim()) : [],
    category: article.category,
    timeAgo: getTimeAgo(article.datetime),
  };
};

export const newsService = {
  // Get general market news
  async getMarketNews(category: string = 'general'): Promise<FormattedNewsArticle[]> {
    try {
      const response = await axios.get(`${FINNHUB_BASE_URL}/news`, {
        params: {
          category,
          token: FINNHUB_API_KEY,
        },
      });

      const articles: NewsArticle[] = response.data;
      
      // and limit to latest 20 articles
      return articles
        .filter(article => article.image && article.headline)
        .slice(0, 20)
        .map(formatArticle);
    } catch (error) {
      console.error('Error fetching market news:', error);
      throw new Error('Failed to fetch market news');
    }
  },

  // Get company-specific news
  async getCompanyNews(
    symbol: string,
    fromDate?: string,
    toDate?: string
  ): Promise<FormattedNewsArticle[]> {
    try {
      // Default to last 7 days if dates not provided
      const to = toDate || new Date().toISOString().split('T')[0];
      const from = fromDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const response = await axios.get(`${FINNHUB_BASE_URL}/company-news`, {
        params: {
          symbol: symbol.toUpperCase(),
          from,
          to,
          token: FINNHUB_API_KEY,
        },
      });

      const articles: NewsArticle[] = response.data;

      return articles
        .filter(article => article.headline)
        .slice(0, 15)
        .map(formatArticle);
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error);
      throw new Error(`Failed to fetch news for ${symbol}`);
    }
  },
};

export default newsService;