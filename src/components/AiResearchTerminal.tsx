import React, { useState } from 'react';
import { MarketAsset } from '../types/market';
import { Bot, Send, Sparkles, Terminal, ShieldAlert, CheckCircle, Database } from 'lucide-react';

interface AiResearchTerminalProps {
  assets: MarketAsset[];
  selectedAsset?: MarketAsset | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export const AiResearchTerminal: React.FC<AiResearchTerminalProps> = ({
  assets,
  selectedAsset,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `AETHER QUANTITATIVE INTELLIGENCE INITIALIZED.\nLive telemetry active on ${assets.length} real market assets.\nAsk any institutional research question (e.g. "Kenapa BTC bergerak?", "Mana yang volume-nya paling tidak normal?", "Kenapa token ini masuk Hidden Gems?"). All conclusions are strictly backed by empirical market data.`,
      timestamp: Date.now(),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const presetQueries = [
    'Kenapa BTC bergerak?',
    'Crypto mana yang sedang memiliki momentum?',
    'Mana yang volume-nya paling tidak normal?',
    'Mana yang memiliki risiko paling tinggi?',
    'Apakah pasar saat ini dalam fase akumulasi atau distribusi?',
    selectedAsset ? `Analisis mendalam untuk ${selectedAsset.symbol.replace('USDT', '')}` : 'Token apa yang masuk Hidden Gems dan kenapa?',
  ];

  const handleSend = async (queryText?: string) => {
    const q = queryText || inputQuery;
    if (!q.trim() || isLoading) return;

    const userMsg: Message = {
      role: 'user',
      content: q,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      // Prepare compact live market context snapshot
      const topGainers = [...assets].sort((a, b) => b.change24h - a.change24h).slice(0, 5).map(a => ({
        symbol: a.symbol,
        price: a.price,
        change24h: a.change24h,
        volume: a.volume24h,
        rank: a.ranking,
        oppScore: a.opportunityScore,
      }));

      const highestVolume = [...assets].sort((a, b) => b.volume24h - a.volume24h).slice(0, 5).map(a => ({
        symbol: a.symbol,
        price: a.price,
        change24h: a.change24h,
        volume: a.volume24h,
      }));

      const topOpportunities = [...assets].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 5).map(a => ({
        symbol: a.symbol,
        score: a.opportunityScore,
        confidence: a.confidenceScore,
        risk: a.risk,
        evidence: a.evidence.pros,
      }));

      const marketSnapshot = {
        totalTracked: assets.length,
        selectedAsset: selectedAsset ? {
          symbol: selectedAsset.symbol,
          name: selectedAsset.name,
          price: selectedAsset.price,
          change24h: selectedAsset.change24h,
          high24h: selectedAsset.high24h,
          low24h: selectedAsset.low24h,
          volume24h: selectedAsset.volume24h,
          source: selectedAsset.source,
          opportunityScore: selectedAsset.opportunityScore,
          confidenceScore: selectedAsset.confidenceScore,
          ranking: selectedAsset.ranking,
          risk: selectedAsset.risk,
          evidence: selectedAsset.evidence,
          antiPumpWarnings: selectedAsset.antiPumpWarnings,
          breakoutScore: selectedAsset.breakoutScore,
          breakoutStage: selectedAsset.breakoutStage,
          breakoutClassification: selectedAsset.breakoutClassification,
          accumulationStage: selectedAsset.accumulationStage,
        } : null,
        topGainers,
        highestVolume,
        topOpportunities,
      };

      const response = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          marketContext: marketSnapshot,
          asset: selectedAsset,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const json = await response.json();
      const assistantMsg: Message = {
        role: 'assistant',
        content: json.answer || 'Analysis complete.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error('AI Research request failed:', error);
      const errorMsg: Message = {
        role: 'assistant',
        content: `Error performing market intelligence analysis: ${error.message}. Please verify the Gemini API configuration or network connectivity.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[700px] bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900/60 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
              <span>AI MARKET RESEARCH TERMINAL</span>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                GEMINI 3.8 FLASH
              </span>
            </h3>
            <span className="text-[11px] text-zinc-500 font-mono">
              EVIDENCE-GROUNDED REASONING ENGINE · LIVE DATA INGESTION
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Database className="w-3.5 h-3.5 text-zinc-500" />
          <span>{assets.length} Live Pairs Fed to Context</span>
        </div>
      </div>

      {/* Preset Queries */}
      <div className="flex items-center gap-2 p-3 bg-zinc-950 border-b border-zinc-900 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-mono text-zinc-500 shrink-0">Prompts:</span>
        {presetQueries.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(preset)}
            disabled={isLoading}
            className="px-2.5 py-1 text-[11px] font-mono text-zinc-300 hover:text-emerald-400 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 rounded-md whitespace-nowrap transition-colors shrink-0 disabled:opacity-50"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-xl p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-100'
                  : 'bg-zinc-900/70 border border-zinc-800/80 text-zinc-200'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-800/60 text-[10px] text-emerald-400 font-bold">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>AETHER RESEARCH SYNTHESIS</span>
                </div>
              )}
              {msg.content}
            </div>
            <span className="text-[10px] font-mono text-zinc-600 mt-1 px-1">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-xl flex items-center gap-3 text-xs font-mono text-zinc-400">
              <span className="animate-spin w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full" />
              <span>Synthesizing real-time market telemetry & verifying indicators...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-800/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask about volume anomalies, breakouts, accumulation structures, or risk evaluation..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 font-bold font-mono text-xs rounded-lg transition-colors flex items-center gap-2 shrink-0"
          >
            <span>Research</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
