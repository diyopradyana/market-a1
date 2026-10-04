import { LiveStatus } from '../types/market';

export interface TickerTick {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume: number;
  tradesCount: number;
  eventTime: number;
}

export interface KlineTick {
  symbol: string;
  interval: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  trades: number;
  isClosed: boolean;
}

export interface TradeTick {
  symbol: string;
  price: number;
  quantity: number;
  time: number;
  isBuyerMaker: boolean;
}

type StatusListener = (status: LiveStatus, lastTimestamp: number) => void;
type TickerListener = (tick: TickerTick) => void;
type KlineListener = (tick: KlineTick) => void;
type TradeListener = (tick: TradeTick) => void;

class BinanceWebSocketService {
  private ws: WebSocket | null = null;
  private status: LiveStatus = 'DISCONNECTED';
  private lastMessageTimestamp: number = 0;
  private staleCheckInterval: any = null;
  private reconnectTimeout: any = null;
  private subscribedStreams: Set<string> = new Set();
  
  private statusListeners: Set<StatusListener> = new Set();
  private tickerListeners: Map<string, Set<TickerListener>> = new Map();
  private klineListeners: Map<string, Set<KlineListener>> = new Map();
  private tradeListeners: Map<string, Set<TradeListener>> = new Map();

  private isIntentionalClose = false;

  constructor() {
    this.startStaleChecker();
  }

  public getStatus(): { status: LiveStatus; lastTimestamp: number } {
    return {
      status: this.status,
      lastTimestamp: this.lastMessageTimestamp,
    };
  }

