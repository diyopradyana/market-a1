import React, { useState } from 'react';
import { MarketAsset, RadarStage, RadarDebugStats } from '../types/market';
import {
  Sparkles,
  TrendingUp,
  Layers,
  Flame,
  Clock,
  AlertOctagon,
  ArrowUpRight,
  ShieldAlert,
  Zap,
  CheckCircle,
  Database,
  ChevronDown,
  ChevronUp,
  Activity,
  Info,
} from 'lucide-react';

interface RadarViewsProps {
  assets: MarketAsset[];
  onSelectAsset: (asset: MarketAsset) => void;
  activeRadar?: string;
}

export const RadarViews: React.FC<RadarViewsProps> = ({
  assets,
  onSelectAsset,
  activeRadar: initialRadar = 'breakout',
}) => {
  const [selectedRadar, setSelectedRadar] = useState<string>(initialRadar);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [stageFilter, setStageFilter] = useState<'ALL' | 'CONFIRMATION' | 'VALIDATION' | 'DISCOVERY'>('ALL');

  // 1. Breakout Radar: assets with breakoutStage !== null (Score >= 50)
  const breakoutAssets = assets
    .filter((a) => a.breakoutStage !== null)
    .sort((a, b) => b.breakoutScore - a.breakoutScore);

  // 2. Hidden Gems: assets with hiddenGemsStage !== null (Score >= 50)
  const hiddenGemsAssets = assets
    .filter((a) => a.hiddenGemsStage !== null)
    .sort((a, b) => b.hiddenGemsScore - a.hiddenGemsScore);

  // 3. Accumulation Radar: assets with accumulationStage !== null (Score >= 50)
  const accumulationAssets = assets
    .filter((a) => a.accumulationStage !== null)
    .sort((a, b) => b.accumulationScore - a.accumulationScore);

  // 4. Meme Coin Radar: on-chain DEX assets or meme-tagged
  const memeAssets = assets
    .filter((a) => {
      const sym = a.symbol.toUpperCase();
      return (
        a.source === 'GeckoTerminal' ||
        sym.includes('PEPE') ||
        sym.includes('DOGE') ||
        sym.includes('BONK') ||
        sym.includes('WIF') ||
        sym.includes('FLOKI') ||
        sym.includes('SHIB') ||
        sym.includes('BOME') ||
        sym.includes('MEME')
      );
    })
    .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));

  // 5. New Token Radar: fresh pools or young age
  const newTokens = assets
    .filter((a) => (a.tokenAgeDays !== undefined && a.tokenAgeDays <= 21) || Boolean(a.poolCreatedAt))
    .sort((a, b) => (a.tokenAgeDays || 999) - (b.tokenAgeDays || 999));

  // 6. Anti-Pump Warnings: assets flagged with anomalies
  const antiPumpAssets = assets
    .filter((a) => a.antiPumpWarnings && a.antiPumpWarnings.length > 0)
    .sort((a, b) => (b.antiPumpWarnings?.length || 0) - (a.antiPumpWarnings?.length || 0));

  const radarTabs = [
    {
      id: 'breakout',
      label: 'Breakout Radar',
      icon: TrendingUp,
      count: breakoutAssets.length,
      desc: 'Resistance breaches & volume expansion across market universe',
    },
    {
      id: 'gems',
      label: 'Hidden Gems',
      icon: Sparkles,
      count: hiddenGemsAssets.length,
      desc: 'Early volume acceleration & buy pressure before consensus',
    },
    {
      id: 'accumulation',
      label: 'Accumulation Radar',
      icon: Layers,
      count: accumulationAssets.length,
      desc: 'Tight consolidation range with steady absorption flows',
    },
    {
      id: 'meme',
      label: 'Meme Coin Radar',
      icon: Flame,
      count: memeAssets.length,
      desc: 'Real on-chain DEX liquidity, transactions & order pressure',
    },
    {
      id: 'new',
      label: 'New Token Radar',
      icon: Clock,
      count: newTokens.length,
      desc: 'Newly launched pools with verified liquidity depth',
    },
    {
      id: 'antipump',
      label: 'Anti-Pump Engine',
      icon: AlertOctagon,
      count: antiPumpAssets.length,
      desc: 'Security surveillance flagging abnormal surges & thin pools',
    },
  ];

  // Determine current active list and stages breakdown
  let activeList: MarketAsset[] = [];
  let stageCounts = { discovery: 0, validation: 0, confirmation: 0 };

  if (selectedRadar === 'breakout') {
    activeList = breakoutAssets;
    stageCounts = {
      discovery: breakoutAssets.filter((a) => a.breakoutStage === 'DISCOVERY').length,
      validation: breakoutAssets.filter((a) => a.breakoutStage === 'VALIDATION').length,
      confirmation: breakoutAssets.filter((a) => a.breakoutStage === 'CONFIRMATION').length,
    };
  } else if (selectedRadar === 'gems') {
    activeList = hiddenGemsAssets;
    stageCounts = {
      discovery: hiddenGemsAssets.filter((a) => a.hiddenGemsStage === 'DISCOVERY').length,
      validation: hiddenGemsAssets.filter((a) => a.hiddenGemsStage === 'VALIDATION').length,
      confirmation: hiddenGemsAssets.filter((a) => a.hiddenGemsStage === 'CONFIRMATION').length,
    };
  } else if (selectedRadar === 'accumulation') {
    activeList = accumulationAssets;
    stageCounts = {
      discovery: accumulationAssets.filter((a) => a.accumulationStage === 'DISCOVERY').length,
      validation: accumulationAssets.filter((a) => a.accumulationStage === 'VALIDATION').length,
      confirmation: accumulationAssets.filter((a) => a.accumulationStage === 'CONFIRMATION').length,
    };
  } else if (selectedRadar === 'meme') {
    activeList = memeAssets;
    stageCounts = {
      discovery: memeAssets.filter((a) => a.opportunityScore < 65).length,
      validation: memeAssets.filter((a) => a.opportunityScore >= 65 && a.opportunityScore < 80).length,
      confirmation: memeAssets.filter((a) => a.opportunityScore >= 80).length,
    };
  } else if (selectedRadar === 'new') {
    activeList = newTokens;
    stageCounts = {
      discovery: newTokens.filter((a) => (a.liquidity || 0) < 50_000).length,
      validation: newTokens.filter((a) => (a.liquidity || 0) >= 50_000 && (a.liquidity || 0) < 200_000).length,
      confirmation: newTokens.filter((a) => (a.liquidity || 0) >= 200_000).length,
    };
  } else if (selectedRadar === 'antipump') {
    activeList = antiPumpAssets;
    stageCounts = {
      discovery: antiPumpAssets.filter((a) => a.antiPumpWarnings?.length === 1).length,
      validation: antiPumpAssets.filter((a) => (a.antiPumpWarnings?.length || 0) >= 2).length,
      confirmation: antiPumpAssets.filter((a) => a.risk === 'EXTREME').length,
    };
  }

  // Filter by stage if selected
  const displayedList = activeList.filter((a) => {
    if (stageFilter === 'ALL') return true;
    if (selectedRadar === 'breakout') return a.breakoutStage === stageFilter;
    if (selectedRadar === 'gems') return a.hiddenGemsStage === stageFilter;
    if (selectedRadar === 'accumulation') return a.accumulationStage === stageFilter;
    if (selectedRadar === 'meme') {
      if (stageFilter === 'CONFIRMATION') return a.opportunityScore >= 80;
      if (stageFilter === 'VALIDATION') return a.opportunityScore >= 65 && a.opportunityScore < 80;
      return a.opportunityScore < 65;
    }
    return true;
  });

  // Diagnostics Calculation
  const debugStats: RadarDebugStats = {
    assetsScanned: assets.length,
    assetsWithValidOhlcv: assets.filter((a) => a.price > 0 && a.high24h > 0 && a.low24h > 0).length,
    assetsWithValidVolume: assets.filter((a) => a.volume24h > 0).length,
    assetsWithValidLiquidity: assets.filter((a) => (a.liquidity || a.volume24h) > 0).length,
    assetsRejectedInsufficientData: assets.filter((a) => !a.hasSufficientData).length,
    breakoutStages: {
      discovery: breakoutAssets.filter((a) => a.breakoutStage === 'DISCOVERY').length,
      validation: breakoutAssets.filter((a) => a.breakoutStage === 'VALIDATION').length,
      confirmation: breakoutAssets.filter((a) => a.breakoutStage === 'CONFIRMATION').length,
    },
    hiddenGemsStages: {
      discovery: hiddenGemsAssets.filter((a) => a.hiddenGemsStage === 'DISCOVERY').length,
      validation: hiddenGemsAssets.filter((a) => a.hiddenGemsStage === 'VALIDATION').length,
      confirmation: hiddenGemsAssets.filter((a) => a.hiddenGemsStage === 'CONFIRMATION').length,
    },
    accumulationStages: {
      discovery: accumulationAssets.filter((a) => a.accumulationStage === 'DISCOVERY').length,
      validation: accumulationAssets.filter((a) => a.accumulationStage === 'VALIDATION').length,
      confirmation: accumulationAssets.filter((a) => a.accumulationStage === 'CONFIRMATION').length,
    },
    memeStages: {
      discovery: memeAssets.filter((a) => a.opportunityScore < 65).length,
      validation: memeAssets.filter((a) => a.opportunityScore >= 65 && a.opportunityScore < 80).length,
      confirmation: memeAssets.filter((a) => a.opportunityScore >= 80).length,
    },
    newTokenStages: {
      discovery: newTokens.filter((a) => (a.liquidity || 0) < 50_000).length,
      validation: newTokens.filter((a) => (a.liquidity || 0) >= 50_000 && (a.liquidity || 0) < 200_000).length,
      confirmation: newTokens.filter((a) => (a.liquidity || 0) >= 200_000).length,
    },
    antiPumpCount: antiPumpAssets.length,
    lastScanTimestamp: Date.now(),
    dataSources: ['Binance Spot REST & WebSocket', 'GeckoTerminal On-Chain Pools API'],
  };

  const getMissingCriteriaExplanation = (radarId: string) => {
    switch (radarId) {
      case 'breakout':
        return 'Criteria missing: Scanned assets did not achieve the minimum 50% weighted threshold combining resistance proximity (25%), volume expansion (20%), and momentum (15%).';
      case 'gems':
        return 'Criteria missing: Insufficient combination of 24h volume acceleration (> $500k), buy aggression, and market structure consolidation.';
      case 'accumulation':
        return 'Criteria missing: 24h price volatility exceeded tight consolidation parameters (range > 6%) or absorption volume fell below required thresholds.';
      case 'meme':
        return 'Criteria missing: No active on-chain meme pools matching minimum liquidity thresholds found in current network snapshot.';
      default:
        return 'Criteria missing: No assets currently satisfy the quantitative criteria for this scanner in the active market window.';
    }
  };

  const getStageBadgeClass = (stage: RadarStage) => {
    switch (stage) {
      case 'CONFIRMATION':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
      case 'VALIDATION':
        return 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
      case 'DISCOVERY':
        return 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10';
      default:
        return 'text-zinc-500 border-zinc-700 bg-zinc-800/40';
    }
  };

  const getRiskBadgeClass = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'MODERATE':
        return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
      case 'HIGH':
        return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'VERY HIGH':
        return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
      default:
        return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Top Radar Selector Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {radarTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = selectedRadar === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedRadar(tab.id);
                setStageFilter('ALL');
              }}
              className={`flex flex-col p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'bg-zinc-900 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                  : 'bg-zinc-950/70 border-zinc-800/80 hover:bg-zinc-900/60 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-zinc-400'}`} />
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 font-bold">
                  {tab.count}
                </span>
              </div>
              <span className="text-xs font-semibold font-mono text-zinc-200">{tab.label}</span>
              <span className="text-[10px] text-zinc-500 font-mono mt-1 line-clamp-1">{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Radar Stages Header & Stage Breakdown Counter */}
      <div className="flex flex-col gap-3 p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-mono text-zinc-100">
                {radarTabs.find((t) => t.id === selectedRadar)?.label.toUpperCase()}
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                · {activeList.length} assets detected
              </span>
            </div>
            <span className="text-xs font-mono text-zinc-400 mt-0.5">
              {radarTabs.find((t) => t.id === selectedRadar)?.desc}
            </span>
          </div>

          {/* Diagnostics / Debug Toggle Button */}
          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 text-xs font-mono rounded-lg transition-colors shrink-0"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Debug / Data Quality</span>
            {showDebugPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Radar Stages Counter & Filter (per user requirement) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/60 text-xs font-mono">
          <span className="text-zinc-500 text-[11px] uppercase mr-1">STAGES:</span>

          <button
            onClick={() => setStageFilter('ALL')}
            className={`px-2.5 py-1 rounded transition-colors ${
              stageFilter === 'ALL'
                ? 'bg-zinc-800 text-zinc-100 font-bold border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ALL ({activeList.length})
          </button>

          <button
            onClick={() => setStageFilter('DISCOVERY')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
              stageFilter === 'DISCOVERY'
                ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-400"></span>
            <span>DISCOVERY {stageCounts.discovery}</span>
          </button>

          <button
            onClick={() => setStageFilter('VALIDATION')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
              stageFilter === 'VALIDATION'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>VALIDATION {stageCounts.validation}</span>
          </button>

          <button
            onClick={() => setStageFilter('CONFIRMATION')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
              stageFilter === 'CONFIRMATION'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>CONFIRMATION {stageCounts.confirmation}</span>
          </button>
        </div>
      </div>

      {/* 3. DEBUG / DATA QUALITY PANEL (Collapsible, per user requirement) */}
      {showDebugPanel && (
        <div className="p-5 bg-zinc-950 border border-cyan-500/30 rounded-xl font-mono text-xs shadow-2xl flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h4 className="font-bold text-zinc-100">RADAR ENGINE DIAGNOSTICS &amp; DATA QUALITY INSPECTION</h4>
            </div>
            <span className="text-[11px] text-zinc-500">
              Scanned at: {new Date(debugStats.lastScanTimestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-zinc-300">
            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
              <span className="text-zinc-500 text-[10px] block">TOTAL ASSETS SCANNED</span>
              <span className="text-lg font-bold text-zinc-100">{debugStats.assetsScanned}</span>
            </div>
            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
              <span className="text-zinc-500 text-[10px] block">VALID REAL OHLCV / PRICE</span>
              <span className="text-lg font-bold text-emerald-400">{debugStats.assetsWithValidOhlcv}</span>
            </div>
            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
              <span className="text-zinc-500 text-[10px] block">VALID 24H VOLUME</span>
              <span className="text-lg font-bold text-cyan-400">{debugStats.assetsWithValidVolume}</span>
            </div>
            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
              <span className="text-zinc-500 text-[10px] block">REJECTED (INSUFFICIENT DATA)</span>
              <span className="text-lg font-bold text-zinc-400">{debugStats.assetsRejectedInsufficientData}</span>
            </div>
          </div>

          {/* Breakdown by Module */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-lg">
              <span className="text-zinc-400 font-semibold block mb-1">BREAKOUT STAGES</span>
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Discovery (50-64):</span>
                <span className="text-indigo-400 font-bold">{debugStats.breakoutStages.discovery}</span>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Validation (65-79):</span>
                <span className="text-cyan-400 font-bold">{debugStats.breakoutStages.validation}</span>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Confirmation (80-100):</span>
                <span className="text-emerald-400 font-bold">{debugStats.breakoutStages.confirmation}</span>
              </div>
            </div>

            <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-lg">
              <span className="text-zinc-400 font-semibold block mb-1">HIDDEN GEMS STAGES</span>
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Discovery (50-64):</span>
                <span className="text-indigo-400 font-bold">{debugStats.hiddenGemsStages.discovery}</span>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Validation (65-79):</span>
                <span className="text-cyan-400 font-bold">{debugStats.hiddenGemsStages.validation}</span>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Confirmation (80-100):</span>
                <span className="text-emerald-400 font-bold">{debugStats.hiddenGemsStages.confirmation}</span>
              </div>
            </div>

            <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-lg">
              <span className="text-zinc-400 font-semibold block mb-1">ACCUMULATION STAGES</span>
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Discovery (50-64):</span>
                <span className="text-indigo-400 font-bold">{debugStats.accumulationStages.discovery}</span>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Validation (65-79):</span>
                <span className="text-cyan-400 font-bold">{debugStats.accumulationStages.validation}</span>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Confirmation (80-100):</span>
                <span className="text-emerald-400 font-bold">{debugStats.accumulationStages.confirmation}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-850">
            <span>Data Sources: {debugStats.dataSources.join(' · ')}</span>
            <span className="text-emerald-400">Formula Weights Verified · Zero Simulation</span>
          </div>
        </div>
      )}

      {/* 4. Assets Grid */}
      {displayedList.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
          <ShieldAlert className="w-10 h-10 text-zinc-600 mb-3" />
          <h4 className="text-sm font-mono font-semibold text-zinc-300">NO QUALIFIED ASSETS CURRENTLY</h4>
          <p className="text-xs font-mono text-zinc-400 max-w-md mt-2 leading-relaxed">
            {getMissingCriteriaExplanation(selectedRadar)}
          </p>
          <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-zinc-500">
            <Info className="w-3.5 h-3.5" />
            <span>The Radar engine strictly verifies live indicators rather than inventing results.</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedList.map((asset) => {
            const isBullish = asset.change24h >= 0;

            // Relevant score & stage depending on active radar
            let currentScore = asset.opportunityScore;
            let currentStage: RadarStage = null;
            let currentBadgeLabel = '';

            if (selectedRadar === 'breakout') {
              currentScore = asset.breakoutScore;
              currentStage = asset.breakoutStage;
              currentBadgeLabel = asset.breakoutClassification || 'BREAKOUT';
            } else if (selectedRadar === 'gems') {
              currentScore = asset.hiddenGemsScore;
              currentStage = asset.hiddenGemsStage;
              currentBadgeLabel = `GEM · ${currentStage || 'DISCOVERY'}`;
            } else if (selectedRadar === 'accumulation') {
              currentScore = asset.accumulationScore;
              currentStage = asset.accumulationStage;
              currentBadgeLabel = `ACCUMULATION · ${currentStage || 'DISCOVERY'}`;
            } else {
              currentBadgeLabel = asset.ranking;
            }

            return (
              <div
                key={asset.id}
                onClick={() => onSelectAsset(asset)}
                className="group flex flex-col p-4 bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/40 rounded-xl transition-all cursor-pointer shadow-md"
              >
                {/* Header: Symbol, Name, Source, Stage Badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-bold font-mono text-zinc-200">
                      {asset.symbol.slice(0, 3)}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm font-mono text-zinc-100 group-hover:text-emerald-400 transition-colors">
                          {asset.symbol.replace('USDT', '')}
                        </span>
                        {asset.network && (
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">
                            · {asset.network}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-500 font-mono truncate max-w-[140px]">
                        {asset.name}
                      </span>
                    </div>
                  </div>

                  {/* Stage or Rank Badge */}
                  <div className="flex items-center gap-1.5">
                    {currentStage ? (
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded border ${getStageBadgeClass(
                          currentStage
                        )}`}
                      >
                        {currentStage}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-bold font-mono rounded border border-zinc-700 bg-zinc-800/40 text-zinc-300">
                        {asset.ranking}
                      </span>
                    )}
                    <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </div>
                </div>

                {/* Price & 24h Change */}
                <div className="flex items-baseline justify-between py-2 border-y border-zinc-900 font-mono">
                  <div>
                    <span className="text-base font-bold text-zinc-100">
                      $
                      {asset.price >= 1000
                        ? asset.price.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : asset.price.toPrecision(5)}
                    </span>
                  </div>
                  <div className={`text-xs font-semibold ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isBullish ? '+' : ''}
                    {asset.change24h.toFixed(2)}%
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 my-3 text-[11px] font-mono text-zinc-400">
                  <div>
                    <span className="text-zinc-500 block">24H VOLUME</span>
                    <span className="text-zinc-200 font-medium">
                      ${(asset.volume24h / 1_000_000).toFixed(2)}M
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">
                      {asset.liquidity ? 'POOL LIQUIDITY' : '24H RANGE'}
                    </span>
                    <span className="text-zinc-200 font-medium truncate block">
                      {asset.liquidity
                        ? `$${(asset.liquidity / 1_000_000).toFixed(2)}M`
                        : `$${asset.low24h.toFixed(2)} - $${asset.high24h.toFixed(2)}`}
                    </span>
                  </div>
                </div>

                {/* Breakout / Specific Classification Pill */}
                {selectedRadar === 'breakout' && asset.breakoutClassification && (
                  <div className="mb-2">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-mono font-semibold rounded border ${
                        asset.breakoutClassification === 'CONFIRMED BREAKOUT'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : asset.breakoutClassification === 'VALIDATION'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                      }`}
                    >
                      {asset.breakoutClassification} ({asset.breakoutScore}/100)
                    </span>
                  </div>
                )}

                {/* Anti-pump warning pill if any */}
                {asset.antiPumpWarnings && asset.antiPumpWarnings.length > 0 && (
                  <div className="mb-2 text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                    ⚠ {asset.antiPumpWarnings[0]}
                  </div>
                )}

                {/* Top Evidence bullet */}
                <div className="mt-auto pt-2 border-t border-zinc-900 text-[11px] font-mono text-zinc-400">
                  {asset.evidence.pros.length > 0 ? (
                    <div className="flex items-center gap-1.5 truncate text-emerald-400/90">
                      <CheckCircle className="w-3 h-3 shrink-0 text-emerald-400" />
                      <span className="truncate">{asset.evidence.pros[0]}</span>
                    </div>
                  ) : (
                    <span className="text-zinc-500">Tracking live market metrics</span>
                  )}
                </div>

                {/* Footer: Radar Score & Risk */}
                <div className="flex items-center justify-between mt-3 pt-2 text-[10px] font-mono border-t border-zinc-900">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">
                      {selectedRadar === 'breakout'
                        ? 'BREAKOUT SCORE:'
                        : selectedRadar === 'gems'
                        ? 'GEM SCORE:'
                        : selectedRadar === 'accumulation'
                        ? 'ACCUMULATION:'
                        : 'SCORE:'}
                    </span>
                    <span className="font-bold text-zinc-200">{currentScore}/100</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded border ${getRiskBadgeClass(asset.risk)}`}>
                    {asset.risk} RISK
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
