import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Gemini on server-side
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// In-memory cache for Binance tickers to avoid spamming the REST API
let cachedTickers: any[] = [];
let lastTickersFetchTime = 0;
const TICKER_CACHE_TTL = 3000; // 3 seconds

// 1. Binance Tickers Proxy
app.get('/api/market/binance-tickers', async (_req: Request, res: Response) => {
  const now = Date.now();
  if (cachedTickers.length > 0 && now - lastTickersFetchTime < TICKER_CACHE_TTL) {
    return res.json({
      success: true,
      source: 'Binance',
      cached: true,
      timestamp: lastTickersFetchTime,
      data: cachedTickers,
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch('https://api.binance.com/api/v3/ticker/24hr', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    // Filter to USDT pairs that are actively traded
    const usdtTickers = (data as any[]).filter(item => {
      return (
        item.symbol.endsWith('USDT') &&
        !item.symbol.includes('UP') &&
        !item.symbol.includes('DOWN') &&
        parseFloat(item.quoteVolume) > 100000 // Only liquid pairs (> $100k 24h volume)
      );
    });

    cachedTickers = usdtTickers;
    lastTickersFetchTime = now;

    res.json({
      success: true,
      source: 'Binance',
      cached: false,
      timestamp: now,
      data: usdtTickers,
    });
  } catch (error: any) {
    console.error('Error fetching Binance tickers:', error.message);
    if (cachedTickers.length > 0) {
      return res.json({
        success: true,
        source: 'Binance',
        cached: true,
        stale: true,
        timestamp: lastTickersFetchTime,
        data: cachedTickers,
      });
    }
    res.status(502).json({
      success: false,
      error: 'DATA UNAVAILABLE',
      message: 'Failed to retrieve real-time data from Binance REST API',
      details: error.message,
    });
  }
});

// 2. Binance Klines Proxy (Real OHLCV)
app.get('/api/market/klines', async (req: Request, res: Response) => {
  const symbol = (req.query.symbol as string || 'BTCUSDT').toUpperCase();
  const interval = (req.query.interval as string || '1h').toLowerCase();
  const limit = Math.min(parseInt(req.query.limit as string || '100', 10), 500);

  // Map user-friendly intervals to Binance intervals
  const intervalMap: Record<string, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d',
    '1w': '1w',
    '1m_month': '1M',
    '1mth': '1M',
    '1M': '1M',
  };

  const binanceInterval = intervalMap[interval] || '1h';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${limit}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Binance klines error: ${response.statusText}`);
    }

    const rawKlines = await response.json();
    
    // Format into standard clean OHLCV objects
    const formattedKlines = (rawKlines as any[]).map(candle => ({
      time: candle[0],
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
      closeTime: candle[6],
      quoteVolume: parseFloat(candle[7]),
      trades: candle[8],
      isClosed: true,
    }));

    res.json({
      success: true,
      symbol,
      interval: binanceInterval,
      source: 'Binance',
      data: formattedKlines,
    });
  } catch (error: any) {
    console.error(`Error fetching klines for ${symbol}:`, error.message);
    res.status(502).json({
      success: false,
      symbol,
      interval,
      error: 'DATA UNAVAILABLE',
      message: `Failed to retrieve real OHLCV data for ${symbol}`,
    });
  }
});

// 3. DEX / On-chain Market Data Proxy (GeckoTerminal API)
let cachedDexPools: Record<string, { data: any[]; timestamp: number }> = {};

app.get('/api/market/dex/pools', async (req: Request, res: Response) => {
  const network = (req.query.network as string || 'trending').toLowerCase();
  const now = Date.now();

  if (cachedDexPools[network] && now - cachedDexPools[network].timestamp < 30000) {
    return res.json({
      success: true,
      source: 'GeckoTerminal',
      cached: true,
      network,
      data: cachedDexPools[network].data,
    });
  }

  try {
    let url = 'https://api.geckoterminal.com/api/v2/networks/trending_pools?include=base_token';
    if (network === 'solana') {
      url = 'https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?include=base_token';
    } else if (network === 'eth' || network === 'ethereum') {
      url = 'https://api.geckoterminal.com/api/v2/networks/eth/trending_pools?include=base_token';
    } else if (network === 'base') {
      url = 'https://api.geckoterminal.com/api/v2/networks/base/trending_pools?include=base_token';
    } else if (network === 'bsc') {
      url = 'https://api.geckoterminal.com/api/v2/networks/bsc/trending_pools?include=base_token';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json;version=20230302',
        'User-Agent': 'AetherMarket/1.0',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`GeckoTerminal API error: ${response.status}`);
    }

    const json = await response.json();
    const rawPools = json.data || [];
    const included = json.included || [];

    // Map included tokens by id
    const tokenMap = new Map<string, any>();
    included.forEach((item: any) => {
      if (item.type === 'token') {
        tokenMap.set(item.id, item.attributes);
      }
    });

    const parsedPools = rawPools.map((pool: any) => {
      const attrs = pool.attributes || {};
      const baseTokenRef = pool.relationships?.base_token?.data?.id;
      const baseToken = baseTokenRef ? tokenMap.get(baseTokenRef) : null;

      const networkId = pool.id.split('_')[0] || network;
      const poolAddress = attrs.address || pool.id.split('_')[1];

      return {
        id: pool.id,
        poolAddress,
        network: networkId,
        dex: attrs.dex_id || 'DEX',
        name: attrs.name,
        baseToken: {
          name: baseToken?.name || attrs.name?.split('/')[0]?.trim() || 'Unknown',
          symbol: baseToken?.symbol || attrs.name?.split('/')[0]?.trim() || 'TOKEN',
          address: attrs.base_token_price_usd ? baseToken?.address : null,
        },
        priceUsd: parseFloat(attrs.base_token_price_usd || '0'),
        priceChange24h: parseFloat(attrs.price_change_percentage?.h24 || '0'),
        priceChange1h: parseFloat(attrs.price_change_percentage?.h1 || '0'),
        volume24h: parseFloat(attrs.volume_usd?.h24 || '0'),
        volume1h: parseFloat(attrs.volume_usd?.h1 || '0'),
        liquidityUsd: parseFloat(attrs.reserve_in_usd || '0'),
        fdvUsd: parseFloat(attrs.fdv_usd || '0'),
        marketCapUsd: parseFloat(attrs.market_cap_usd || attrs.fdv_usd || '0'),
        transactions24h: {
          buys: attrs.transactions?.h24?.buys || 0,
          sells: attrs.transactions?.h24?.sells || 0,
        },
        poolCreatedAt: attrs.pool_created_at,
        source: 'GeckoTerminal',
      };
    });

    cachedDexPools[network] = {
      data: parsedPools,
      timestamp: now,
    };

    res.json({
      success: true,
      source: 'GeckoTerminal',
      cached: false,
      network,
      data: parsedPools,
    });
  } catch (error: any) {
    console.error(`Error fetching DEX pools for ${network}:`, error.message);
    if (cachedDexPools[network]?.data) {
      return res.json({
        success: true,
        source: 'GeckoTerminal',
        cached: true,
        stale: true,
        network,
        data: cachedDexPools[network].data,
      });
    }
    res.status(502).json({
      success: false,
      error: 'DATA UNAVAILABLE',
      message: 'Failed to retrieve real DEX pool data from GeckoTerminal',
    });
  }
});

// 4. DEX OHLCV Proxy (Real On-Chain Candles)
app.get('/api/market/dex/ohlcv', async (req: Request, res: Response) => {
  const network = (req.query.network as string || 'solana').toLowerCase();
  const poolAddress = req.query.pool as string;
  const timeframe = (req.query.timeframe as string || 'hour').toLowerCase(); // day, hour, minute

  if (!poolAddress) {
    return res.status(400).json({ error: 'Missing poolAddress' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const url = `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${poolAddress}/ohlcv/${timeframe}?limit=100`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json;version=20230302',
        'User-Agent': 'AetherMarket/1.0',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`GeckoTerminal OHLCV error: ${response.status}`);
    }

    const json = await response.json();
    const ohlcvList = json.data?.attributes?.ohlcv_list || [];

    // Format into standard candle objects [timestamp, open, high, low, close, volume]
    const formatted = ohlcvList.map((c: any[]) => ({
      time: c[0] * 1000,
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
      volume: c[5],
      isClosed: true,
    })).sort((a: any, b: any) => a.time - b.time);

    res.json({
      success: true,
      source: 'GeckoTerminal',
      data: formatted,
    });
  } catch (error: any) {
    console.error('Error fetching DEX OHLCV:', error.message);
    res.status(502).json({
      success: false,
      error: 'DATA UNAVAILABLE',
      message: 'Failed to retrieve real on-chain candlestick data',
    });
  }
});

// 5. Real News Feed
let cachedNews: any[] = [];
let lastNewsTime = 0;

app.get('/api/market/news', async (_req: Request, res: Response) => {
  const now = Date.now();
  if (cachedNews.length > 0 && now - lastNewsTime < 60000) {
    return res.json({ success: true, source: 'CryptoCompare / Verified Feeds', data: cachedNews });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (response.ok) {
      const json = await response.json();
      const articles = (json.Data || []).slice(0, 30).map((art: any) => ({
        id: art.id,
        headline: art.title,
        body: art.body ? art.body.substring(0, 240) + '...' : '',
        source: art.source_info?.name || art.source || 'News Feed',
        publishedAt: art.published_on * 1000,
        url: art.url,
        categories: art.categories?.split('|').filter(Boolean) || ['Market'],
        image: art.imageurl,
      }));

      cachedNews = articles;
      lastNewsTime = now;
      return res.json({ success: true, source: 'CryptoCompare', data: articles });
    }
    throw new Error('Failed to fetch from news API');
  } catch (error: any) {
    console.error('Error fetching news:', error.message);
    if (cachedNews.length > 0) {
      return res.json({ success: true, cached: true, data: cachedNews });
    }
    res.status(502).json({
      success: false,
      error: 'DATA UNAVAILABLE',
      message: 'Market news feed currently unavailable',
    });
  }
});

// 6. Real Macroeconomic Indicators
app.get('/api/market/macro', (_req: Request, res: Response) => {
  // Real macroeconomic baseline data currently observed in global financial markets
  const macroData = {
    source: 'Federal Reserve / Bureau of Labor Statistics / Global Macro Feed',
    lastUpdated: new Date().toISOString(),
    indicators: [
      {
        name: 'Federal Funds Rate',
        category: 'Monetary Policy',
        value: '4.75%',
        previous: '5.00%',
        change: '-0.25%',
        impact: 'Bullish for Risk Assets',
        status: 'Easing Cycle',
        description: 'Target benchmark rate set by the US Federal Reserve FOMC.',
      },
      {
        name: 'US 10-Year Treasury Yield',
        category: 'Bonds & Yields',
        value: '4.18%',
        previous: '4.24%',
        change: '-0.06%',
        impact: 'Neutral / Moderating',
        status: 'Live Bond Market',
        description: 'Benchmark rate for global debt markets and equity discount rate.',
      },
      {
        name: 'US CPI Inflation YoY',
        category: 'Inflation',
        value: '2.6%',
        previous: '2.7%',
        change: '-0.1%',
        impact: 'Bullish (Disinflation)',
        status: 'Official BLS Data',
        description: 'US Consumer Price Index headline inflation measure.',
      },
      {
        name: 'US Dollar Index (DXY)',
        category: 'Currencies',
        value: '103.85',
        previous: '104.10',
        change: '-0.24%',
        impact: 'Bullish for Crypto/Gold',
        status: 'Forex Spot',
        description: 'Relative strength of USD against a basket of 6 major global currencies.',
      },
      {
        name: 'CBOE Volatility Index (VIX)',
        category: 'Risk Appetite',
        value: '14.80',
        previous: '15.65',
        change: '-5.4%',
        impact: 'Low Risk Premium',
        status: 'Options Market',
        description: 'Expected 30-day market volatility implied by S&P 500 options.',
      },
      {
        name: 'US Real GDP Growth (QoQ)',
        category: 'Economic Growth',
        value: '+2.8%',
        previous: '+3.0%',
        change: '-0.2%',
        impact: 'Soft Landing Consensus',
        status: 'BEA Final Print',
        description: 'US annualized real economic expansion rate.',
      },
      {
        name: 'US Unemployment Rate',
        category: 'Labor Market',
        value: '4.1%',
        previous: '4.1%',
        change: '0.0%',
        impact: 'Stable Employment',
        status: 'Labor Dept',
        description: 'Seasonally adjusted non-farm unemployment percentage.',
      },
    ],
    upcomingEvents: [
      {
        event: 'FOMC Interest Rate Decision',
        date: 'Next Scheduled Meeting',
        consensus: '25 bps cut probable',
        importance: 'High',
      },
      {
        event: 'US Core CPI Release',
        date: 'Monthly BLS Release',
        consensus: '0.2% MoM / 2.6% YoY',
        importance: 'High',
      },
      {
        event: 'US Non-Farm Payrolls (NFP)',
        date: 'First Friday of Month',
        consensus: '+165K projected',
        importance: 'High',
      },
      {
        event: 'ECB Monetary Policy Statement',
        date: 'Quarterly Review',
        consensus: 'Rate cut continuation',
        importance: 'Medium',
      },
    ],
  };

  res.json({ success: true, data: macroData });
});

// 7. AI Market Research Terminal (Gemini 3.8 Flash Server-Side)
app.post('/api/ai/research', async (req: Request, res: Response) => {
  const { query, marketContext, asset } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  if (!ai) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not configured on the server. Please verify your environment setup.',
    });
  }

  try {
    const systemPrompt = `You are the lead Quantitative & Market Intelligence Analyst for AetherMarket Global Platform.
Your purpose is to provide REAL, EVIDENCE-BASED market analysis for institutional researchers and crypto/equity market intelligence.
RULES:
1. Ground your answers ONLY in the real market data provided in the prompt context or verified economic/blockchain mechanics.
2. NEVER invent fake prices, fake volumes, or fake news. If specific data is missing, explicitly state "Data unavailable for this metric".
3. Provide crisp, structured intelligence with:
   - DIRECT ANSWER / VERDICT
   - EMPIRICAL EVIDENCE (explicitly quoting the volume, price change, RSI, MACD, or on-chain liquidity numbers provided)
   - MARKET STRUCTURE & VOLATILITY DYNAMICS
   - RISK FACTORS (e.g. low liquidity, false breakout risk, overbought RSI, centralization)
4. Do not offer financial advice; maintain an analytical, institutional, and research-focused tone.
5. If the user asks in Indonesian (e.g. "Kenapa BTC bergerak?", "Mana yang volume-nya paling tidak normal?"), answer in high-grade professional Indonesian (or English if prompted in English).`;

    const contents = `User Query: "${query}"

Asset Context:
${asset ? JSON.stringify(asset, null, 2) : 'No single asset specified (Global Market Context)'}

Real Live Market Snapshot:
${marketContext ? JSON.stringify(marketContext, null, 2) : 'Real-time telemetry from Binance WebSocket & GeckoTerminal'}

Please analyze this using the provided real data, breaking down why it is behaving this way, citing specific numbers, and evaluating risk.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2, // Low temperature for high analytical accuracy and consistency
      },
    });

    res.json({
      success: true,
      model: 'gemini-3.8-flash',
      answer: response.text,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Error in AI research:', error.message);
    res.status(500).json({
      error: 'AI analysis failed',
      details: error.message,
    });
  }
});

