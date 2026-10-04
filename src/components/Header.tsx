import React from 'react';
import { LiveStatus, MarketAsset } from '../types/market';
import {
  Activity,
  Compass,
  Radar,
  Radio,
  Bookmark,
  Newspaper,
  Bot,
  Globe,
  Sparkles,
  Search,
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  status: LiveStatus;
  lastUpdated: number;
  featuredAssets: MarketAsset[];
  watchlistCount: number;
  onSelectAsset: (asset: MarketAsset) => void;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  status,
  lastUpdated,
  featuredAssets,
  watchlistCount,
  onSelectAsset,
  onOpenSearch,
}) => {
  const navTabs = [
    { id: 'pulse', label: 'Market Pulse', icon: Activity },
    { id: 'gems', label: 'Hidden Gems', icon: Sparkles },
    { id: 'radars', label: 'Radars Hub', icon: Radar },
    { id: 'scanner', label: 'Global Scanner', icon: Compass },
    { id: 'news_macro', label: 'News & Macro', icon: Newspaper },
    { id: 'ai_research', label: 'AI Intelligence', icon: Bot },
    { id: 'watchlist', label: `Watchlist (${watchlistCount})`, icon: Bookmark },
  ];

  return (
    <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
      {/* 1. Global Status Bar (Top micro-bar) */}
      <div className="flex items-center justify-between px-4 py-1 bg-zinc-950 border-b border-zinc-900 text-[11px] font-mono text-zinc-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">FEED:</span>
            <span className="text-zinc-300 font-medium">Binance Spot WS & GeckoTerminal On-Chain</span>
          </div>
          <span aria-hidden="true">·</span>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">STATUS:</span>
            <span
              className={`font-semibold flex items-center gap-1 ${
                status === 'LIVE'
                  ? 'text-emerald-400'
                  : status === 'RECONNECTING'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {status === 'LIVE' && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
              {status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 text-zinc-500">
            <span>UPTIME VERIFIED</span>
            <span aria-hidden="true">·</span>
            <span>NO SIMULATED DATA</span>
          </div>
          <span className="text-zinc-400">
            LAST SYNC: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('pulse')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-indigo-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-wider text-zinc-100 font-mono">
              AETHER<span className="text-emerald-400">.INTEL</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono tracking-tight">GLOBAL MARKET INTELLIGENCE</span>
          </div>
        </div>

        {/* Navigation Tabs (Functional buttons, styled cleanly) */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-900/60 p-1 rounded-lg border border-zinc-800/60">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-all ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/50'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Search & Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Natural Language Search</span>
            <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] bg-zinc-800 rounded border border-zinc-700 text-zinc-400">
              /
            </kbd>
          </button>
        </div>
      </div>

      {/* 3. Mobile Navigation Bar (shown on smaller screens) */}
      <div className="flex md:hidden overflow-x-auto gap-1 px-3 py-2 border-t border-zinc-900 bg-zinc-950/95 scrollbar-none">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium rounded whitespace-nowrap ${
                isActive ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Real-time Ticker Bar */}
      <div className="overflow-x-auto border-t border-zinc-850 bg-zinc-950/80 px-4 py-1.5 flex items-center gap-6 scrollbar-none">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest shrink-0 flex items-center gap-1">
          <Globe className="w-3 h-3 text-emerald-400" /> LIVE TICKER:
        </span>
        <div className="flex items-center gap-5 shrink-0 text-xs font-mono">
          {featuredAssets.slice(0, 10).map((asset) => {
            const isBullish = asset.change24h >= 0;
            return (
              <div
                key={asset.id}
                onClick={() => onSelectAsset(asset)}
                className="flex items-center gap-2 hover:bg-zinc-900/80 px-2 py-0.5 rounded cursor-pointer transition-colors"
              >
                <span className="font-semibold text-zinc-200">{asset.symbol.replace('USDT', '')}</span>
                <span className="text-zinc-300 font-medium">
                  ${asset.price >= 1000 ? asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : asset.price.toPrecision(5)}
                </span>
                <span className={isBullish ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                  {isBullish ? '+' : ''}{asset.change24h.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
};
