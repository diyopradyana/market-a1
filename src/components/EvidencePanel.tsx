import React from 'react';
import { MarketAsset } from '../types/market';
import { ShieldAlert, CheckCircle2, AlertTriangle, Activity, BarChart3, Database } from 'lucide-react';

interface EvidencePanelProps {
  asset: MarketAsset;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ asset }) => {
  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'S+':
      case 'S':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
      case 'A+':
      case 'A':
        return 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
      case 'B':
        return 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10';
      case 'C':
        return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
      default:
        return 'text-zinc-400 border-zinc-700 bg-zinc-800/40';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'MODERATE':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'HIGH':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'VERY HIGH':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'EXTREME':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default:
        return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  const getDataQualityColor = (quality: string) => {
    switch (quality) {
      case 'A': return 'text-emerald-400';
      case 'B': return 'text-cyan-400';
      case 'C': return 'text-amber-400';
      default: return 'text-rose-400';
    }
  };

  const isLowConfidence = asset.confidenceScore < 45 || asset.opportunityScore < 40;

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-5 shadow-xl flex flex-col gap-5">
      {/* Top Header: Opportunity & Confidence Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-4 border-b border-zinc-800/80">
        {/* Opportunity Score */}
        <div className="flex flex-col gap-1 p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-lg">
          <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            OPPORTUNITY SCORE
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-zinc-100">{asset.opportunityScore}</span>
            <span className="text-xs text-zinc-500 font-mono">/ 100</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-500 ${
                asset.opportunityScore >= 75 ? 'bg-emerald-400' :
                asset.opportunityScore >= 55 ? 'bg-cyan-400' : 'bg-amber-400'
              }`}
              style={{ width: `${asset.opportunityScore}%` }}
            />
          </div>
        </div>

        {/* Confidence Score */}
        <div className="flex flex-col gap-1 p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-lg">
          <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
            CONFIDENCE SCORE
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-zinc-100">{asset.confidenceScore}</span>
            <span className="text-xs text-zinc-500 font-mono">/ 100</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-indigo-400 transition-all duration-500"
              style={{ width: `${asset.confidenceScore}%` }}
            />
          </div>
        </div>

        {/* Ranking */}
        <div className="flex flex-col gap-1 p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-lg">
          <span className="text-[11px] font-mono text-zinc-400">RANKING</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`px-2.5 py-0.5 text-lg font-bold font-mono rounded border ${getRankColor(asset.ranking)}`}>
              {asset.ranking}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">
              {asset.ranking.startsWith('S') ? 'Elite tier' : asset.ranking.startsWith('A') ? 'High grade' : 'Standard'}
            </span>
          </div>
        </div>

        {/* Risk & Data Quality */}
        <div className="flex flex-col gap-1 p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-lg">
          <span className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
            <span>RISK LEVEL</span>
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-zinc-500" />
              <span className={`font-bold ${getDataQualityColor(asset.dataQuality)}`}>Tier {asset.dataQuality}</span>
            </span>
          </span>
          <div className="mt-1">
            <span className={`inline-block px-2 py-0.5 text-xs font-mono font-bold rounded border ${getRiskColor(asset.risk)}`}>
              {asset.risk} RISK
            </span>
          </div>
        </div>
      </div>

      {/* No High-Confidence Warning if criteria not met */}
      {isLowConfidence && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-zinc-900/80 border border-zinc-800 text-zinc-400 text-xs font-mono rounded-lg">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>NO HIGH-CONFIDENCE OPPORTUNITY FOUND: Evidence insufficient to warrant institutional grade.</span>
        </div>
      )}

      {/* Anti-Pump Warnings if any */}
      {asset.antiPumpWarnings && asset.antiPumpWarnings.length > 0 && (
        <div className="flex flex-col gap-1.5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-semibold">
            <AlertTriangle className="w-4 h-4" />
            <span>ANTI-PUMP WARNING DETECTED</span>
          </div>
          <div className="flex flex-col gap-1 text-xs text-rose-300/90 font-mono">
            {asset.antiPumpWarnings.map((warn, i) => (
              <span key={i}>⚠ {warn}</span>
            ))}
          </div>
        </div>
      )}

      {/* Core Evidence: WHY THIS ASSET? vs RISKS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* WHY THIS ASSET? */}
        <div className="flex flex-col gap-2 p-3.5 bg-zinc-900/40 border border-zinc-800/60 rounded-lg">
          <h4 className="text-xs font-mono font-semibold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            WHY THIS ASSET? (EVIDENCE)
          </h4>
          <ul className="flex flex-col gap-2 text-xs font-mono text-zinc-300">
            {asset.evidence.pros.length > 0 ? (
              asset.evidence.pros.map((pro, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>{pro}</span>
                </li>
              ))
            ) : (
              <li className="text-zinc-500 italic">No significant positive catalyst observed in current window.</li>
            )}
          </ul>
        </div>

        {/* RISKS */}
        <div className="flex flex-col gap-2 p-3.5 bg-zinc-900/40 border border-zinc-800/60 rounded-lg">
          <h4 className="text-xs font-mono font-semibold text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            IDENTIFIED RISKS
          </h4>
          <ul className="flex flex-col gap-2 text-xs font-mono text-zinc-300">
            {asset.evidence.cons.length > 0 ? (
              asset.evidence.cons.map((con, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">⚠</span>
                  <span>{con}</span>
                </li>
              ))
            ) : (
              <li className="text-zinc-500 italic">No critical anomalies flagged in live telemetry.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};
