import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Candle, TechnicalIndicators } from '../types/market';
import {
  calculateEMA,
  calculateBollingerBands,
  calculateVWAP,
  calculateRSI,
  calculateMACD,
  calculateSupportResistance,
} from '../utils/indicators';
import { Layers, TrendingUp, BarChart2, Eye, EyeOff } from 'lucide-react';

interface CandlestickChartProps {
  symbol: string;
  candles: Candle[];
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  livePrice?: number;
  source: string;
  status: string;
  lastUpdated?: number;
  indicators?: TechnicalIndicators | null;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  symbol,
  candles,
  timeframe,
  onTimeframeChange,
  livePrice,
  source,
  status,
  lastUpdated,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Indicator toggle state
  const [showEMA, setShowEMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showVWAP, setShowVWAP] = useState(true);
  const [showSR, setShowSR] = useState(true);
  const [bottomPane, setBottomPane] = useState<'volume' | 'rsi' | 'macd'>('volume');

  // Crosshair / hover state
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Timeframes supported
  const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];

  // Calculate indicators for this specific asset's real candles
  const calculated = useMemo(() => {
    if (!candles || candles.length === 0) return null;
    const closes = candles.map(c => c.close);
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    const bb = calculateBollingerBands(candles, 20, 2);
    const vwap = calculateVWAP(candles);
    const rsi = calculateRSI(candles, 14);
    const macd = calculateMACD(candles);
    const sr = calculateSupportResistance(candles);

    return { ema20, ema50, bb, vwap, rsi, macd, sr };
  }, [candles]);

  // Main drawing logic
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (!candles || candles.length === 0) {
      ctx.fillStyle = '#71717a';
      ctx.font = '13px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NO REAL OHLCV DATA AVAILABLE FOR THIS ASSET', width / 2, height / 2);
      ctx.restore();
      return;
    }

    const pricePaneHeight = height * 0.72;
    const bottomPaneHeight = height - pricePaneHeight - 24; // 24px for time scale
    const rightMargin = 72; // price scale axis
    const chartWidth = width - rightMargin;

    // View range: show up to 75 candles
    const visibleCount = Math.min(candles.length, 75);
    const visibleCandles = candles.slice(-visibleCount);
    const offset = candles.length - visibleCount;

    // Determine min/max price for scaling
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    visibleCandles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;
    });

    // Account for indicators in scaling if active
    if (calculated && showBollinger) {
      visibleCandles.forEach((_, idx) => {
        const actualIdx = offset + idx;
        const upper = calculated.bb.upper[actualIdx];
        const lower = calculated.bb.lower[actualIdx];
        if (!isNaN(upper) && upper > maxPrice) maxPrice = upper;
        if (!isNaN(lower) && lower < minPrice) minPrice = lower;
      });
    }

    if (minPrice === Infinity || maxPrice === -Infinity || minPrice === maxPrice) {
      minPrice = minPrice * 0.99;
      maxPrice = maxPrice * 1.01;
    }

    // Add padding to price scale
    const pricePadding = (maxPrice - minPrice) * 0.06;
    const renderMinPrice = Math.max(0, minPrice - pricePadding);
    const renderMaxPrice = maxPrice + pricePadding;
    const priceSpan = renderMaxPrice - renderMinPrice;

    const candleWidth = chartWidth / visibleCount;
    const barWidth = Math.max(2, candleWidth * 0.7);

    const priceToY = (price: number) => {
      return pricePaneHeight - ((price - renderMinPrice) / priceSpan) * pricePaneHeight;
    };

    // Draw background grid lines
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Horizontal price grid lines (5 levels)
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const y = (pricePaneHeight / gridSteps) * i;
      const p = renderMaxPrice - (priceSpan / gridSteps) * i;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price labels
      ctx.fillStyle = '#71717a';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(p >= 1000 ? p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : p.toPrecision(5), chartWidth + 6, y + 3);
    }

    // Pane separator
    ctx.setLineDash([]);
    ctx.strokeStyle = '#3f3f46';
    ctx.beginPath();
    ctx.moveTo(0, pricePaneHeight);
    ctx.lineTo(width, pricePaneHeight);
    ctx.stroke();

    // 1. Draw Support & Resistance levels if active
    if (showSR && calculated?.sr) {
      const { support, resistance } = calculated.sr;
      // Resistance
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      const resY = priceToY(resistance);
      ctx.beginPath();
      ctx.moveTo(0, resY);
      ctx.lineTo(chartWidth, resY);
      ctx.stroke();

      // Support
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      const supY = priceToY(support);
      ctx.beginPath();
      ctx.moveTo(0, supY);
      ctx.lineTo(chartWidth, supY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Draw Candlesticks
    visibleCandles.forEach((c, idx) => {
      const x = idx * candleWidth + candleWidth / 2;
      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);

      const isBullish = c.close >= c.open;
      const candleColor = isBullish ? '#10b981' : '#f43f5e';

      // Wick
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      ctx.fillStyle = candleColor;
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
      ctx.fillRect(x - barWidth / 2, bodyTop, barWidth, bodyHeight);
    });

    // 3. Draw EMA overlays
    if (showEMA && calculated) {
      // EMA 20 (Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      visibleCandles.forEach((_, idx) => {
        const actualIdx = offset + idx;
        const val = calculated.ema20[actualIdx];
        if (!isNaN(val)) {
          const x = idx * candleWidth + candleWidth / 2;
          const y = priceToY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();

      // EMA 50 (Orange/Amber)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      started = false;
      visibleCandles.forEach((_, idx) => {
        const actualIdx = offset + idx;
        const val = calculated.ema50[actualIdx];
        if (!isNaN(val)) {
          const x = idx * candleWidth + candleWidth / 2;
          const y = priceToY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }

    // 4. Draw Bollinger Bands overlay
    if (showBollinger && calculated) {
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 2]);

      // Upper
      ctx.beginPath();
      let started = false;
      visibleCandles.forEach((_, idx) => {
        const val = calculated.bb.upper[offset + idx];
        if (!isNaN(val)) {
          const x = idx * candleWidth + candleWidth / 2;
          const y = priceToY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();

      // Lower
      ctx.beginPath();
      started = false;
      visibleCandles.forEach((_, idx) => {
        const val = calculated.bb.lower[offset + idx];
        if (!isNaN(val)) {
          const x = idx * candleWidth + candleWidth / 2;
          const y = priceToY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 5. Draw VWAP overlay
    if (showVWAP && calculated) {
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      let started = false;
      visibleCandles.forEach((_, idx) => {
        const val = calculated.vwap[offset + idx];
        if (!isNaN(val)) {
          const x = idx * candleWidth + candleWidth / 2;
          const y = priceToY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }

    // 6. Draw Live Price Horizontal Line
    const activeCurrentPrice = livePrice || candles[candles.length - 1].close;
    if (activeCurrentPrice) {
      const liveY = priceToY(activeCurrentPrice);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(0, liveY);
      ctx.lineTo(chartWidth, liveY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Badge on right axis
      ctx.fillStyle = '#10b981';
      ctx.fillRect(chartWidth + 2, liveY - 9, rightMargin - 4, 18);
      ctx.fillStyle = '#09090b';
      ctx.font = 'bold 9.5px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        activeCurrentPrice >= 1000
          ? activeCurrentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : activeCurrentPrice.toPrecision(5),
        chartWidth + rightMargin / 2,
        liveY + 3.5
      );
    }

    // 7. Bottom Sub-Pane (Volume / RSI / MACD)
    const bottomStartY = pricePaneHeight + 1;

    if (bottomPane === 'volume') {
      visibleCandles.forEach((c, idx) => {
        const x = idx * candleWidth + candleWidth / 2;
        const isBullish = c.close >= c.open;
        const volHeight = maxVolume > 0 ? (c.volume / maxVolume) * (bottomPaneHeight - 12) : 0;
        const y = height - 24 - volHeight;

        ctx.fillStyle = isBullish ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)';
        ctx.fillRect(x - barWidth / 2, y, barWidth, volHeight);
      });

      // Volume label
      ctx.fillStyle = '#71717a';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`VOL (24H MAX: ${(maxVolume).toLocaleString(undefined, { maximumFractionDigits: 0 })})`, 8, bottomStartY + 12);
    } else if (bottomPane === 'rsi' && calculated) {
      // Draw RSI 70 and 30 reference lines
      const rsiY70 = bottomStartY + bottomPaneHeight * 0.3;
      const rsiY30 = bottomStartY + bottomPaneHeight * 0.7;

      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(0, rsiY70);
      ctx.lineTo(chartWidth, rsiY70);
      ctx.moveTo(0, rsiY30);
      ctx.lineTo(chartWidth, rsiY30);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#71717a';
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.fillText('70', chartWidth + 6, rsiY70 + 3);
      ctx.fillText('30', chartWidth + 6, rsiY30 + 3);

      // Plot RSI curve
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      visibleCandles.forEach((_, idx) => {
        const val = calculated.rsi[offset + idx];
        if (!isNaN(val)) {
          const x = idx * candleWidth + candleWidth / 2;
          const y = bottomStartY + (1 - val / 100) * bottomPaneHeight;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();

      const lastRSI = calculated.rsi[calculated.rsi.length - 1];
      ctx.fillStyle = '#ec4899';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText(`RSI(14): ${!isNaN(lastRSI) ? lastRSI.toFixed(1) : 'N/A'}`, 8, bottomStartY + 12);
    } else if (bottomPane === 'macd' && calculated) {
      const hist = calculated.macd.histogram;
      const maxHist = Math.max(0.0001, ...hist.slice(-visibleCount).map(h => isNaN(h) ? 0 : Math.abs(h)));
      const zeroY = bottomStartY + bottomPaneHeight / 2;

      // Histogram bars
      visibleCandles.forEach((_, idx) => {
        const val = hist[offset + idx];
        if (!isNaN(val)) {
          const x = idx * candleWidth + candleWidth / 2;
          const barH = (Math.abs(val) / maxHist) * (bottomPaneHeight / 2 - 4);
          ctx.fillStyle = val >= 0 ? '#10b981' : '#f43f5e';
          if (val >= 0) {
            ctx.fillRect(x - barWidth / 2, zeroY - barH, barWidth, barH);
          } else {
            ctx.fillRect(x - barWidth / 2, zeroY, barWidth, barH);
          }
        }
      });

      ctx.fillStyle = '#71717a';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText('MACD (12, 26, 9)', 8, bottomStartY + 12);
    }

    // 8. Time scale at bottom
    ctx.fillStyle = '#71717a';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';

    const step = Math.max(1, Math.floor(visibleCount / 6));
    for (let i = 0; i < visibleCount; i += step) {
      const c = visibleCandles[i];
      const x = i * candleWidth + candleWidth / 2;
      const d = new Date(c.time);
      const timeStr = timeframe.includes('d') || timeframe.includes('w') || timeframe.includes('M')
        ? `${d.getMonth() + 1}/${d.getDate()}`
        : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      ctx.fillText(timeStr, x, height - 8);
    }

    // 9. Interactive Crosshair
    if (mousePos && hoverIndex !== null && hoverIndex >= 0 && hoverIndex < visibleCount) {
      const hovered = visibleCandles[hoverIndex];
      const crossX = hoverIndex * candleWidth + candleWidth / 2;
      const crossY = mousePos.y;

      ctx.strokeStyle = '#a1a1aa';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(crossX, 0);
      ctx.lineTo(crossX, height - 24);
      ctx.stroke();

      // Horizontal line
      if (crossY < pricePaneHeight) {
        ctx.beginPath();
        ctx.moveTo(0, crossY);
        ctx.lineTo(chartWidth, crossY);
        ctx.stroke();

        // Price badge at crosshair
        const hoverPrice = renderMaxPrice - (crossY / pricePaneHeight) * priceSpan;
        ctx.fillStyle = '#27272a';
        ctx.fillRect(chartWidth + 2, crossY - 8, rightMargin - 4, 16);
        ctx.fillStyle = '#f4f4f5';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(hoverPrice >= 1000 ? hoverPrice.toFixed(2) : hoverPrice.toPrecision(5), chartWidth + rightMargin / 2, crossY + 3);
      }
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [candles, timeframe, livePrice, showEMA, showBollinger, showVWAP, showSR, bottomPane, mousePos, hoverIndex, calculated]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // Handle mouse interaction for crosshair
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !candles || candles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const visibleCount = Math.min(candles.length, 75);
    const rightMargin = 72;
    const chartWidth = canvas.clientWidth - rightMargin;
    const candleWidth = chartWidth / visibleCount;

    const index = Math.floor(x / candleWidth);
    if (index >= 0 && index < visibleCount) {
      setHoverIndex(index);
      setMousePos({ x, y });
    } else {
      setHoverIndex(null);
      setMousePos(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setMousePos(null);
  };

  // Currently inspected candle info
  const inspectedCandle = useMemo(() => {
    if (!candles || candles.length === 0) return null;
    const visibleCount = Math.min(candles.length, 75);
    const visibleCandles = candles.slice(-visibleCount);
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < visibleCandles.length) {
      return visibleCandles[hoverIndex];
    }
    return candles[candles.length - 1];
  }, [candles, hoverIndex]);

  return (
    <div className="flex flex-col bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden shadow-2xl">
      {/* Chart Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800/80">
        {/* Left: Timeframe Switcher (Interactive buttons, not pills) */}
        <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-lg border border-zinc-800/60">
          {timeframes.map(tf => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors ${
                timeframe === tf
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Center: Live OHLC display */}
        {inspectedCandle && (
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-zinc-400">
            <span>
              O: <span className="text-zinc-200">{inspectedCandle.open >= 1000 ? inspectedCandle.open.toFixed(2) : inspectedCandle.open.toPrecision(5)}</span>
            </span>
            <span>
              H: <span className="text-emerald-400">{inspectedCandle.high >= 1000 ? inspectedCandle.high.toFixed(2) : inspectedCandle.high.toPrecision(5)}</span>
            </span>
            <span>
              L: <span className="text-rose-400">{inspectedCandle.low >= 1000 ? inspectedCandle.low.toFixed(2) : inspectedCandle.low.toPrecision(5)}</span>
            </span>
            <span>
              C: <span className={inspectedCandle.close >= inspectedCandle.open ? 'text-emerald-400' : 'text-rose-400'}>
                {inspectedCandle.close >= 1000 ? inspectedCandle.close.toFixed(2) : inspectedCandle.close.toPrecision(5)}
              </span>
            </span>
            <span>
              V: <span className="text-zinc-300">{inspectedCandle.volume.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
            </span>
          </div>
        )}

        {/* Right: Technical Overlays & Pane Toggles */}
        <div className="flex items-center gap-2">
          {/* Overlays toggles */}
          <div className="flex items-center gap-1 bg-zinc-950/80 p-0.5 rounded-lg border border-zinc-800/60">
            <button
              onClick={() => setShowEMA(!showEMA)}
              title="Toggle EMA 20 & 50"
              className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                showEMA ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              EMA
            </button>
            <button
              onClick={() => setShowVWAP(!showVWAP)}
              title="Toggle VWAP"
              className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                showVWAP ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              VWAP
            </button>
            <button
              onClick={() => setShowBollinger(!showBollinger)}
              title="Toggle Bollinger Bands"
              className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                showBollinger ? 'bg-purple-500/20 text-purple-300' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              BB
            </button>
            <button
              onClick={() => setShowSR(!showSR)}
              title="Toggle Support / Resistance"
              className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                showSR ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              S/R
            </button>
          </div>

          {/* Sub-pane selector */}
          <div className="flex items-center gap-1 bg-zinc-950/80 p-0.5 rounded-lg border border-zinc-800/60">
            <button
              onClick={() => setBottomPane('volume')}
              className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                bottomPane === 'volume' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              VOL
            </button>
            <button
              onClick={() => setBottomPane('rsi')}
              className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                bottomPane === 'rsi' ? 'bg-pink-500/20 text-pink-300' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              RSI
            </button>
            <button
              onClick={() => setBottomPane('macd')}
              className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                bottomPane === 'macd' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              MACD
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div ref={containerRef} className="relative w-full h-[460px] cursor-crosshair">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* Legend indicator key in top left */}
        <div className="absolute top-2 left-3 flex flex-wrap items-center gap-3 text-[10px] font-mono pointer-events-none select-none">
          {showEMA && (
            <>
              <span className="text-cyan-400 flex items-center gap-1">
                <span className="inline-block w-2.5 h-0.5 bg-cyan-400"></span> EMA 20
              </span>
              <span className="text-amber-400 flex items-center gap-1">
                <span className="inline-block w-2.5 h-0.5 bg-amber-400"></span> EMA 50
              </span>
            </>
          )}
          {showVWAP && (
            <span className="text-indigo-400 flex items-center gap-1">
              <span className="inline-block w-2.5 h-0.5 bg-indigo-400"></span> VWAP
            </span>
          )}
          {showBollinger && (
            <span className="text-purple-400 flex items-center gap-1">
              <span className="inline-block w-2.5 h-0.5 bg-purple-400 border-t border-dashed"></span> BB(20,2)
            </span>
          )}
          {showSR && (
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="inline-block w-2.5 h-0.5 bg-emerald-400 border-t border-dashed"></span> S/R Levels
            </span>
          )}
        </div>
      </div>

      {/* Real-time status sub-bar at bottom */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-950 border-t border-zinc-800/80 text-[11px] text-zinc-400 font-mono">
        <div className="flex items-center gap-2">
          <span>SOURCE: <span className="text-zinc-200">{source}</span></span>
          <span aria-hidden="true">·</span>
          <div className="flex items-center gap-1.5">
            <span>STATUS:</span>
            <span
              className={`font-semibold ${
                status === 'LIVE'
                  ? 'text-emerald-400'
                  : status === 'RECONNECTING'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {status}
            </span>
            {status === 'LIVE' && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span>OHLCV: <span className="text-zinc-300">{candles.length} Real Bars</span></span>
          <span aria-hidden="true">·</span>
          <span>LAST UPDATED: <span className="text-zinc-300">{lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : new Date().toLocaleTimeString()}</span></span>
        </div>
      </div>
    </div>
  );
};