  public subscribeStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.status, this.lastMessageTimestamp);
    return () => this.statusListeners.delete(listener);
  }

  private updateStatus(newStatus: LiveStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach(listener => listener(newStatus, this.lastMessageTimestamp));
    }
  }

  private startStaleChecker() {
    if (this.staleCheckInterval) clearInterval(this.staleCheckInterval);
    this.staleCheckInterval = setInterval(() => {
      if (this.status === 'LIVE') {
        const now = Date.now();
        // If no message for > 12 seconds while theoretically connected, flag as delayed
        if (now - this.lastMessageTimestamp > 12000 && this.lastMessageTimestamp > 0) {
          this.updateStatus('DATA DELAYED');
        }
      }
    }, 3000);
  }

  public connect(streams?: string[]) {
    if (streams && streams.length > 0) {
      streams.forEach(s => this.subscribedStreams.add(s.toLowerCase()));
    }

    if (this.subscribedStreams.size === 0) {
      // Default common ticker streams if none specified
      ['btcusdt@ticker', 'ethusdt@ticker', 'solusdt@ticker'].forEach(s => this.subscribedStreams.add(s));
    }

    this.isIntentionalClose = false;
    this.initWebSocket();
  }

  private initWebSocket() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }

    this.updateStatus('RECONNECTING');

    const streamList = Array.from(this.subscribedStreams).join('/');
    const url = `wss://stream.binance.com:9443/stream?streams=${streamList}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.updateStatus('LIVE');
        this.lastMessageTimestamp = Date.now();
      };

      this.ws.onmessage = (event) => {
        this.lastMessageTimestamp = Date.now();
        if (this.status !== 'LIVE') {
          this.updateStatus('LIVE');
        }

        try {
          const payload = JSON.parse(event.data);
          this.handleIncomingStreamMessage(payload);
        } catch (e) {
          console.error('Failed to parse Binance WS frame:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('Binance WS error event:', err);
        this.updateStatus('RECONNECTING');
      };

      this.ws.onclose = () => {
        if (!this.isIntentionalClose) {
          this.updateStatus('RECONNECTING');
          if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = setTimeout(() => {
            this.initWebSocket();
          }, 3000);
        } else {
          this.updateStatus('DISCONNECTED');
        }
      };
    } catch (e) {
      console.error('Binance WS connection exception:', e);
      this.updateStatus('RECONNECTING');
    }
  }

  private handleIncomingStreamMessage(payload: any) {
    const stream = payload.stream;
    const data = payload.data;
    if (!data) return;

    // 1. 24h Ticker event (e: "24hrTicker")
    if (data.e === '24hrTicker') {
      const symbol = data.s;
      const tick: TickerTick = {
        symbol: symbol,
        price: parseFloat(data.c),
        change24h: parseFloat(data.P),
        high24h: parseFloat(data.h),
        low24h: parseFloat(data.l),
        volume24h: parseFloat(data.v),
        quoteVolume: parseFloat(data.q),
        tradesCount: data.n,
        eventTime: data.E,
      };

      const listeners = this.tickerListeners.get(symbol.toUpperCase());
      if (listeners) {
        listeners.forEach(l => l(tick));
      }

      // Also notify wildcard listeners
      const allListeners = this.tickerListeners.get('*');
      if (allListeners) {
        allListeners.forEach(l => l(tick));
      }
    }

    // 2. Kline / Candlestick event (e: "kline")
    else if (data.e === 'kline') {
      const k = data.k;
      const symbol = data.s;
      const tick: KlineTick = {
        symbol: symbol,
        interval: k.i,
        time: k.t,
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
        quoteVolume: parseFloat(k.q),
        trades: k.n,
        isClosed: k.x,
      };

      const key = `${symbol.toUpperCase()}@${k.i}`;
      const listeners = this.klineListeners.get(key);
      if (listeners) {
        listeners.forEach(l => l(tick));
      }
    }

    // 3. Trade event (e: "trade")
    else if (data.e === 'trade') {
      const symbol = data.s;
      const tick: TradeTick = {
        symbol: symbol,
        price: parseFloat(data.p),
        quantity: parseFloat(data.q),
        time: data.T,
        isBuyerMaker: data.m,
      };

      const listeners = this.tradeListeners.get(symbol.toUpperCase());
      if (listeners) {
        listeners.forEach(l => l(tick));
      }
    }
  }

  /**
   * Subscribe to live 24h ticker updates for a symbol (e.g. BTCUSDT)
   */
  public subscribeTicker(symbol: string, listener: TickerListener) {
    const sym = symbol.toUpperCase();
    if (!this.tickerListeners.has(sym)) {
      this.tickerListeners.set(sym, new Set());
    }
    this.tickerListeners.get(sym)!.add(listener);

    const streamName = `${symbol.toLowerCase()}@ticker`;
    if (!this.subscribedStreams.has(streamName)) {
      this.subscribedStreams.add(streamName);
      this.sendSubscription([streamName]);
    }

    return () => {
      const set = this.tickerListeners.get(sym);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.tickerListeners.delete(sym);
        }
      }
    };
  }

  /**
   * Subscribe to live Kline / Candlestick updates for a symbol & interval (e.g. BTCUSDT, 1h)
   */
  public subscribeKline(symbol: string, interval: string, listener: KlineListener) {
    const sym = symbol.toUpperCase();
    const key = `${sym}@${interval}`;

    if (!this.klineListeners.has(key)) {
      this.klineListeners.set(key, new Set());
    }
    this.klineListeners.get(key)!.add(listener);

    const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
    if (!this.subscribedStreams.has(streamName)) {
      this.subscribedStreams.add(streamName);
      this.sendSubscription([streamName]);
    }

    return () => {
      const set = this.klineListeners.get(key);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.klineListeners.delete(key);
        }
      }
    };
  }

  /**
   * Subscribe to individual trade ticks for an active asset
   */
  public subscribeTrade(symbol: string, listener: TradeListener) {
    const sym = symbol.toUpperCase();
    if (!this.tradeListeners.has(sym)) {
      this.tradeListeners.set(sym, new Set());
    }
    this.tradeListeners.get(sym)!.add(listener);

    const streamName = `${symbol.toLowerCase()}@trade`;
    if (!this.subscribedStreams.has(streamName)) {
      this.subscribedStreams.add(streamName);
      this.sendSubscription([streamName]);
    }

    return () => {
      const set = this.tradeListeners.get(sym);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.tradeListeners.delete(sym);
        }
      }
    };
  }

  private sendSubscription(params: string[]) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const payload = {
          method: 'SUBSCRIBE',
          params: params,
          id: Date.now(),
        };
        this.ws.send(JSON.stringify(payload));
      } catch (e) {
        console.warn('Failed to send WS subscription request:', e);
      }
    }
  }

  public disconnect() {
    this.isIntentionalClose = true;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.staleCheckInterval) clearInterval(this.staleCheckInterval);
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }
    this.updateStatus('DISCONNECTED');
  }
}

export const binanceWS = new BinanceWebSocketService();
