import {
  Candle,
  TechnicalIndicators,
  OpportunityRank,
  RiskLevel,
  DataQuality,
  BreakoutClassification,
  RadarStage,
  BreakoutDetails,
} from '../types/market';

/**
 * Calculates Simple Moving Average
 */
export function calculateSMA(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    const sum = values.slice(i - period + 1, i + 1).reduce((acc, v) => acc + v, 0);
    result.push(sum / period);
  }
  return result;
}

/**
 * Calculates Exponential Moving Average
 */
export function calculateEMA(values: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);

  let initialSMA = 0;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    if (i === period - 1) {
      initialSMA = values.slice(0, period).reduce((acc, v) => acc + v, 0) / period;
      result.push(initialSMA);
      continue;
    }
    const prevEMA = result[i - 1];
    const currentEMA = values[i] * k + prevEMA * (1 - k);
    result.push(currentEMA);
  }
  return result;
}

/**
 * Calculates Relative Strength Index (RSI 14)
 */
export function calculateRSI(candles: Candle[], period: number = 14): number[] {
  if (candles.length <= period) return candles.map(() => 50);

  const closes = candles.map((c) => c.close);
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  const rsiValues: number[] = [NaN];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    const change = changes[i];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
    rsiValues.push(NaN);
  }
  avgGain /= period;
  avgLoss /= period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let firstRSI = 100 - 100 / (1 + rs);
  rsiValues[period] = firstRSI;

  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    rsiValues.push(rsi);
  }

  return rsiValues;
}

/**
 * Calculates MACD (12, 26, 9)
 */
export function calculateMACD(candles: Candle[], fast = 12, slow = 26, signal = 9) {
  const closes = candles.map((c) => c.close);
  const emaFast = calculateEMA(closes, fast);
  const emaSlow = calculateEMA(closes, slow);

  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(emaFast[i]) || isNaN(emaSlow[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(emaFast[i] - emaSlow[i]);
    }
  }

  const validMacdLine = macdLine.map((v) => (isNaN(v) ? 0 : v));
  const signalLine = calculateEMA(validMacdLine, signal);

  const histogram: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(macdLine[i]) || isNaN(signalLine[i])) {
      histogram.push(NaN);
    } else {
      histogram.push(macdLine[i] - signalLine[i]);
    }
  }

  return { macdLine, signalLine, histogram };
}

/**
 * Calculates Bollinger Bands (20, 2)
 */
export function calculateBollingerBands(candles: Candle[], period = 20, multiplier = 2) {
  const closes = candles.map((c) => c.close);
  const sma = calculateSMA(closes, period);

  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1 || isNaN(sma[i])) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    upper.push(mean + multiplier * stdDev);
    lower.push(mean - multiplier * stdDev);
  }

  return { middle: sma, upper, lower };
}

/**
 * Calculates Average True Range (ATR 14)
 */
export function calculateATR(candles: Candle[], period = 14): number[] {
  if (candles.length < 2) return candles.map(() => 0);

  const tr: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const val1 = high - low;
    const val2 = Math.abs(high - prevClose);
    const val3 = Math.abs(low - prevClose);
    tr.push(Math.max(val1, val2, val3));
  }

  return calculateSMA(tr, period);
}

/**
 * Calculates Volume Weighted Average Price (VWAP)
 */
export function calculateVWAP(candles: Candle[]): number[] {
  const vwap: number[] = [];
  let cumulativeTypicalVol = 0;
  let cumulativeVol = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumulativeTypicalVol += typicalPrice * c.volume;
    cumulativeVol += c.volume;

    vwap.push(cumulativeVol > 0 ? cumulativeTypicalVol / cumulativeVol : c.close);
  }

  return vwap;
}

/**
 * Calculates Support and Resistance levels from pivot highs and lows
 */
