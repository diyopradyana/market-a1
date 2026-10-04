import React, { useState, useEffect, useRef } from 'react';
import { MarketAsset, Candle, TechnicalIndicators } from '../types/market';
import { CandlestickChart } from './CandlestickChart';
import { EvidencePanel } from './EvidencePanel';
import { computeAllIndicators } from '../utils/indicators';
import { binanceWS, KlineTick, TradeTick } from '../services/binanceWs';
import {
  X,
  Bookmark,
  BookmarkCheck,
  Radio,
  TrendingUp,
  Activity,
  Layers,
  ShieldAlert,
  Bot,
  ExternalLink,
  ChevronRight,
  Database,
  Share2,
} from 'lucide-react';

interface AssetDetailModalProps {
  asset: MarketAsset;
  onClose: () => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (asset: MarketAsset) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  asset,
  onClose,
  isWatchlisted,
  onToggleWatchlist,
}) => {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [livePrice, setLivePrice] = useState<number>(asset.price);
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [status, setStatus] = useState<string>('LIVE');
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [activeTab, setActiveTab] = useState<'chart' | 'technical' | 'evidence' | 'onchain' | 'ai'>('chart');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Fetch real OHLCV data for this specific asset
  const fetchCandles = async (tf: string) => {
    try {
      if (asset.source === 'Binance') {
        const res = await fetch(`/api/market/klines?symbol=${asset.symbol}&interval=${tf}&limit=100`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            setCandles(json.data);
            const computed = computeAllIndicators(json.data);
            setIndicators(computed);
            setLastUpdated(Date.now());
          }
        }
      } else if (asset.poolAddress) {
        // DEX On-chain pool
        const gtTimeframe = tf.includes('d') ? 'day' : tf.includes('m') ? 'minute' : 'hour';
        const res = await fetch(`/api/market/dex/ohlcv?network=${asset.network || 'solana'}&pool=${asset.poolAddress}&timeframe=${gtTimeframe}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            setCandles(json.data);
            const computed = computeAllIndicators(json.data);
            setIndicators(computed);
            setLastUpdated(Date.now());
          }
        }
      }
    } catch (err) {
      console.error(`Failed to fetch real OHLCV for ${asset.symbol}:`, err);
    }
  };

  // Initial fetch on mount or symbol/timeframe change
  useEffect(() => {
    fetchCandles(timeframe);
  }, [asset.symbol, asset.poolAddress, timeframe]);

  // Connect to live Binance WebSocket for active ticker, klines and trades
  useEffect(() => {
    if (asset.source !== 'Binance') return;

    // 1. Subscribe to 24h ticker for live price
    const unsubTicker = binanceWS.subscribeTicker(asset.symbol, (tick) => {
      setLivePrice(tick.price);
      setLastUpdated(Date.now());
      setStatus('LIVE');
    });

    // 2. Subscribe to klines for updating the active candle in real-time
    const unsubKline = binanceWS.subscribeKline(asset.symbol, timeframe, (klineTick: KlineTick) => {
      setCandles((prevCandles) => {
        if (!prevCandles || prevCandles.length === 0) return prevCandles;
        const lastCandle = prevCandles[prevCandles.length - 1];

        // If the candle time matches, update the existing active candle
        if (lastCandle.time === klineTick.time) {
          const updated = [...prevCandles];
          updated[updated.length - 1] = {
            ...lastCandle,
            high: Math.max(lastCandle.high, klineTick.high),
            low: Math.min(lastCandle.low, klineTick.low),
            close: klineTick.close,
            volume: klineTick.volume,
            isClosed: klineTick.isClosed,
          };
          return updated;
        } else if (klineTick.time > lastCandle.time) {
          // A new candle has begun!
          const newCandle: Candle = {
            time: klineTick.time,
            open: klineTick.open,
            high: klineTick.high,
            low: klineTick.low,
            close: klineTick.close,
            volume: klineTick.volume,
            isClosed: klineTick.isClosed,
          };
          return [...prevCandles.slice(1), newCandle];
        }
        return prevCandles;
      });
      setLastUpdated(Date.now());
    });

    // 3. Status monitor
    const unsubStatus = binanceWS.subscribeStatus((st) => {
      setStatus(st);
    });

    return () => {
      unsubTicker();
      unsubKline();
      unsubStatus();
    };
  }, [asset.symbol, asset.source, timeframe]);

  // Handle AI analysis query for this asset
  const handleAskAI = async (queryText?: string) => {
    const q = queryText || aiQuestion;
    if (!q.trim()) return;

    setIsAiLoading(true);
    setAiAnswer(null);

    try {
      const response = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          asset: {
            symbol: asset.symbol,
            name: asset.name,
            price: livePrice,
            change24h: asset.change24h,
            volume24h: asset.volume24h,
            source: asset.source,
            ranking: asset.ranking,
            risk: asset.risk,
            indicators: indicators,
            liquidity: asset.liquidity,
            evidence: asset.evidence,
          },
        }),
      });

      if (response.ok) {
        const json = await response.json();
        setAiAnswer(json.answer);
      } else {
        setAiAnswer('AI analysis service currently unavailable.');
      }
    } catch (e) {
      setAiAnswer('Failed to communicate with AI research server.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const isBullish = asset.change24h >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-zinc-900/60 border-b border-zinc-800">
          {/* Left: Asset info, live status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-sm font-mono text-zinc-100">
              {asset.symbol.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-zinc-100">
                  {asset.symbol.replace('USDT', '')}
                </h2>
                <span className="text-xs font-mono text-zinc-400">/ USDT</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {asset.source === 'Binance' ? 'Binance Spot' : `${asset.network?.toUpperCase()} DEX`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                <span>{asset.name}</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1">
                  <Radio className={`w-3 h-3 ${status === 'LIVE' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
                  <span className={status === 'LIVE' ? 'text-emerald-400' : 'text-amber-400'}>{status}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Live Price & Actions */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col text-right font-mono">
              <span className="text-xl font-bold text-zinc-100">
                ${livePrice >= 1000 ? livePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : livePrice.toPrecision(5)}
              </span>
              <span className={`text-xs font-semibold ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isBullish ? '+' : ''}{asset.change24h.toFixed(2)}% (24H)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleWatchlist(asset)}
                title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
                className={`p-2 rounded-lg border transition-colors ${
                  isWatchlisted
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                {isWatchlisted ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 py-2 bg-zinc-950 border-b border-zinc-850 overflow-x-auto scrollbar-none">
          {[
            { id: 'chart', label: 'Interactive Candlestick Chart' },
            { id: 'evidence', label: 'Evidence & Risk Panel' },
            { id: 'technical', label: 'Calculated Technicals' },
            { id: 'onchain', label: asset.source === 'Binance' ? 'Market Statistics' : 'On-Chain Pool' },
            { id: 'ai', label: 'AI Intelligence Deep Dive' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Main Candlestick Chart Pane */}
          {activeTab === 'chart' && (
            <div className="flex flex-col gap-6">
              <CandlestickChart
                symbol={asset.symbol}
                candles={candles}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                livePrice={livePrice}
                source={asset.source}
                status={status}
                lastUpdated={lastUpdated}
                indicators={indicators}
              />

              {/* 24h Market Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl font-mono">
                  <span className="text-[11px] text-zinc-500 block">24H HIGH</span>
                  <span className="text-sm font-bold text-zinc-200">
                    ${asset.high24h >= 1000 ? asset.high24h.toFixed(2) : asset.high24h.toPrecision(5)}
                  </span>
                </div>
                <div className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl font-mono">
                  <span className="text-[11px] text-zinc-500 block">24H LOW</span>
                  <span className="text-sm font-bold text-zinc-200">
                    ${asset.low24h >= 1000 ? asset.low24h.toFixed(2) : asset.low24h.toPrecision(5)}
                  </span>
                </div>
                <div className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl font-mono">
                  <span className="text-[11px] text-zinc-500 block">24H TURNOVER</span>
                  <span className="text-sm font-bold text-zinc-200">
                    ${(asset.volume24h / 1_000_000).toFixed(2)}M
                  </span>
                </div>
                <div className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl font-mono">
                  <span className="text-[11px] text-zinc-500 block">
                    {asset.liquidity ? 'POOL LIQUIDITY' : 'EST. MARKET CAP'}
                  </span>
                  <span className="text-sm font-bold text-zinc-200">
                    {asset.liquidity
                      ? `$${(asset.liquidity / 1_000_000).toFixed(2)}M`
                      : asset.marketCap
                      ? `$${(asset.marketCap / 1_000_000).toFixed(1)}M`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Evidence Panel below chart */}
              <EvidencePanel asset={asset} />
            </div>
          )}

          {/* 2. Evidence & Risk Tab */}
          {activeTab === 'evidence' && (
            <div className="flex flex-col gap-6">
              <EvidencePanel asset={asset} />

              <div className="p-4 bg-zinc-900/30 border border-zinc-800/60 rounded-xl font-mono text-xs text-zinc-400 space-y-2">
                <h4 className="font-bold text-zinc-200">QUANTITATIVE VALIDATION METHODOLOGY</h4>
                <p>
                  Every score is calculated directly from live WebSocket order flows and verified OHLCV candlestick aggregates.
                  No artificial scores or simulated data are permitted. The algorithm checks for volume acceleration,
                  orderbook depth, price vs VWAP variance, and EMA alignment.
                </p>
              </div>
            </div>
          )}

          {/* 3. Technical Indicators Tab */}
          {activeTab === 'technical' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl font-mono">
                  <span className="text-[11px] text-zinc-500 block">RSI (14)</span>
                  <span className="text-xl font-bold text-zinc-100">
                    {indicators?.rsi !== null && indicators?.rsi !== undefined ? indicators.rsi : 'Computing...'}
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-1">
                    {indicators?.rsi && indicators.rsi > 70 ? 'Overbought' : indicators?.rsi && indicators.rsi < 30 ? 'Oversold' : 'Neutral / Expansion'}
                  </span>
                </div>

                <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl font-mono">
                  <span className="text-[11px] text-zinc-500 block">MACD HISTOGRAM</span>
                  <span className={`text-xl font-bold ${indicators?.macd?.histogram && indicators.macd.histogram >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {indicators?.macd ? indicators.macd.histogram.toFixed(4) : 'Computing...'}
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-1">
                    {indicators?.macd?.histogram && indicators.macd.histogram >= 0 ? 'Bullish Expansion' : 'Bearish Divergence'}
                  </span>
                </div>

                <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl font-mono">
                  <span className="text-[11px] text-zinc-500 block">EMA 20 / EMA 50</span>
                  <span className="text-sm font-bold text-cyan-400 block">
                    {indicators?.ema20 ? `$${indicators.ema20.toFixed(2)}` : 'N/A'}
                  </span>
                  <span className="text-sm font-bold text-amber-400 block mt-0.5">
                    {indicators?.ema50 ? `$${indicators.ema50.toFixed(2)}` : 'N/A'}
                  </span>
                </div>

                <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl font-mono">
                  <span className="text-[11px] text-zinc-500 block">SUPPORT / RESISTANCE</span>
                  <span className="text-sm font-bold text-rose-400 block">
                    Res: {indicators?.resistance ? `$${indicators.resistance.toFixed(2)}` : 'N/A'}
                  </span>
                  <span className="text-sm font-bold text-emerald-400 block mt-0.5">
                    Sup: {indicators?.support ? `$${indicators.support.toFixed(2)}` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Bollinger & VWAP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl font-mono">
                  <h4 className="text-xs font-bold text-zinc-300 mb-2">BOLLINGER BANDS (20, 2)</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Upper Band:</span>
                      <span className="text-purple-400 font-bold">{indicators?.bollinger?.upper ? `$${indicators.bollinger.upper.toFixed(2)}` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Middle Band (SMA 20):</span>
                      <span className="text-zinc-300 font-bold">{indicators?.bollinger?.middle ? `$${indicators.bollinger.middle.toFixed(2)}` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Lower Band:</span>
                      <span className="text-purple-400 font-bold">{indicators?.bollinger?.lower ? `$${indicators.bollinger.lower.toFixed(2)}` : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl font-mono">
                  <h4 className="text-xs font-bold text-zinc-300 mb-2">VWAP & VOLUME INTENSITY</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Session VWAP:</span>
                      <span className="text-indigo-400 font-bold">{indicators?.vwap ? `$${indicators.vwap.toFixed(2)}` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Volume Ratio vs 20-period avg:</span>
                      <span className="text-emerald-400 font-bold">{indicators?.volumeRatio ? `${indicators.volumeRatio}x` : '1.0x'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. On-chain / Market Statistics */}
          {activeTab === 'onchain' && (
            <div className="flex flex-col gap-4 font-mono text-xs">
              <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl space-y-3">
                <h4 className="font-bold text-sm text-zinc-200">ON-CHAIN & LIQUIDITY SPECIFICATIONS</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-zinc-300">
                  <div className="flex justify-between border-b border-zinc-800/60 pb-1.5">
                    <span className="text-zinc-500">Data Source:</span>
                    <span>{asset.source}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/60 pb-1.5">
                    <span className="text-zinc-500">Network / Protocol:</span>
                    <span>{asset.network || 'Binance Spot'}</span>
                  </div>
                  {asset.poolAddress && (
                    <div className="flex justify-between border-b border-zinc-800/60 pb-1.5">
                      <span className="text-zinc-500">Pool Contract:</span>
                      <span className="text-zinc-400 truncate max-w-[180px]">{asset.poolAddress}</span>
                    </div>
                  )}
                  {asset.dex && (
                    <div className="flex justify-between border-b border-zinc-800/60 pb-1.5">
                      <span className="text-zinc-500">DEX Venue:</span>
                      <span>{asset.dex}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-zinc-800/60 pb-1.5">
                    <span className="text-zinc-500">Total 24h Transactions:</span>
                    <span>{asset.buys24h && asset.sells24h ? (asset.buys24h + asset.sells24h).toLocaleString() : asset.tradesCount?.toLocaleString() || 'N/A'}</span>
                  </div>
                  {asset.buys24h !== undefined && asset.sells24h !== undefined && (
                    <div className="flex justify-between border-b border-zinc-800/60 pb-1.5">
                      <span className="text-zinc-500">Buy / Sell Count:</span>
                      <span className="text-emerald-400">{asset.buys24h} buys / {asset.sells24h} sells</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-zinc-800/60 pb-1.5">
                    <span className="text-zinc-500">24H High:</span>
                    <span>${asset.high24h >= 1000 ? asset.high24h.toFixed(2) : asset.high24h.toPrecision(5)}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/60 pb-1.5">
                    <span className="text-zinc-500">24H Low:</span>
                    <span>${asset.low24h >= 1000 ? asset.low24h.toFixed(2) : asset.low24h.toPrecision(5)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. AI Research Assistant */}
          {activeTab === 'ai' && (
            <div className="flex flex-col gap-4 font-mono">
              <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-zinc-100">
                    AI MARKET INTELLIGENCE: {asset.symbol.replace('USDT', '')}
                  </h4>
                </div>
                <p className="text-xs text-zinc-400">
                  Ask quantitative questions grounded in live telemetry, volume distribution, and price structure.
                </p>

                {/* Quick Prompts */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    `Kenapa ${asset.symbol.replace('USDT', '')} bergerak hari ini?`,
                    `Apakah ada indikasi akumulasi atau manipulasi pump?`,
                    `Validasi breakout dan level risiko terdekat`,
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setAiQuestion(preset);
                        handleAskAI(preset);
                      }}
                      className="px-2.5 py-1 text-[11px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-emerald-400 border border-zinc-800 rounded transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="text"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="Enter custom analytical research question..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/60"
                  />
                  <button
                    onClick={() => handleAskAI()}
                    disabled={isAiLoading || !aiQuestion.trim()}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-lg transition-colors"
                  >
                    {isAiLoading ? 'Analyzing...' : 'Ask AI'}
                  </button>
                </div>

                {isAiLoading && (
                  <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg text-xs text-zinc-400 flex items-center gap-2">
                    <span className="animate-spin w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full" />
                    <span>Querying Gemini 3.8 Flash with live telemetry snapshot...</span>
                  </div>
                )}

                {aiAnswer && (
                  <div className="p-4 bg-zinc-900/80 border border-emerald-500/30 rounded-lg text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    <div className="text-[10px] text-emerald-400 font-bold mb-2 pb-1 border-b border-zinc-800">
                      GEMINI QUANTITATIVE SYNTHESIS
                    </div>
                    {aiAnswer}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
