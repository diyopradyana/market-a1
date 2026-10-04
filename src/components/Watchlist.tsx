import React from 'react';
import { MarketAsset } from '../types/market';
import { Bookmark, ArrowUpRight, Trash2, ArrowUpDown, ShieldAlert } from 'lucide-react';

interface WatchlistProps {
  watchlistIds: string[];
  allAssets: MarketAsset[];
  onSelectAsset: (asset: MarketAsset) => void;
  onRemoveFromWatchlist: (id: string) => void;
  onNavigateToScanner: () => void;
}

export const Watchlist: React.FC<WatchlistProps> = ({
  watchlistIds,
  allAssets,
  onSelectAsset,
  onRemoveFromWatchlist,
  onNavigateToScanner,
}) => {
  const watchedAssets = allAssets.filter((a) => watchlistIds.includes(a.id));

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800/80 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
            <Bookmark className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-zinc-100">
              WATCHLIST & PORTFOLIO SURVEILLANCE
            </h3>
            <span className="text-[11px] text-zinc-500 font-mono">
              {watchedAssets.length} ASSETS UNDER CONTINUOUS WEBSOCKET MONITORING
            </span>
          </div>
        </div>

        <button
          onClick={onNavigateToScanner}
          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded-lg text-xs font-mono transition-colors"
        >
          + Add from Scanner
        </button>
      </div>

      {watchedAssets.length === 0 ? (
        <div className="p-12 text-center bg-zinc-950 border border-zinc-800/80 rounded-xl flex flex-col items-center justify-center gap-3">
          <Bookmark className="w-10 h-10 text-zinc-700" />
          <h4 className="text-sm font-mono font-semibold text-zinc-300">WATCHLIST IS CURRENTLY EMPTY</h4>
          <p className="text-xs font-mono text-zinc-500 max-w-sm">
            Save promising market opportunities or breakout setups from the Market Pulse, Hidden Gems, or Global Scanner.
          </p>
          <button
            onClick={onNavigateToScanner}
            className="mt-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold font-mono text-xs rounded-lg transition-colors"
          >
            Explore Global Scanner
          </button>
        </div>
      ) : (
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50 text-[11px] font-mono text-zinc-400">
                  <th className="py-3 px-4">ASSET</th>
                  <th className="py-3 px-4">PRICE</th>
                  <th className="py-3 px-4">24H CHANGE</th>
                  <th className="py-3 px-4">24H VOLUME</th>
                  <th className="py-3 px-4">OPPORTUNITY</th>
                  <th className="py-3 px-4">CONFIDENCE</th>
                  <th className="py-3 px-4">RISK</th>
                  <th className="py-3 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-xs font-mono">
                {watchedAssets.map((asset) => {
                  const isBullish = asset.change24h >= 0;
                  return (
                    <tr
                      key={asset.id}
                      onClick={() => onSelectAsset(asset)}
                      className="hover:bg-zinc-900/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-200">
                            {asset.symbol.slice(0, 3)}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                              {asset.symbol.replace('USDT', '')}
                            </span>
                            <span className="text-[11px] text-zinc-500 block truncate max-w-[120px]">
                              {asset.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-zinc-200 font-medium">
                        ${asset.price >= 1000 ? asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : asset.price.toPrecision(5)}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`font-semibold ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isBullish ? '+' : ''}{asset.change24h.toFixed(2)}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-zinc-300">
                        ${(asset.volume24h / 1_000_000).toFixed(2)}M
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-100">{asset.opportunityScore}</span>
                          <span className="text-[10px] text-emerald-400 font-bold">
                            [{asset.ranking}]
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-zinc-300">
                        {asset.confidenceScore}%
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[11px] text-zinc-300">
                          {asset.risk}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAsset(asset);
                            }}
                            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded text-[11px] inline-flex items-center gap-1"
                          >
                            <span>Chart</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveFromWatchlist(asset.id);
                            }}
                            title="Remove from Watchlist"
                            className="p-1 hover:text-rose-400 text-zinc-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
