import React, { useState, useEffect } from 'react';
import { NewsArticle, MacroIndicator, UpcomingMacroEvent } from '../types/market';
import {
  Newspaper,
  Globe2,
  Calendar,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
  RefreshCw,
  Landmark,
} from 'lucide-react';

export const MarketNewsAndMacro: React.FC = () => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [macroIndicators, setMacroIndicators] = useState<MacroIndicator[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingMacroEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'news' | 'macro'>('news');

  const fetchNewsAndMacro = async () => {
    setIsLoading(true);
    try {
      const [newsRes, macroRes] = await Promise.all([
        fetch('/api/market/news'),
        fetch('/api/market/macro'),
      ]);

      if (newsRes.ok) {
        const newsData = await newsRes.json();
        setNews(newsData.data || []);
      }

      if (macroRes.ok) {
        const macroData = await macroRes.json();
        setMacroIndicators(macroData.data?.indicators || []);
        setUpcomingEvents(macroData.data?.upcomingEvents || []);
      }
    } catch (e) {
      console.error('Error fetching news & macro:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsAndMacro();
  }, []);

  const categories = ['all', 'BTC', 'ETH', 'Market', 'Regulation', 'DeFi'];

  const filteredNews = news.filter(n => {
    if (selectedCategory === 'all') return true;
    return (
      n.headline.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      n.categories.some(c => c.toLowerCase().includes(selectedCategory.toLowerCase()))
    );
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Top Segmented Control */}
      <div className="flex items-center justify-between p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl">
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-medium rounded transition-colors ${
              activeTab === 'news'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>REAL-TIME NEWS FEED</span>
          </button>
          <button
            onClick={() => setActiveTab('macro')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-medium rounded transition-colors ${
              activeTab === 'macro'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>MACROECONOMIC INTELLIGENCE</span>
          </button>
        </div>

        <button
          onClick={fetchNewsAndMacro}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded-lg text-xs font-mono transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {activeTab === 'news' ? (
        <div className="flex flex-col gap-4">
          {/* Category Filter */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs font-mono rounded-lg border capitalize transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* News List */}
          {isLoading ? (
            <div className="p-12 text-center text-xs font-mono text-zinc-500">
              Fetching verified market news feeds...
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-zinc-500">
              No news articles found for this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNews.map((article) => (
                <div
                  key={article.id}
                  className="flex flex-col justify-between p-4 bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 rounded-xl transition-all shadow-md group"
                >
                  <div className="flex flex-col gap-2">
                    {/* Meta info */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                      <span className="text-emerald-400/90 font-medium">{article.source}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(article.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Headline */}
                    <h4 className="text-sm font-bold font-mono text-zinc-100 group-hover:text-emerald-300 transition-colors line-clamp-2">
                      {article.headline}
                    </h4>

                    {/* Body snippet */}
                    {article.body && (
                      <p className="text-xs font-mono text-zinc-400 line-clamp-3 leading-relaxed">
                        {article.body}
                      </p>
                    )}
                  </div>

                  {/* Footer categories & link */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-900">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {article.categories.slice(0, 2).map((c, i) => (
                        <span key={i} className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">
                          {c}
                        </span>
                      ))}
                    </div>
                    {article.url && (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-emerald-400 transition-colors"
                      >
                        <span>Source</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Macroeconomic Intelligence */
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {macroIndicators.map((macro, idx) => {
              const isFalling = macro.change.startsWith('-');
              return (
                <div
                  key={idx}
                  className="flex flex-col justify-between p-4 bg-zinc-950 border border-zinc-800/80 rounded-xl shadow-md"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                      <span>{macro.category}</span>
                      <span className="text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                        {macro.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold font-mono text-zinc-200">{macro.name}</h4>

                    <div className="flex items-baseline gap-2 my-1">
                      <span className="text-2xl font-bold font-mono text-zinc-100">{macro.value}</span>
                      <span className={`text-xs font-mono font-semibold ${isFalling ? 'text-cyan-400' : 'text-amber-400'}`}>
                        {macro.change}
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-zinc-400 leading-snug">
                      {macro.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-zinc-900 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-zinc-500">IMPACT:</span>
                    <span className="font-semibold text-emerald-400">{macro.impact}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Economic Calendar */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold font-mono text-zinc-200">
                UPCOMING GLOBAL ECONOMIC RELEASES & CENTRAL BANK DECISIONS
              </h3>
            </div>

            <div className="divide-y divide-zinc-900">
              {upcomingEvents.map((event, i) => (
                <div key={i} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {event.importance.toUpperCase()}
                    </span>
                    <span className="font-semibold text-zinc-200">{event.event}</span>
                  </div>

                  <div className="flex items-center gap-4 text-zinc-400">
                    <span>Target: <span className="text-zinc-300">{event.consensus}</span></span>
                    <span aria-hidden="true">·</span>
                    <span className="text-zinc-500">{event.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
