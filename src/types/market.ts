export type AssetSource = 'Binance' | 'GeckoTerminal' | 'On-Chain';

export type LiveStatus = 'LIVE' | 'RECONNECTING' | 'DATA DELAYED' | 'DISCONNECTED';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY HIGH' | 'EXTREME';

export type OpportunityRank = 'S+' | 'S' | 'A+' | 'A' | 'B' | 'C' | 'D';

export type DataQuality = 'A' | 'B' | 'C' | 'D';

export type BreakoutClassification = 'CONFIRMED BREAKOUT' | 'VALIDATION' | 'EARLY BREAKOUT' | 'BELOW THRESHOLD';

export type RadarStage = 'DISCOVERY' | 'VALIDATION' | 'CONFIRMATION' | null;

export interface BreakoutDetails {
  score: number; // 0 - 100
  stage: RadarStage;
  classification: BreakoutClassification;
  resistanceBreakoutScore: number;
  volumeExpansionScore: number;
  momentumScore: number;
  marketStructureScore: number;
  liquidityScore: number;
  volatilityScore: number;
  technicalScore: number;
}

export interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  openPrice?: number;
  weightedAvgPrice?: number; // Real VWAP from Binance
  volume24h: number; // Quote volume (USD/USDT)
  volume1h?: number;
  priceChange1h?: number;
  volumeBase?: number;
  tradesCount?: number;
  marketCap?: number;
  fdv?: number;
  source: AssetSource;
  status: LiveStatus;
  lastUpdated: number;
  
  // On-chain specific fields
  network?: string;
  dex?: string;
  poolAddress?: string;
  liquidity?: number;
  buySellRatio?: number;
  buys24h?: number;
  sells24h?: number;
  poolCreatedAt?: string;
  tokenAgeDays?: number;
  
  // Scoring & Intelligence
  opportunityScore: number; // 0 - 100
  confidenceScore: number;  // 0 - 100
  ranking: OpportunityRank;
  risk: RiskLevel;
  dataQuality: DataQuality;
  hasSufficientData: boolean;
  
  // Radars with Weighted Scoring & Stages
  breakoutScore: number;
  breakoutStage: RadarStage;
  breakoutClassification: BreakoutClassification | null;
  breakoutDetails?: BreakoutDetails;
  
  hiddenGemsScore: number;
  hiddenGemsStage: RadarStage;
  
  accumulationScore: number;
  accumulationStage: RadarStage;
  
  isMeme?: boolean;
  isNewToken?: boolean;
  antiPumpWarnings?: string[];
  
  // Evidence
  evidence: {
    pros: string[];
    cons: string[];
  };
}

export interface Candle {
  time: number; // millisecond timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume?: number;
  trades?: number;
  isClosed?: boolean;
}

export interface TechnicalIndicators {
  rsi: number | null;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  } | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  } | null;
  vwap: number | null;
  atr: number | null;
  support: number | null;
  resistance: number | null;
  volumeAvg: number | null;
  volumeRatio: number | null;
}

export interface NewsArticle {
  id: string;
  headline: string;
  body: string;
  source: string;
  publishedAt: number;
  url: string;
  categories: string[];
  image?: string;
}

export interface MacroIndicator {
  name: string;
  category: string;
  value: string;
  previous: string;
  change: string;
  impact: string;
  status: string;
  description: string;
}

export interface UpcomingMacroEvent {
  event: string;
  date: string;
  consensus: string;
  importance: string;
}

export interface RadarDebugStats {
  assetsScanned: number;
  assetsWithValidOhlcv: number;
  assetsWithValidVolume: number;
  assetsWithValidLiquidity: number;
  assetsRejectedInsufficientData: number;
  breakoutStages: { discovery: number; validation: number; confirmation: number };
  hiddenGemsStages: { discovery: number; validation: number; confirmation: number };
  accumulationStages: { discovery: number; validation: number; confirmation: number };
  memeStages: { discovery: number; validation: number; confirmation: number };
  newTokenStages: { discovery: number; validation: number; confirmation: number };
  antiPumpCount: number;
  lastScanTimestamp: number;
  dataSources: string[];
}