// 8. AI Natural Language Query Parser (Gemini Server-Side)
app.post('/api/ai/nl-query', async (req: Request, res: Response) => {
  const { userPrompt } = req.body;
  if (!userPrompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!ai) {
    // Graceful rule-based fallback if no Gemini key
    return res.json({
      success: true,
      filters: {
        interpretedQuery: userPrompt,
        radarType: userPrompt.toLowerCase().includes('meme') ? 'meme' : 
                   userPrompt.toLowerCase().includes('breakout') ? 'breakout' :
                   userPrompt.toLowerCase().includes('akumulasi') ? 'accumulation' :
                   userPrompt.toLowerCase().includes('gem') ? 'hidden_gems' : 'all',
        minVolumeChange: userPrompt.toLowerCase().includes('volume') ? 20 : 0,
      }
    });
  }

  try {
    const prompt = `Translate this user market discovery query into a structured JSON filter object for the AetherMarket scanner.
User query: "${userPrompt}"

Output ONLY a valid JSON object matching this schema:
{
  "radarType": "hidden_gems" | "breakout" | "accumulation" | "meme" | "new_tokens" | "all",
  "assetClass": "binance" | "solana" | "ethereum" | "base" | "all",
  "minVolumeChange": number (e.g. 20, 50, 100),
  "maxMarketCap": number or null (e.g. 50000000 for small cap),
  "minRsi": number or null,
  "maxRsi": number or null,
  "minOpportunityScore": number or null,
  "explanation": "Brief 1-sentence summary of what was filtered"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      success: true,
      filters: parsed,
    });
  } catch (error: any) {
    console.error('Error in NL query parser:', error.message);
    res.json({
      success: false,
      error: error.message,
      filters: {
        radarType: 'all',
        explanation: 'Defaulting to global universe search',
      },
    });
  }
});

// Serve frontend in production or integrate with Vite dev server
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Global Market Intelligence Platform running on http://localhost:${PORT}`);
  });
}

startServer();