export function calculateSupportResistance(candles: Candle[]): { support: number; resistance: number } {
  if (candles.length < 5) {
    const prices = candles.map((c) => c.close);
    return {
      support: Math.min(...prices),
      resistance: Math.max(...prices),
    };
  }

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  const window = Math.min(candles.length, 30);
  const recentHighs = highs.slice(-window);
  const recentLows = lows.slice(-window);

  const resistance = Math.max(...recentHighs);
  const support = Math.min(...recentLows);

  return { support, resistance };
}

/**
 * Computes all technical indicators for an asset based strictly on its candles
 */
export function computeAllIndicators(candles: Candle[]): TechnicalIndicators {
  if (!candles || candles.length === 0) {
    return {
      rsi: null,
      macd: null,
      ema20: null,
      ema50: null,
      ema200: null,
      bollinger: null,
      vwap: null,
      atr: null,
      support: null,
      resistance: null,
      volumeAvg: null,
      volumeRatio: null,
    };
  }

  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);

  const rsiArr = calculateRSI(candles, 14);
  const macdData = calculateMACD(candles);
  const ema20Arr = calculateEMA(closes, 20);
  const ema50Arr = calculateEMA(closes, 50);
  const ema200Arr = calculateEMA(closes, Math.min(200, Math.floor(closes.length * 0.8)));
  const bbData = calculateBollingerBands(candles, 20, 2);
  const vwapArr = calculateVWAP(candles);
  const atrArr = calculateATR(candles, 14);
  const sr = calculateSupportResistance(candles);

  const lastIdx = candles.length - 1;

  const recentVolSlice = volumes.slice(-20);
  const volumeAvg = recentVolSlice.reduce((a, b) => a + b, 0) / (recentVolSlice.length || 1);
  const currentVol = volumes[lastIdx];
  const volumeRatio = volumeAvg > 0 ? currentVol / volumeAvg : 1;

  const lastRSI = rsiArr[lastIdx];
  const lastMacdLine = macdData.macdLine[lastIdx];
  const lastSignalLine = macdData.signalLine[lastIdx];
  const lastHist = macdData.histogram[lastIdx];

  const lastEma20 = ema20Arr[lastIdx];
  const lastEma50 = ema50Arr[lastIdx];
  const lastEma200 = ema200Arr[lastIdx];

  const lastBBUpper = bbData.upper[lastIdx];
  const lastBBMiddle = bbData.middle[lastIdx];
  const lastBBLower = bbData.lower[lastIdx];

  const lastVWAP = vwapArr[lastIdx];
  const lastATR = atrArr[lastIdx];

  return {
    rsi: !isNaN(lastRSI) ? Math.round(lastRSI * 10) / 10 : null,
    macd:
      !isNaN(lastMacdLine) && !isNaN(lastSignalLine)
        ? {
            macd: lastMacdLine,
            signal: lastSignalLine,
            histogram: lastHist,
          }
        : null,
    ema20: !isNaN(lastEma20) ? lastEma20 : null,
    ema50: !isNaN(lastEma50) ? lastEma50 : null,
    ema200: !isNaN(lastEma200) ? lastEma200 : null,
    bollinger: !isNaN(lastBBUpper)
      ? {
          upper: lastBBUpper,
          middle: lastBBMiddle,
          lower: lastBBLower,
        }
      : null,
    vwap: !isNaN(lastVWAP) ? lastVWAP : null,
    atr: !isNaN(lastATR) ? lastATR : null,
    support: sr.support,
    resistance: sr.resistance,
    volumeAvg,
    volumeRatio: Math.round(volumeRatio * 100) / 100,
  };
}

/**
 * EXACT WEIGHTED BREAKOUT SCORE ENGINE (per user specification):
 * - Resistance breakout: 25%
 * - Volume expansion: 20%
 * - Momentum: 15%
 * - Market structure: 15%
 * - Liquidity improvement: 10%
 * - Volatility confirmation: 5%
 * - Technical confirmation: 10%
 *
 * Classification:
 * 80–100 = CONFIRMED BREAKOUT (CONFIRMATION)
 * 65–79 = VALIDATION
 * 50–64 = EARLY BREAKOUT (DISCOVERY)
 * Below 50 = do not display as opportunity (null)
 */
