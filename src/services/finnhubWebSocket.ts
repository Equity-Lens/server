import WebSocket from 'ws';
import { Server as SocketIOServer } from 'socket.io';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_WS_URL = `wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`;

class FinnhubWebSocketService {
  private ws: WebSocket | null = null;
  private io: SocketIOServer | null = null;
  private subscribedSymbols: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 3000;
  private isConnecting = false;
  private pingInterval: NodeJS.Timeout | null = null;

  // Initialize with Socket.IO server
  initialize(io: SocketIOServer): void {
    this.io = io;
    this.connect();
    console.log(' Finnhub WebSocket service initialized');
  }

  // Connect to Finnhub WebSocket
  private connect(): void {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;
    console.log(' Connecting to Finnhub WebSocket...');

    try {
      this.ws = new WebSocket(FINNHUB_WS_URL);

      this.ws.on('open', () => {
        console.log(' Finnhub WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Start ping interval to keep connection alive
        this.startPingInterval();

        // Resubscribe to all symbols after reconnection
        this.subscribedSymbols.forEach((symbol) => {
          this.sendSubscribe(symbol);
        });
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on('close', (code: number, reason: string) => {
        console.log(` Finnhub WebSocket closed: ${code} - ${reason}`);
        this.isConnecting = false;
        this.stopPingInterval();
        this.attemptReconnect();
      });

      this.ws.on('error', (err: Error) => {
        console.error(' Finnhub WebSocket error:', err.message);
        this.isConnecting = false;
      });
    } catch (err) {
      console.error(' Failed to create WebSocket:', err);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  // Handle incoming messages from Finnhub
  private handleMessage(data: WebSocket.Data): void {
    try {
      const parsed = JSON.parse(data.toString());

      // Handle trade data
      if (parsed.type === 'trade' && parsed.data && this.io) {
        parsed.data.forEach((trade: any) => {
          const priceUpdate = {
            symbol: trade.s,
            price: trade.p,
            volume: trade.v,
            timestamp: trade.t,
          };

          // Emit to all clients subscribed to this symbol's room
          this.io!.to(`stock:${trade.s}`).emit('price-update', priceUpdate);
        });
      }

      // Handle ping response
      if (parsed.type === 'ping') {
        console.log(' Received ping from Finnhub');
      }
    } catch (err) {
      console.error(' Error parsing WebSocket message:', err);
    }
  }

  // Start ping interval to keep connection alive
  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  // Stop ping interval
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Attempt to reconnect with exponential backoff
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(' Max reconnect attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(
      ` Reconnecting in ${delay / 1000}s... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Send subscribe message to Finnhub
  private sendSubscribe(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol }));
      console.log(` Subscribed to ${symbol}`);
    }
  }

  // Send unsubscribe message to Finnhub
  private sendUnsubscribe(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
      console.log(` Unsubscribed from ${symbol}`);
    }
  }

  // Public: Subscribe to a symbol
  subscribe(symbol: string): void {
    const upperSymbol = symbol.toUpperCase();

    if (!this.subscribedSymbols.has(upperSymbol)) {
      this.subscribedSymbols.add(upperSymbol);
      this.sendSubscribe(upperSymbol);
    }
  }

  // Public: Unsubscribe from a symbol
  unsubscribe(symbol: string): void {
    const upperSymbol = symbol.toUpperCase();

    if (this.subscribedSymbols.has(upperSymbol)) {
      this.subscribedSymbols.delete(upperSymbol);
      this.sendUnsubscribe(upperSymbol);
    }
  }

  // Public: Subscribe to multiple symbols
  subscribeMany(symbols: string[]): void {
    symbols.forEach((symbol) => this.subscribe(symbol));
  }

  // Public: Unsubscribe from multiple symbols
  unsubscribeMany(symbols: string[]): void {
    symbols.forEach((symbol) => this.unsubscribe(symbol));
  }

  // Public: Get all subscribed symbols
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  // Public: Check connection status
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Public: Get connection stats
  getStats(): object {
    return {
      connected: this.isConnected(),
      subscribedSymbols: this.subscribedSymbols.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // Public: Close connection
  close(): void {
    this.stopPingInterval();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscribedSymbols.clear();
    console.log(' Finnhub WebSocket service closed');
  }
}

// Export singleton instance
export const finnhubWebSocket = new FinnhubWebSocketService();
export default finnhubWebSocket;