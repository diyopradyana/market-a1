import React from 'react';
import { MarketAsset } from '../types/market';
import {
  Activity,
  Sparkles,
  TrendingUp,
  Layers,
  Flame,
  ArrowUpRight,
  ShieldCheck,
  Bot,
  Zap,
  Globe,
  Radio,
  Clock,
  Compass,
} from 'lucide-react';

interface HomePulseProps {
  assets: MarketAsset[];
  onSelectAsset: (asset: MarketAsset) => void;
  onNavigateTab: (tab: string) => void;
}

export const HomePulse: React.FC<HomePulseProps> = ({
  assets,
  onSelectAsset,
  onNavigateTab,
}) => {
  // Top Opportunities sorted by opportunityScore
  const topOpportunities = [...assets]
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 6);

  // Hidden Gems: high opportunity + volume acceleration + small-to-mid cap
  const hiddenGems = assets
    .filter((a) => a.hiddenGemsStage !== null)
    .sort((a, b) => b.hiddenGemsScore - a.hiddenGemsScore)
    .slice(0, 4);

  // Early Momentum: high 24h change with solid volume
  const earlyMomentum = [...assets]
    .filter((a) => a.change24h > 2.5 && a.volume24h > 1_500_000)
    .sort((a, b) => b.change24h - a.change24h)
    .slice(0, 4);

  // Breakout Radar highlights
  const breakoutAssets = assets
    .filter((a) => a.breakoutStage !== null)
    .sort((a, b) => b.breakoutScore - a.breakoutScore)
    .slice(0, 4);

  // Accumulation highlights
  const accumulationAssets = assets
    .filter((a) => a.accumulationStage !== null)
    .sort((a, b) => b.accumulationScore - a.accumulationScore)
    .slice(0, 4);

  // Meme coins highlights
  const memeAssets = assets
    .filter(a => a.source === 'GeckoTerminal' || a.symbol.includes('PEPE') || a.symbol.includes('DOGE') || a.symbol.includes('BONK') || a.symbol.includes('WIF'))
    .slice(0, 4);

  const getRankBadgeClass = (rank: string) => {
    switch (rank) {
      case 'S+':
      case 'S':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
      case 'A+':
      case 'A':
        return 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
      case 'B':
        return 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10';
      default:
        return 'text-zinc-400 border-zinc-700 bg-zinc-800/40';
    }
  };

  return (
    <div className="flex flex-col gap-10">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-6 border-b border-zinc-850">
        <div className="flex flex-col gap-4 max-w-4xl">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full w-fit">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>REAL-TIME MARKET INTELLIGENCE · ZERO SIMULATION</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-mono text-zinc-100 uppercase leading-tight">
            FIND WHAT THE MARKET <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              HASN'T NOTICED YET.
            </span>
          </h1>

          <p className="text-sm sm:text-base font-mono text-zinc-400 max-w-2xl leading-relaxed">
            REAL-TIME MARKET INTELLIGENCE FOR DISCOVERING EMERGING OPPORTUNITIES.
            Continuous algorithmic validation powered by official Binance WebSocket feeds and on-chain DEX liquidity.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigateTab('gems')}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold font-mono text-xs rounded-xl shadow-lg shadow-emerald-500/15 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Explore Hidden Gems</span>
            </button>
            <button
              onClick={() => onNavigateTab('scanner')}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800 font-mono font-medium text-xs rounded-xl transition-all flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>Global Scanner</span>
            </button>
            <button
              onClick={() => onNavigateTab('ai_research')}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800 font-mono font-medium text-xs rounded-xl transition-all flex items-center gap-2"
            >
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>AI Market Terminal</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Top Institutional Opportunities */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-zinc-200">
              TOP OPPORTUNITIES (QUANTITATIVE RANKING)
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('scanner')}
            className="text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topOpportunities.map((asset) => {
            const isBullish = asset.change24h >= 0;
            return (
              <div
                key={asset.id}
                onClick={() => onSelectAsset(asset)}
                className="group flex flex-col p-4 bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/30 rounded-xl transition-all cursor-pointer shadow-md"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xs font-mono text-zinc-200">
                      {asset.symbol.slice(0, 3)}
                    </div>
                    <div>
                      <span className="font-bold text-sm font-mono text-zinc-100 group-hover:text-emerald-400 transition-colors">
                        {asset.symbol.replace('USDT', '')}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono block">
                        {asset.source === 'Binance' ? 'Binance Spot' : `${asset.network?.toUpperCase()} DEX`}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-bold font-mono rounded border ${getRankBadgeClass(asset.ranking)}`}>
                    Rank {asset.ranking}
                  </span>
                </div>

                <div className="flex items-baseline justify-between py-2 border-y border-zinc-900 font-mono">
                  <span className="text-base font-bold text-zinc-100">
                    ${asset.price >= 1000 ? asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : asset.price.toPrecision(5)}
                  </span>
                  <span className={`text-xs font-semibold ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isBullish ? '+' : ''}{asset.change24h.toFixed(2)}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 my-2">
                  <span>Vol: ${(asset.volume24h / 1_000_000).toFixed(1)}M</span>
                  <span className="text-zinc-500">·</span>
                  <span>Conf: {asset.confidenceScore}%</span>
                  <span className="text-zinc-500">·</span>
                  <span className="text-zinc-300 font-semibold">Opp: {asset.opportunityScore}/100</span>
                </div>

                {asset.evidence.pros.length > 0 && (
                  <div className="mt-auto pt-2 border-t border-zinc-900 text-[11px] font-mono text-emerald-400/90 truncate">
                    ✓ {asset.evidence.pros[0]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Hidden Gems & Early Momentum Split Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hidden Gems Column */}
        <div className="flex flex-col gap-3 p-5 bg-zinc-950 border border-zinc-800/80 rounded-xl">
          <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold font-mono uppercase text-zinc-200">
                HIDDEN GEMS (EARLY DISCOVERY)
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('gems')}
              className="text-[11px] font-mono text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              Open Hub →
            </button>
          </div>

          <div className="divide-y divide-zinc-900">
            {hiddenGems.map((gem) => (
              <div
                key={gem.id}
                onClick={() => onSelectAsset(gem)}
                className="py-3 flex items-center justify-between hover:bg-zinc-900/30 px-2 rounded-lg cursor-pointer transition-colors"
              >
                <div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="font-bold text-sm text-zinc-100">{gem.symbol.replace('USDT', '')}</span>
                    <span className="text-[10px] text-zinc-500">· {gem.source}</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400/90 block">
                    {gem.evidence.pros[0] || 'Volume expansion detected'}
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-sm font-bold text-zinc-200 block">
                    ${gem.price >= 1000 ? gem.price.toFixed(2) : gem.price.toPrecision(5)}
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold">
                    Score {gem.opportunityScore}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Early Momentum Column */}
        <div className="flex flex-col gap-3 p-5 bg-zinc-950 border border-zinc-800/80 rounded-xl">
          <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold font-mono uppercase text-zinc-200">
                EARLY MOMENTUM ACCELERATION
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('scanner')}
              className="text-[11px] font-mono text-zinc-400 hover:text-cyan-400 transition-colors"
            >
              Scanner →
            </button>
          </div>

          <div className="divide-y divide-zinc-900">
            {earlyMomentum.map((mom) => (
              <div
                key={mom.id}
                onClick={() => onSelectAsset(mom)}
                className="py-3 flex items-center justify-between hover:bg-zinc-900/30 px-2 rounded-lg cursor-pointer transition-colors"
              >
                <div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="font-bold text-sm text-zinc-100">{mom.symbol.replace('USDT', '')}</span>
                    <span className="text-[10px] text-zinc-500">· 24h Vol ${(mom.volume24h / 1_000_000).toFixed(1)}M</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 block">
                    Range: High ${mom.high24h.toFixed(2)} / Low ${mom.low24h.toFixed(2)}
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-sm font-bold text-zinc-200 block">
                    ${mom.price >= 1000 ? mom.price.toFixed(2) : mom.price.toPrecision(5)}
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold">
                    +{mom.change24h.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Radars Showcase: Breakout, Accumulation & Meme Radars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Breakout Radar Card */}
        <div
          onClick={() => onNavigateTab('radars')}
          className="p-5 bg-zinc-950 border border-zinc-800/80 hover:border-emerald-500/40 rounded-xl transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h4 className="text-sm font-bold font-mono text-zinc-100 mb-1">BREAKOUT RADAR</h4>
          <p className="text-xs font-mono text-zinc-400 mb-3">
            {breakoutAssets.length} assets with verified resistance breaches and volume surges.
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {breakoutAssets.slice(0, 3).map((a) => (
              <span key={a.id} className="text-[10px] font-mono px-2 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded">
                {a.symbol.replace('USDT', '')}
              </span>
            ))}
          </div>
        </div>

        {/* Accumulation Radar Card */}
        <div
          onClick={() => onNavigateTab('radars')}
          className="p-5 bg-zinc-950 border border-zinc-800/80 hover:border-indigo-500/40 rounded-xl transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <Layers className="w-5 h-5 text-indigo-400" />
            <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
          </div>
          <h4 className="text-sm font-bold font-mono text-zinc-100 mb-1">ACCUMULATION RADAR</h4>
          <p className="text-xs font-mono text-zinc-400 mb-3">
            {accumulationAssets.length} assets consolidating in tight ranges with steady accumulation flows.
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {accumulationAssets.slice(0, 3).map((a) => (
              <span key={a.id} className="text-[10px] font-mono px-2 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded">
                {a.symbol.replace('USDT', '')}
              </span>
            ))}
          </div>
        </div>

        {/* Meme Coin Radar Card */}
        <div
          onClick={() => onNavigateTab('radars')}
          className="p-5 bg-zinc-950 border border-zinc-800/80 hover:border-pink-500/40 rounded-xl transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <Flame className="w-5 h-5 text-pink-400" />
            <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-pink-400 transition-colors" />
          </div>
          <h4 className="text-sm font-bold font-mono text-zinc-100 mb-1">MEME COIN RADAR</h4>
          <p className="text-xs font-mono text-zinc-400 mb-3">
            {memeAssets.length} on-chain DEX tokens screened with the Anti-Pump verification engine.
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {memeAssets.slice(0, 3).map((a) => (
              <span key={a.id} className="text-[10px] font-mono px-2 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded">
                {a.symbol.replace('USDT', '')}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