export function calculateBreakoutScore(params: {
  price: number;
  high24h: number;
  low24h: number;
  change24h: number;
  volume24h: number;
  openPrice?: number;
  weightedAvgPrice?: number;
  volume1h?: number;
  tradesCount?: number;
  liquidity?: number;
  indicators?: TechnicalIndicators | null;
}): BreakoutDetails {
  const {
    price,
    high24h,
    low24h,
    change24h,
    volume24h,
    openPrice,
    weightedAvgPrice,
    volume1h,
    tradesCount,
    liquidity,
    indicators,
  } = params;

  // 1. Resistance Breakout (25%)
  // Measures proximity to 24h high resistance or swing resistance
  let resistanceScore = 50;
  const resistanceRef = indicators?.resistance || high24h;
  if (resistanceRef > 0) {
    const ratio = price / resistanceRef;
    if (ratio >= 0.995) {
      resistanceScore = 95 + Math.min(5, (ratio - 0.995) * 500);
    } else if (ratio >= 0.975) {
      resistanceScore = 80 + ((ratio - 0.975) / 0.02) * 14;
    } else if (ratio >= 0.94) {
      resistanceScore = 65 + ((ratio - 0.94) / 0.035) * 14;
    } else if (ratio >= 0.88) {
      resistanceScore = 48 + ((ratio - 0.88) / 0.06) * 16;
    } else {
      resistanceScore = Math.max(15, (ratio / 0.88) * 45);
    }
  }

  // 2. Volume Expansion (20%)
  // Evaluates turnover volume or 1h volume acceleration or indicator ratio
  let volumeExpansionScore = 50;
  if (indicators?.volumeRatio) {
    if (indicators.volumeRatio >= 2.0) volumeExpansionScore = 98;
    else if (indicators.volumeRatio >= 1.4) volumeExpansionScore = 85;
    else if (indicators.volumeRatio >= 1.1) volumeExpansionScore = 70;
    else volumeExpansionScore = 52;
  } else if (volume1h !== undefined && volume24h > 0) {
    // 1h pace vs 24h average
    const hourlyPace = (volume1h * 24) / volume24h;
    if (hourlyPace >= 2.0) volumeExpansionScore = 96;
    else if (hourlyPace >= 1.3) volumeExpansionScore = 82;
    else if (hourlyPace >= 1.0) volumeExpansionScore = 68;
    else volumeExpansionScore = 50;
  } else {
    // Quote volume scale from real market data
    if (volume24h >= 25_000_000) volumeExpansionScore = 95;
    else if (volume24h >= 8_000_000) volumeExpansionScore = 82;
    else if (volume24h >= 2_000_000) volumeExpansionScore = 70;
    else if (volume24h >= 600_000) volumeExpansionScore = 58;
    else volumeExpansionScore = Math.max(20, (volume24h / 600_000) * 55);
  }

  // 3. Momentum (15%)
  // Based on real 24h change & direction
  let momentumScore = 50;
  if (change24h >= 6 && change24h <= 35) {
    momentumScore = 90 + Math.min(10, (change24h - 6));
  } else if (change24h >= 3 && change24h < 6) {
    momentumScore = 78 + ((change24h - 3) / 3) * 11;
  } else if (change24h >= 1 && change24h < 3) {
    momentumScore = 65 + ((change24h - 1) / 2) * 12;
  } else if (change24h >= 0 && change24h < 1) {
    momentumScore = 54;
  } else if (change24h < 0) {
    momentumScore = Math.max(10, 50 - Math.abs(change24h) * 4);
  }

  // 4. Market Structure (15%)
  // Range position: higher lows and trading in upper echelon of 24h range
  let marketStructureScore = 50;
  const range = high24h - low24h;
  if (range > 0) {
    const rangePos = (price - low24h) / range;
    if (rangePos >= 0.85) {
      marketStructureScore = 92 + Math.min(8, (rangePos - 0.85) * 50);
    } else if (rangePos >= 0.70) {
      marketStructureScore = 78 + ((rangePos - 0.70) / 0.15) * 13;
    } else if (rangePos >= 0.52) {
      marketStructureScore = 62 + ((rangePos - 0.52) / 0.18) * 15;
    } else if (rangePos >= 0.35) {
      marketStructureScore = 48;
    } else {
      marketStructureScore = Math.max(10, rangePos * 100);
    }
  }

  // 5. Liquidity Improvement (10%)
  let liquidityScore = 50;
  if (liquidity !== undefined && liquidity > 0) {
    if (liquidity >= 500_000) liquidityScore = 95;
    else if (liquidity >= 150_000) liquidityScore = 80;
    else if (liquidity >= 50_000) liquidityScore = 66;
    else liquidityScore = 45;
  } else {
    // Turnover depth on Binance
    if (volume24h >= 10_000_000) liquidityScore = 94;
    else if (volume24h >= 3_000_000) liquidityScore = 80;
    else if (volume24h >= 800_000) liquidityScore = 68;
    else liquidityScore = 50;
  }

  // 6. Volatility Confirmation (5%)
  // Healthy expansion width (5% - 25% range width indicates active breakout)
  let volatilityScore = 50;
  if (low24h > 0) {
    const volPct = ((high24h - low24h) / low24h) * 100;
    if (volPct >= 4 && volPct <= 22) {
      volatilityScore = 92;
    } else if (volPct > 22 && volPct <= 40) {
      volatilityScore = 75;
    } else if (volPct >= 2 && volPct < 4) {
      volatilityScore = 65;
    } else {
      volatilityScore = 45;
    }
  }

  // 7. Technical Confirmation (10%)
  // Price > VWAP, RSI in expansion, EMA structure
  let technicalScore = 50;
  const vwapRef = indicators?.vwap || weightedAvgPrice;
  if (vwapRef && vwapRef > 0) {
    if (price >= vwapRef) {
      technicalScore = 85;
      if (openPrice && price > openPrice) technicalScore += 10;
    } else {
      technicalScore = 45;
    }
  } else if (openPrice && openPrice > 0) {
    technicalScore = price >= openPrice ? 80 : 45;
  }

  if (indicators?.rsi !== null && indicators?.rsi !== undefined) {
    if (indicators.rsi >= 52 && indicators.rsi <= 68) technicalScore = Math.max(technicalScore, 92);
    else if (indicators.rsi > 68 && indicators.rsi <= 78) technicalScore = Math.max(technicalScore, 82);
    else if (indicators.rsi < 45) technicalScore = Math.min(technicalScore, 48);
  }

  // Calculate exact weighted composite score
  const finalScore = Math.round(
    resistanceScore * 0.25 +
    volumeExpansionScore * 0.20 +
    momentumScore * 0.15 +
    marketStructureScore * 0.15 +
    liquidityScore * 0.10 +
    volatilityScore * 0.05 +
    technicalScore * 0.10
  );

  let stage: RadarStage = null;
  let classification: BreakoutClassification = 'BELOW THRESHOLD';

  if (finalScore >= 80) {
    classification = 'CONFIRMED BREAKOUT';
    stage = 'CONFIRMATION';
  } else if (finalScore >= 65) {
    classification = 'VALIDATION';
    stage = 'VALIDATION';
  } else if (finalScore >= 50) {
    classification = 'EARLY BREAKOUT';
    stage = 'DISCOVERY';
  }

  return {
    score: finalScore,
    stage,
    classification,
    resistanceBreakoutScore: Math.round(resistanceScore),
    volumeExpansionScore: Math.round(volumeExpansionScore),
    momentumScore: Math.round(momentumScore),
    marketStructureScore: Math.round(marketStructureScore),
    liquidityScore: Math.round(liquidityScore),
    volatilityScore: Math.round(volatilityScore),
    technicalScore: Math.round(technicalScore),
  };
}

