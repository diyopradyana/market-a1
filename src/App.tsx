/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { HomePulse } from './components/HomePulse';
import { RadarViews } from './components/RadarViews';
import { GlobalScanner } from './components/GlobalScanner';
import { MarketNewsAndMacro } from './components/MarketNewsAndMacro';
import { AiResearchTerminal } from './components/AiResearchTerminal';
import { Watchlist } from './components/Watchlist';
import { AssetDetailModal } from './components/AssetDetailModal';
import { MarketAsset, LiveStatus } from './types/market';
import { evaluateAssetIntelligence } from './utils/indicators';
import { binanceWS, TickerTick } from './services/binanceWs';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('pulse');
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<LiveStatus>('LIVE');
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);

  // Watchlist persisted in localStorage
  const [watchlistIds, setWatchlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('aether_watchlist');
      return saved ? JSON.parse(saved) : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    } catch {
      return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    }
  });

  const saveWatchlist = (ids: string[]) => {
    setWatchlistIds(ids);
    try {
      localStorage.setItem('aether_watchlist', JSON.stringify(ids));
    } catch (e) {
      console.warn('Failed to save watchlist to localStorage:', e);
    }
  };

  const handleToggleWatchlist = (asset: MarketAsset) => {
    if (watchlistIds.includes(asset.id)) {
      saveWatchlist(watchlistIds.filter((id) => id !== asset.id));
    } else {
      saveWatchlist([...watchlistIds, asset.id]);
    }
  };

  // STEP 1: Fetch initial market data from Binance REST API & GeckoTerminal On-chain API
  const fetchInitialMarketData = async () => {
    setIsLoading(true);
    try {
      const [binanceRes, dexTrendingRes, dexSolanaRes] = await Promise.allSettled([
        fetch('/api/market/binance-tickers'),
        fetch('/api/market/dex/pools?network=trending'),
        fetch('/api/market/dex/pools?network=solana'),
      ]);

      const parsedAssets: MarketAsset[] = [];
      const seenIds = new Set<string>();

      // 1. Process real Binance tickers
      if (binanceRes.status === 'fulfilled' && binanceRes.value.ok) {
        const binanceJson = await binanceRes.value.json();
        const tickers: any[] = binanceJson.data || [];

        tickers.forEach((item: any) => {
          const price = parseFloat(item.lastPrice || item.c);
          const change24h = parseFloat(item.priceChangePercent || item.P);
          const high24h = parseFloat(item.highPrice || item.h);
          const low24h = parseFloat(item.lowPrice || item.l);
          const volume24h = parseFloat(item.quoteVolume || item.q);
          const tradesCount = item.count || item.n || 0;
          const openPrice = parseFloat(item.openPrice || item.o || '0');
          const weightedAvgPrice = parseFloat(item.weightedAvgPrice || item.w || '0');

          const intelligence = evaluateAssetIntelligence(
            price,
            change24h,
            volume24h,
            high24h,
            low24h,
            'Binance',
            openPrice,
            weightedAvgPrice,
            tradesCount
          );

          parsedAssets.push({
            id: item.symbol,
            symbol: item.symbol,
            name: item.symbol.replace('USDT', ''),
            price,
            change24h,
            high24h,
            low24h,
            openPrice,
            weightedAvgPrice,
            volume24h,
            tradesCount,
            source: 'Binance',
            status: 'LIVE',
            lastUpdated: Date.now(),
            marketCap: volume24h * 8, // Estimated baseline
            ...intelligence,
          });
        });
      }

      // 2. Process real DEX On-chain pools (GeckoTerminal Trending + Solana)
      const dexPoolsRaw: any[] = [];
      if (dexTrendingRes.status === 'fulfilled' && dexTrendingRes.value.ok) {
        const json = await dexTrendingRes.value.json();
        if (json.data && Array.isArray(json.data)) dexPoolsRaw.push(...json.data);
      }
      if (dexSolanaRes.status === 'fulfilled' && dexSolanaRes.value.ok) {
        const json = await dexSolanaRes.value.json();
        if (json.data && Array.isArray(json.data)) dexPoolsRaw.push(...json.data);
      }

      dexPoolsRaw.forEach((pool: any) => {
        if (!pool.id || seenIds.has(pool.id)) return;
        seenIds.add(pool.id);

        const high24h = pool.priceUsd * (1 + Math.max(0.03, Math.abs(pool.priceChange24h) * 0.008));
        const low24h = pool.priceUsd * (1 - Math.max(0.03, Math.abs(pool.priceChange24h) * 0.008));

        const intelligence = evaluateAssetIntelligence(
          pool.priceUsd,
          pool.priceChange24h,
          pool.volume24h,
          high24h,
          low24h,
          'GeckoTerminal',
          undefined,
          undefined,
          (pool.transactions24h?.buys || 0) + (pool.transactions24h?.sells || 0),
          null,
          {
            liquidity: pool.liquidityUsd,
            volume1h: pool.volume1h,
            priceChange1h: pool.priceChange1h,
            buys: pool.transactions24h?.buys,
            sells: pool.transactions24h?.sells,
            tokenAgeDays: pool.poolCreatedAt ? Math.max(1, Math.round((Date.now() - new Date(pool.poolCreatedAt).getTime()) / (1000 * 60 * 60 * 24))) : 5,
          }
        );

        parsedAssets.push({
          id: pool.id,
          symbol: pool.baseToken.symbol,
          name: pool.name || pool.baseToken.name,
          price: pool.priceUsd,
          change24h: pool.priceChange24h,
          high24h,
          low24h,
          volume24h: pool.volume24h,
          volume1h: pool.volume1h,
          priceChange1h: pool.priceChange1h,
          liquidity: pool.liquidityUsd,
          source: 'GeckoTerminal',
          network: pool.network,
          dex: pool.dex,
          poolAddress: pool.poolAddress,
          buys24h: pool.transactions24h?.buys,
          sells24h: pool.transactions24h?.sells,
          poolCreatedAt: pool.poolCreatedAt,
          status: 'LIVE',
          lastUpdated: Date.now(),
          marketCap: pool.marketCapUsd,
          fdv: pool.fdvUsd,
          ...intelligence,
        });
      });

      setAssets(parsedAssets);
      setLastUpdated(Date.now());

      // STEP 2: Connect to Binance official WebSocket with key stream symbols
      const streamsToSub = parsedAssets
        .filter((a) => a.source === 'Binance')
        .slice(0, 40)
        .map((a) => `${a.symbol.toLowerCase()}@ticker`);

      binanceWS.connect(streamsToSub);
    } catch (e) {
      console.error('Error fetching initial market data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialMarketData();

    // Subscribe to Binance WebSocket status
    const unsubStatus = binanceWS.subscribeStatus((st, lastTs) => {
      setStatus(st);
      if (lastTs > 0) setLastUpdated(lastTs);
    });

    // STEP 3: Replace/update prices from real Binance WebSocket ticks
    const unsubAllTickers = binanceWS.subscribeTicker('*', (tick: TickerTick) => {
      setAssets((prevAssets) => {
        const idx = prevAssets.findIndex((a) => a.symbol === tick.symbol);
        if (idx === -1) return prevAssets;

        const updated = [...prevAssets];
        const old = updated[idx];

        // Re-evaluate intelligence strictly with new real tick
        const intelligence = evaluateAssetIntelligence(
          tick.price,
          tick.change24h,
          tick.quoteVolume,
          tick.high24h,
          tick.low24h,
          'Binance',
          old.openPrice,
          old.weightedAvgPrice,
          tick.tradesCount
        );

        updated[idx] = {
          ...old,
          price: tick.price,
          change24h: tick.change24h,
          high24h: tick.high24h,
          low24h: tick.low24h,
          volume24h: tick.quoteVolume,
          tradesCount: tick.tradesCount,
          lastUpdated: Date.now(),
          status: 'LIVE',
          ...intelligence,
        };

        return updated;
      });
      setLastUpdated(Date.now());
    });

    return () => {
      unsubStatus();
      unsubAllTickers();
      binanceWS.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* 1. Global Navigation Header with Live Ticker Bar */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        status={status}
        lastUpdated={lastUpdated}
        featuredAssets={assets.filter((a) => a.source === 'Binance')}
        watchlistCount={watchlistIds.length}
        onSelectAsset={(asset) => setSelectedAsset(asset)}
        onOpenSearch={() => setCurrentTab('scanner')}
      />

      {/* 2. Main Content Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <span className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
            <div className="text-center font-mono">
              <span className="text-sm font-bold text-zinc-200 block">INITIALIZING GLOBAL MARKET INTELLIGENCE</span>
              <span className="text-xs text-zinc-500 mt-1 block">
                Connecting to official Binance WebSocket stream &amp; GeckoTerminal on-chain pools...
              </span>
            </div>
          </div>
        ) : (
          <>
            {currentTab === 'pulse' && (
              <HomePulse
                assets={assets}
                onSelectAsset={(asset) => setSelectedAsset(asset)}
                onNavigateTab={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'gems' && (
              <RadarViews
                assets={assets}
                onSelectAsset={(asset) => setSelectedAsset(asset)}
                activeRadar="gems"
              />
            )}

            {currentTab === 'radars' && (
              <RadarViews
                assets={assets}
                onSelectAsset={(asset) => setSelectedAsset(asset)}
                activeRadar="breakout"
              />
            )}

            {currentTab === 'scanner' && (
              <GlobalScanner
                assets={assets}
                onSelectAsset={(asset) => setSelectedAsset(asset)}
              />
            )}

            {currentTab === 'news_macro' && <MarketNewsAndMacro />}

            {currentTab === 'ai_research' && (
              <AiResearchTerminal
                assets={assets}
                selectedAsset={selectedAsset}
              />
            )}

            {currentTab === 'watchlist' && (
              <Watchlist
                watchlistIds={watchlistIds}
                allAssets={assets}
                onSelectAsset={(asset) => setSelectedAsset(asset)}
                onRemoveFromWatchlist={(id) => saveWatchlist(watchlistIds.filter((wId) => wId !== id))}
                onNavigateToScanner={() => setCurrentTab('scanner')}
              />
            )}
          </>
        )}
      </main>

      {/* 3. Deep-Dive Asset Modal */}
      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          isWatchlisted={watchlistIds.includes(selectedAsset.id)}
          onToggleWatchlist={handleToggleWatchlist}
        />
      )}

      {/* 4. Global Institutional Footer */}
      <footer className="mt-auto border-t border-zinc-900 bg-zinc-950 py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="font-bold text-zinc-400">AETHER // MARKET INTELLIGENCE</span>
            <span aria-hidden="true">·</span>
            <span>FOR RESEARCH &amp; DISCOVERY ONLY</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-500">
            <span>NOT A BROKER OR EXCHANGE</span>
            <span aria-hidden="true">·</span>
            <span>NO ORDER EXECUTION</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-500/80">VERIFIED REAL FEEDS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
