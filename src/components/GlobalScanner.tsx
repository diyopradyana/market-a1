import React, { useState, useMemo } from 'react';
import { MarketAsset } from '../types/market';
import {
  Search,
  Filter,
  Sparkles,
  ArrowUpDown,
  ArrowUpRight,
  TrendingUp,
  Layers,
  Flame,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface GlobalScannerProps {
  assets: MarketAsset[];
  onSelectAsset: (asset: MarketAsset) => void;
}

export const GlobalScanner: React.FC<GlobalScannerProps> = ({
  assets,
  onSelectAsset,
}) => {
  // Search & Natural Language
  const [nlQuery, setNlQuery] = useState('');
  const [isNlLoading, setIsNlLoading] = useState(false);
  const [nlFeedback, setNlFeedback] = useState<string | null>(null);

  // Filters
  const [filterSource, setFilterSource] = useState<string>('all'); // all, binance, solana, eth, base, bsc
  const [filterRisk, setFilterRisk] = useState<string>('all'); // all, LOW, MODERATE, HIGH, VERY HIGH, EXTREME
  const [filterRank, setFilterRank] = useState<string>('all'); // all, S+, S, A+, A, B, C, D
  const [minVolume, setMinVolume] = useState<number>(0);
  const [minScore, setMinScore] = useState<number>(0);
  const [onlyBreakout, setOnlyBreakout] = useState(false);
  const [onlyAccumulation, setOnlyAccumulation] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState<'opportunityScore' | 'volume24h' | 'change24h' | 'price'>('opportunityScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Quick NL search presets
  const nlPresets = [
    'cari crypto market cap kecil dengan volume naik',
    'cari meme coin Solana yang mulai ramai',
    'cari crypto yang baru breakout',
    'cari hidden gem',
    'cari aset yang sedang akumulasi',
    'find high momentum tokens on Binance',
  ];

  // Natural Language Query submit
  const handleNaturalLanguageSearch = async (queryText?: string) => {
    const textToSearch = queryText || nlQuery;
    if (!textToSearch.trim()) return;

    setIsNlLoading(true);
    setNlFeedback(null);

    try {
      const res = await fetch('/api/ai/nl-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: textToSearch }),
      });

      if (res.ok) {
        const json = await res.json();
        const f = json.filters;
        if (f) {
          if (f.assetClass && f.assetClass !== 'all') {
            setFilterSource(f.assetClass);
          }
          if (f.minVolumeChange) {
            setMinVolume(f.minVolumeChange * 50_000);
          }
          if (f.minOpportunityScore) {
            setMinScore(f.minOpportunityScore);
          }
          if (f.radarType === 'breakout') {
            setOnlyBreakout(true);
            setOnlyAccumulation(false);
          } else if (f.radarType === 'accumulation') {
            setOnlyAccumulation(true);
            setOnlyBreakout(false);
          } else if (f.radarType === 'hidden_gems') {
            setMinScore(70);
          }
          setNlFeedback(f.explanation || `Filtered by AI for: "${textToSearch}"`);
        }
      }
    } catch (e) {
      console.error('NL query error:', e);
      // Client-side fallback
      const lower = textToSearch.toLowerCase();
      if (lower.includes('solana')) setFilterSource('solana');
      if (lower.includes('breakout')) setOnlyBreakout(true);
      if (lower.includes('akumulasi')) setOnlyAccumulation(true);
      if (lower.includes('gem')) setMinScore(70);
      setNlFeedback(`Filtered for "${textToSearch}"`);
    } finally {
      setIsNlLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilterSource('all');
    setFilterRisk('all');
    setFilterRank('all');
    setMinVolume(0);
    setMinScore(0);
    setOnlyBreakout(false);
    setOnlyAccumulation(false);
    setNlQuery('');
    setNlFeedback(null);
  };

  // Filtered and sorted assets
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      // Source / Network
      if (filterSource === 'binance' && a.source !== 'Binance') return false;
      if (filterSource === 'solana' && a.network !== 'solana') return false;
      if (filterSource === 'eth' && a.network !== 'eth' && a.network !== 'ethereum') return false;
      if (filterSource === 'base' && a.network !== 'base') return false;
      if (filterSource === 'bsc' && a.network !== 'bsc') return false;

      // Risk
      if (filterRisk !== 'all' && a.risk !== filterRisk) return false;

      // Rank
      if (filterRank !== 'all' && !a.ranking.startsWith(filterRank)) return false;

      // Min Volume
      if (minVolume > 0 && a.volume24h < minVolume) return false;

      // Min Score
      if (minScore > 0 && a.opportunityScore < minScore) return false;

      // Breakout
      if (onlyBreakout && a.breakoutStage === null) return false;

      // Accumulation
      if (onlyAccumulation && a.accumulationStage === null) return false;

      // Text query
      if (nlQuery && !nlFeedback) {
        const q = nlQuery.toLowerCase();
        const matchesText =
          a.symbol.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          (a.network && a.network.toLowerCase().includes(q));
        if (!matchesText) return false;
      }

      return true;
    }).sort((a, b) => {
      const mult = sortOrder === 'desc' ? -1 : 1;
      return (a[sortBy] - b[sortBy]) * mult;
    });
  }, [assets, filterSource, filterRisk, filterRank, minVolume, minScore, onlyBreakout, onlyAccumulation, nlQuery, nlFeedback, sortBy, sortOrder]);

  const toggleSort = (field: 'opportunityScore' | 'volume24h' | 'change24h' | 'price') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Natural Language Search Bar */}
      <div className="flex flex-col gap-3 p-4 bg-zinc-950 border border-zinc-800/80 rounded-xl shadow-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono font-semibold text-zinc-200">
            NATURAL LANGUAGE SCANNER & DISCOVERY ENGINE
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleNaturalLanguageSearch();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              placeholder="e.g. 'cari crypto market cap kecil dengan volume naik' or 'cari token breakout di Solana'..."
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={isNlLoading}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-mono font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            {isNlLoading ? (
              <span className="animate-spin w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Scan Market</span>
          </button>
        </form>

        {/* Quick query chips */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-1">
          <span className="text-[11px] font-mono text-zinc-500 shrink-0">Try:</span>
          {nlPresets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setNlQuery(preset);
                handleNaturalLanguageSearch(preset);
              }}
              className="px-2.5 py-1 text-[11px] font-mono text-zinc-400 bg-zinc-900/60 hover:bg-zinc-850 hover:text-zinc-200 border border-zinc-800 rounded whitespace-nowrap transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Feedback from AI if applied */}
        {nlFeedback && (
          <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-400">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{nlFeedback}</span>
            </span>
            <button
              onClick={handleResetFilters}
              className="text-zinc-400 hover:text-zinc-200 text-[11px] underline"
            >
              Clear filter
            </button>
          </div>
        )}
      </div>

      {/* 2. Structured Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Source Filter */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            {['all', 'binance', 'solana', 'eth', 'base', 'bsc'].map((src) => (
              <button
                key={src}
                onClick={() => setFilterSource(src)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded capitalize transition-colors ${
                  filterSource === src
                    ? 'bg-zinc-800 text-zinc-100 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {src === 'all' ? 'All Networks' : src}
              </button>
            ))}
          </div>

          {/* Risk Level */}
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All Risk Levels</option>
            <option value="LOW">Low Risk</option>
            <option value="MODERATE">Moderate Risk</option>
            <option value="HIGH">High Risk</option>
            <option value="VERY HIGH">Very High Risk</option>
            <option value="EXTREME">Extreme Risk</option>
          </select>

          {/* Min Opportunity Score */}
          <select
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value={0}>Any Opportunity Score</option>
            <option value={60}>Score &gt;= 60</option>
            <option value={70}>Score &gt;= 70 (Elite)</option>
            <option value={80}>Score &gt;= 80 (S-Tier)</option>
          </select>

          {/* Toggle buttons for breakout / accumulation */}
          <button
            onClick={() => setOnlyBreakout(!onlyBreakout)}
            className={`px-2.5 py-1.5 text-xs font-mono rounded-lg border transition-colors ${
              onlyBreakout
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            Breakouts Only
          </button>
          <button
            onClick={() => setOnlyAccumulation(!onlyAccumulation)}
            className={`px-2.5 py-1.5 text-xs font-mono rounded-lg border transition-colors ${
              onlyAccumulation
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            Accumulation Only
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-500">
            {filteredAssets.length} of {assets.length} Assets
          </span>
          <button
            onClick={handleResetFilters}
            title="Reset Filters"
            className="p-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Assets Table */}
      <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50 text-[11px] font-mono text-zinc-400">
                <th className="py-3 px-4">ASSET</th>
                <th
                  onClick={() => toggleSort('price')}
                  className="py-3 px-4 cursor-pointer hover:text-zinc-200 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>PRICE</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('change24h')}
                  className="py-3 px-4 cursor-pointer hover:text-zinc-200 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>24H %</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('volume24h')}
                  className="py-3 px-4 cursor-pointer hover:text-zinc-200 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>24H VOLUME</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">LIQUIDITY / MCAP</th>
                <th
                  onClick={() => toggleSort('opportunityScore')}
                  className="py-3 px-4 cursor-pointer hover:text-zinc-200 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>OPPORTUNITY</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">CONFIDENCE</th>
                <th className="py-3 px-4">RISK</th>
                <th className="py-3 px-4">DISCOVERY FLAGS</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-xs font-mono">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-500 font-mono">
                    No assets matched current scanner criteria. Try resetting filters.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const isBullish = asset.change24h >= 0;
                  return (
                    <tr
                      key={asset.id}
                      onClick={() => onSelectAsset(asset)}
                      className="hover:bg-zinc-900/40 transition-colors cursor-pointer group"
                    >
                      {/* Asset */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-200">
                            {asset.symbol.slice(0, 3)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                                {asset.symbol.replace('USDT', '')}
                              </span>
                              <span className="text-[10px] text-zinc-500">
                                {asset.source === 'Binance' ? 'BINANCE' : asset.network?.toUpperCase()}
                              </span>
                            </div>
                            <span className="text-[11px] text-zinc-500 truncate block max-w-[130px]">
                              {asset.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 text-zinc-200 font-medium">
                        ${asset.price >= 1000 ? asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : asset.price.toPrecision(5)}
                      </td>

                      {/* 24h Change */}
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isBullish ? '+' : ''}{asset.change24h.toFixed(2)}%
                        </span>
                      </td>

                      {/* Volume */}
                      <td className="py-3 px-4 text-zinc-300">
                        ${(asset.volume24h / 1_000_000).toFixed(2)}M
                      </td>

                      {/* Liquidity / Market Cap */}
                      <td className="py-3 px-4 text-zinc-400">
                        {asset.liquidity
                          ? `$${(asset.liquidity / 1_000_000).toFixed(2)}M Liq`
                          : asset.marketCap
                          ? `$${(asset.marketCap / 1_000_000).toFixed(1)}M MCap`
                          : 'N/A'}
                      </td>

                      {/* Opportunity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-100">{asset.opportunityScore}</span>
                          <span
                            className={`px-1.5 py-0.2 text-[10px] font-bold rounded border ${
                              asset.ranking.startsWith('S')
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : asset.ranking.startsWith('A')
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {asset.ranking}
                          </span>
                        </div>
                      </td>

                      {/* Confidence */}
                      <td className="py-3 px-4 text-zinc-300">
                        {asset.confidenceScore}%
                      </td>

                      {/* Risk */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] rounded border ${
                            asset.risk === 'LOW'
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                              : asset.risk === 'MODERATE'
                              ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
                              : asset.risk === 'HIGH'
                              ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                              : 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                          }`}
                        >
                          {asset.risk}
                        </span>
                      </td>

                      {/* Discovery Flags */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {asset.breakoutStage && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                              {asset.breakoutClassification || 'Breakout'}
                            </span>
                          )}
                          {asset.accumulationStage && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">
                              Accumulation
                            </span>
                          )}
                          {asset.antiPumpWarnings?.length ? (
                            <span className="text-[10px] px-1.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded">
                              Anti-Pump Flag
                            </span>
                          ) : null}
                          {!asset.breakoutStage && !asset.accumulationStage && !asset.antiPumpWarnings?.length && (
                            <span className="text-zinc-600 text-[11px]">-</span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAsset(asset);
                          }}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded text-[11px] transition-colors inline-flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