/**
 * WEIGHTED HIDDEN GEMS ENGINE:
 * - Volume growth & turnover (vs small/mid cap universe): 25%
 * - Buy pressure & range high retention: 20%
 * - Market structure (higher lows, steady base): 20%
 * - Emerging discovery bonus (small-to-mid cap < $1B or DEX token): 15%
 * - Momentum (positive 24h change +1.5% to +20% without extreme pump): 10%
 * - Technical confirmation (price > VWAP / low pump risk): 10%
 */
export function calculateHiddenGemsScore(params: {
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  marketCap?: number;
  liquidity?: number;
  weightedAvgPrice?: number;
  tradesCount?: number;
  buys24h?: number;
  sells24h?: number;
  antiPumpWarnings?: string[];
}): { score: number; stage: RadarStage } {
  const {
    price,
    change24h,
    volume24h,
    high24h,
    low24h,
    marketCap,
    liquidity,
    weightedAvgPrice,
    tradesCount,
    buys24h,
    sells24h,
    antiPumpWarnings,
  } = params;

  // Deduct heavily if active pump warning
  if (antiPumpWarnings && antiPumpWarnings.length > 1) {
    return { score: 35, stage: null };
  }

  // 1. Volume turnover (25%)
  let volScore = 50;
  if (volume24h >= 15_000_000) volScore = 92;
  else if (volume24h >= 3_000_000) volScore = 84;
  else if (volume24h >= 800_000) volScore = 72;
  else if (volume24h >= 250_000) volScore = 58;
  else volScore = Math.max(20, (volume24h / 250_000) * 55);

  // 2. Buy pressure (20%)
  let buyScore = 50;
  if (buys24h !== undefined && sells24h !== undefined && sells24h > 0) {
    const ratio = buys24h / sells24h;
    if (ratio >= 1.5) buyScore = 95;
    else if (ratio >= 1.15) buyScore = 80;
    else if (ratio >= 0.9) buyScore = 65;
    else buyScore = 40;
  } else if (tradesCount && tradesCount > 15_000) {
    buyScore = 85;
  } else if (tradesCount && tradesCount > 5_000) {
    buyScore = 72;
  } else {
    buyScore = 60;
  }

  // 3. Market Structure (20%)
  let structureScore = 50;
  const range = high24h - low24h;
  if (range > 0) {
    const rangePos = (price - low24h) / range;
    if (rangePos >= 0.70) structureScore = 88;
    else if (rangePos >= 0.50) structureScore = 74;
    else if (rangePos >= 0.35) structureScore = 58;
    else structureScore = 40;
  }

  // 4. Emerging Discovery Bonus (15%)
  // Small/mid cap or DEX pool
  let discoveryBonus = 60;
  if (liquidity !== undefined && liquidity > 40_000) {
    discoveryBonus = 88;
  } else if (marketCap && marketCap < 500_000_000 && marketCap > 5_000_000) {
    discoveryBonus = 85;
  } else if (volume24h > 1_000_000 && volume24h < 40_000_000) {
    discoveryBonus = 78;
  } else {
    discoveryBonus = 62;
  }

  // 5. Momentum (10%)
  let momScore = 50;
  if (change24h >= 2.5 && change24h <= 25) momScore = 92;
  else if (change24h >= 0.5 && change24h < 2.5) momScore = 75;
  else if (change24h > 25 && change24h < 60) momScore = 68; // high volatility
  else if (change24h < 0 && change24h >= -4) momScore = 52;
  else momScore = 35;

  // 6. Technical / VWAP confirmation (10%)
  let techScore = 60;
  if (weightedAvgPrice && weightedAvgPrice > 0) {
    techScore = price >= weightedAvgPrice ? 88 : 50;
  }

  const score = Math.round(
    volScore * 0.25 +
    buyScore * 0.20 +
    structureScore * 0.20 +
    discoveryBonus * 0.15 +
    momScore * 0.10 +
    techScore * 0.10
  );

  let stage: RadarStage = null;
  if (score >= 80) stage = 'CONFIRMATION';
  else if (score >= 65) stage = 'VALIDATION';
  else if (score >= 50) stage = 'DISCOVERY';

  return { score, stage };
}

