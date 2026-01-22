import { OHLC } from '../types';

/**
 * Fetches real historical data from Yahoo Finance Chart API via a CORS proxy.
 * This mimics what libraries like yfinance do in Python, but adapted for the browser.
 */
async function fetchRealData(symbol: string, startDateStr: string): Promise<OHLC[] | null> {
  try {
    // Yahoo Finance API expects Unix timestamps (seconds)
    // We request 5 years of data to ensure we cover the start date
    // interval=1d is daily data
    const baseUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5y`;
    
    // Use a public CORS proxy to bypass browser restrictions
    // api.allorigins.win is a reliable free proxy
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(baseUrl)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) {
      console.warn("Yahoo API request failed");
      return null;
    }

    const json = await response.json();
    const result = json.chart.result?.[0];

    if (!result) {
      return null;
    }

    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];
    
    // Validate data integrity
    if (!timestamps || !quote || !quote.open) {
      return null;
    }

    const data: OHLC[] = [];
    const startDateTimestamp = new Date(startDateStr).getTime() / 1000;

    for (let i = 0; i < timestamps.length; i++) {
      // Filter out data before the requested start date
      if (timestamps[i] < startDateTimestamp) continue;

      // Skip invalid entries (nulls happen in Yahoo data sometimes)
      if (quote.open[i] === null || quote.close[i] === null) continue;

      const dateObj = new Date(timestamps[i] * 1000);
      const dateStr = dateObj.toISOString().split('T')[0];

      data.push({
        date: dateStr,
        open: Number(quote.open[i].toFixed(2)),
        high: Number(quote.high[i].toFixed(2)),
        low: Number(quote.low[i].toFixed(2)),
        close: Number(quote.close[i].toFixed(2)),
        volume: quote.volume[i] || 0,
      });
    }

    return data.length > 0 ? data : null;

  } catch (error) {
    console.error("Error fetching real market data:", error);
    return null;
  }
}

/**
 * Generates deterministic mock stock data using sine waves and random noise.
 * Used as a fallback when API fails or for offline testing.
 */
function generateMockData(symbol: string, startDateStr: string): OHLC[] {
  const data: OHLC[] = [];
  let currentDate = new Date(startDateStr);
  
  if (isNaN(currentDate.getTime())) {
    currentDate = new Date('2023-01-01');
  }

  let price = 150.00; // Starting price
  const daysToGenerate = 365; // Generate 1 year of mock data

  for (let i = 0; i < daysToGenerate; i++) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
      i--; 
      continue;
    }

    const changePercent = (Math.random() - 0.48) * 0.04;
    const volatility = price * 0.02;

    const open = price;
    const close = price * (1 + changePercent);
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;

    data.push({
      date: currentDate.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000) + 500000,
    });

    price = close;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return data;
}

export interface MarketDataResult {
  data: OHLC[];
  isRealData: boolean;
}

export const fetchMarketData = async (symbol: string, startDateStr: string): Promise<MarketDataResult> => {
  // 1. Try to fetch real data first
  const realData = await fetchRealData(symbol, startDateStr);
  
  if (realData) {
    return { data: realData, isRealData: true };
  }

  // 2. Fallback to mock data
  return { 
    data: generateMockData(symbol, startDateStr), 
    isRealData: false 
  };
};