/**
 * WEIGHTED ACCUMULATION ENGINE:
 * - Price consolidation in tight range: 30%
 * - Steady absorption volume: 25%
 * - Support retention / holding near VWAP: 20%
 * - Buy pressure & transaction consistency: 15%
 * - Structural stability & low pump risk: 10%
 */
export function calculateAccumulationScore(params: {
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  weightedAvgPrice?: number;
  tradesCount?: number;
  buys24h?: number;
  sells24h?: number;
  indicators?: TechnicalIndicators | null;
}): { score: number; stage: RadarStage } {
  const {
    price,
    change24h,
    volume24h,
    high24h,
    low24h,
    weightedAvgPrice,
    tradesCount,
    buys24h,
    sells24h,
    indicators,
  } = params;

  // 1. Price consolidation (30%)
  let consolidationScore = 50;
  const absChange = Math.abs(change24h);
  if (absChange <= 1.5) consolidationScore = 95;
  else if (absChange <= 3.5) consolidationScore = 84;
  else if (absChange <= 5.0) consolidationScore = 70;
  else if (absChange <= 7.0) consolidationScore = 55;
  else consolidationScore = Math.max(15, 50 - (absChange - 7) * 4);

  // Range tightness
  if (low24h > 0) {
    const rangePct = ((high24h - low24h) / low24h) * 100;
    if (rangePct <= 4.0) consolidationScore = Math.min(100, consolidationScore + 8);
    else if (rangePct <= 7.0) consolidationScore = Math.min(100, consolidationScore + 4);
    else if (rangePct > 15.0) consolidationScore = Math.max(20, consolidationScore - 15);
  }

  // 2. Steady absorption volume (25%)
  let volumeScore = 50;
  if (volume24h >= 20_000_000) volumeScore = 92;
  else if (volume24h >= 4_000_000) volumeScore = 85;
  else if (volume24h >= 1_000_000) volumeScore = 75;
  else if (volume24h >= 300_000) volumeScore = 64;
  else volumeScore = Math.max(20, (volume24h / 300_000) * 60);

  // 3. Support retention & VWAP baseline (20%)
  let supportScore = 60;
  const vwapRef = indicators?.vwap || weightedAvgPrice;
  if (vwapRef && vwapRef > 0) {
    const vwapDist = Math.abs(price - vwapRef) / vwapRef;
    if (vwapDist <= 0.015 && price >= vwapRef * 0.99) supportScore = 92;
    else if (vwapDist <= 0.03) supportScore = 80;
    else supportScore = 60;
  }

  // 4. Buy pressure & trade consistency (15%)
  let tradeScore = 55;
  if (buys24h !== undefined && sells24h !== undefined && sells24h > 0) {
    const ratio = buys24h / sells24h;
    if (ratio >= 1.05) tradeScore = 88;
    else if (ratio >= 0.9) tradeScore = 70;
  } else if (tradesCount && tradesCount > 10_000) {
    tradeScore = 85;
  } else if (tradesCount && tradesCount > 3_000) {
    tradeScore = 72;
  }

  // 5. Structural stability & RSI neutrality (10%)
  let stabilityScore = 60;
  if (indicators?.rsi !== null && indicators?.rsi !== undefined) {
    if (indicators.rsi >= 46 && indicators.rsi <= 58) stabilityScore = 95;
    else if (indicators.rsi >= 40 && indicators.rsi <= 65) stabilityScore = 80;
    else stabilityScore = 50;
  } else {
    stabilityScore = 70;
  }

  const score = Math.round(
    consolidationScore * 0.30 +
    volumeScore * 0.25 +
    supportScore * 0.20 +
    tradeScore * 0.15 +
    stabilityScore * 0.10
  );

  let stage: RadarStage = null;
  if (score >= 80) stage = 'CONFIRMATION';
  else if (score >= 65) stage = 'VALIDATION';
  else if (score >= 50) stage = 'DISCOVERY';

  return { score, stage };
}

/**
 * Calculates Opportunity Score, Confidence Score, Ranking, Risk & Evidence
 * based on verified real market data metrics
 */
export function evaluateAssetIntelligence(
  price: number,
  change24h: number,
  volume24h: number,
  high24h: number,
  low24h: number,
  source: 'Binance' | 'GeckoTerminal' | 'On-Chain',
  openPrice?: number,
  weightedAvgPrice?: number,
  tradesCount?: number,
  indicators?: TechnicalIndicators | null,
  dexData?: {
    liquidity?: number;
    volume1h?: number;
    priceChange1h?: number;
    buys?: number;
    sells?: number;
    tokenAgeDays?: number;
  }
) {
  const pros: string[] = [];
  const cons: string[] = [];

  const hasSufficientData = price > 0 && volume24h > 0 && high24h > 0 && low24h > 0;

  // 1. Calculate Breakout Score & Stages
  const breakoutDetails = calculateBreakoutScore({
    price,
    high24h,
    low24h,
    change24h,
    volume24h,
    openPrice,
    weightedAvgPrice,
    volume1h: dexData?.volume1h,
    tradesCount,
    liquidity: dexData?.liquidity,
    indicators,
  });

  // 2. Calculate Hidden Gems Score & Stages
  const hiddenGemsDetails = calculateHiddenGemsScore({
    price,
    change24h,
    volume24h,
    high24h,
    low24h,
    liquidity: dexData?.liquidity,
    weightedAvgPrice,
    tradesCount,
    buys24h: dexData?.buys,
    sells24h: dexData?.sells,
  });

  // 3. Calculate Accumulation Score & Stages
  const accumulationDetails = calculateAccumulationScore({
    price,
    change24h,
    volume24h,
    high24h,
    low24h,
    weightedAvgPrice,
    tradesCount,
    buys24h: dexData?.buys,
    sells24h: dexData?.sells,
    indicators,
  });

  // 4. Evidence derivation from real data points
  if (volume24h > 15_000_000) {
    pros.push(`High institutional volume ($${(volume24h / 1_000_000).toFixed(1)}M 24h)`);
  } else if (volume24h > 2_000_000) {
    pros.push(`Active market turnover ($${(volume24h / 1_000_000).toFixed(1)}M 24h)`);
  } else if (volume24h < 300_000) {
    cons.push(`Low 24h volume ($${Math.round(volume24h).toLocaleString()})`);
  }

  if (change24h > 15) {
    pros.push(`Strong price momentum (+${change24h.toFixed(1)}% 24h)`);
  } else if (change24h > 3) {
    pros.push(`Positive 24h momentum (+${change24h.toFixed(1)}%)`);
  } else if (change24h < -12) {
    cons.push(`Heavy 24h selloff (${change24h.toFixed(1)}%)`);
  }

  const range = high24h - low24h;
  if (range > 0) {
    const rangePosition = (price - low24h) / range;
    if (rangePosition > 0.82) {
      pros.push(`Holding near 24h high (${Math.round(rangePosition * 100)}% of range)`);
    } else if (rangePosition < 0.20) {
      cons.push(`Pinned near 24h low (${Math.round(rangePosition * 100)}% of range)`);
    }
  }

  if (breakoutDetails.stage === 'CONFIRMATION') {
    pros.push(`Confirmed breakout structure (Score ${breakoutDetails.score}/100)`);
  } else if (breakoutDetails.stage === 'VALIDATION') {
    pros.push(`Breakout setup under validation (Score ${breakoutDetails.score}/100)`);
  }

  if (accumulationDetails.stage === 'CONFIRMATION') {
    pros.push(`Tight institutional accumulation base (Score ${accumulationDetails.score}/100)`);
  }

  // DEX specific evidence
  if (dexData) {
    if (dexData.liquidity !== undefined) {
      if (dexData.liquidity > 500_000) {
        pros.push(`Deep pool liquidity ($${(dexData.liquidity / 1_000_000).toFixed(2)}M)`);
      } else if (dexData.liquidity < 40_000) {
        cons.push(`Thin pool liquidity ($${Math.round(dexData.liquidity).toLocaleString()})`);
      }
    }
    if (dexData.buys && dexData.sells && dexData.sells > 0) {
      const ratio = dexData.buys / dexData.sells;
      if (ratio > 1.4) pros.push(`Strong buy aggression (${ratio.toFixed(2)} Buy/Sell ratio)`);
    }
  }

  // Overall Opportunity Score
  const rawOpp = Math.round(
    breakoutDetails.score * 0.40 +
    hiddenGemsDetails.score * 0.35 +
    accumulationDetails.score * 0.25
  );
  const opportunityScore = Math.max(10, Math.min(98, rawOpp));

  // Confidence Score
  let confidence = 55;
  if (source === 'Binance') confidence += 25;
  if (volume24h > 5_000_000) confidence += 10;
  if (tradesCount && tradesCount > 10_000) confidence += 10;
  if (dexData?.liquidity && dexData.liquidity < 30_000) confidence -= 25;
  const confidenceScore = Math.max(15, Math.min(95, confidence));

  // Risk Rating
  let risk: RiskLevel = 'MODERATE';
  const volatility = high24h > 0 && low24h > 0 ? ((high24h - low24h) / low24h) * 100 : Math.abs(change24h);
  if (source === 'On-Chain' || source === 'GeckoTerminal') {
    if (dexData?.liquidity && dexData.liquidity < 40_000) risk = 'EXTREME';
    else if (dexData?.tokenAgeDays && dexData.tokenAgeDays < 3) risk = 'VERY HIGH';
    else if (volatility > 35) risk = 'VERY HIGH';
    else risk = 'HIGH';
  } else {
    if (volatility > 25) risk = 'HIGH';
    else if (volatility > 9) risk = 'MODERATE';
    else risk = 'LOW';
  }

  // Ranking
  let ranking: OpportunityRank = 'B';
  if (opportunityScore >= 82 && confidenceScore >= 70) ranking = 'S+';
  else if (opportunityScore >= 75 && confidenceScore >= 60) ranking = 'S';
  else if (opportunityScore >= 68 && confidenceScore >= 52) ranking = 'A+';
  else if (opportunityScore >= 60) ranking = 'A';
  else if (opportunityScore >= 48) ranking = 'B';
  else if (opportunityScore >= 35) ranking = 'C';
  else ranking = 'D';

  // Data Quality
  let dataQuality: DataQuality = 'B';
  if (source === 'Binance' && indicators?.rsi !== null) dataQuality = 'A';
  else if (source === 'Binance') dataQuality = 'B';
  else if (dexData?.liquidity && dexData?.buys) dataQuality = 'C';
  else dataQuality = 'D';

  // Anti-Pump flags
  const antiPumpWarnings: string[] = [];
  if (change24h > 45 && (dexData?.liquidity || volume24h) < 150_000) {
    antiPumpWarnings.push('POSSIBLE PUMP: Extreme price acceleration on thin liquidity');
  }
  if (dexData?.buys && dexData?.sells && dexData.sells > 0 && dexData.buys / dexData.sells > 6) {
    antiPumpWarnings.push('BUY IMBALANCE: Skewed transactions');
  }

  return {
    opportunityScore,
    confidenceScore,
    ranking,
    risk,
    dataQuality,
    hasSufficientData,
    breakoutScore: breakoutDetails.score,
    breakoutStage: breakoutDetails.stage,
    breakoutClassification: breakoutDetails.classification,
    breakoutDetails,
    hiddenGemsScore: hiddenGemsDetails.score,
    hiddenGemsStage: hiddenGemsDetails.stage,
    accumulationScore: accumulationDetails.score,
    accumulationStage: accumulationDetails.stage,
    antiPumpWarnings,
    evidence: {
      pros: pros.slice(0, 5),
      cons: cons.slice(0, 5),
    },
  };
}
