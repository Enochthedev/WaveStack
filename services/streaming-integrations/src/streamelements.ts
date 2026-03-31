/**
 * StreamElements Integration
 * Connect to StreamElements for tips, merch, and overlay updates
 */
import axios from 'axios';
import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
import { Logger } from 'pino';

export class StreamElementsIntegration extends EventEmitter {
  private ws: WebSocket | null = null;
  private logger: Logger;
  private accountId: string;
  private jwtToken: string;

  constructor(accountId: string, jwtToken: string, logger: Logger) {
    super();
    this.accountId = accountId;
    this.jwtToken = jwtToken;
    this.logger = logger;
  }

  async connect() {
    try {
      // Get channel data
      const response = await axios.get(
        `https://api.streamelements.com/kappa/v2/channels/${this.accountId}`,
        {
          headers: { Authorization: `Bearer ${this.jwtToken}` },
        }
      );

      const channelId = response.data._id;

      // Connect to WebSocket
      this.ws = new WebSocket(`wss://realtime.streamelements.com/socket.io/?EIO=3&transport=websocket`);

      this.ws.on('open', () => {
        this.logger.info('✅ Connected to StreamElements');
        // Authenticate
        this.ws?.send(`42["authenticate",{"method":"jwt","token":"${this.jwtToken}"}]`);
        this.emit('connected');
      });

      this.ws.on('message', (data: string) => {
        this.handleMessage(data);
      });

      this.ws.on('close', () => {
        this.logger.warn('StreamElements connection closed');
        this.emit('disconnected');

        // Reconnect
        setTimeout(() => this.connect(), 5000);
      });

    } catch (error) {
      this.logger.error({ err: error }, 'Error connecting to StreamElements');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleMessage(data: string) {
    try {
      if (data.startsWith('42')) {
        const jsonData = data.substring(2);
        const [eventType, eventData] = JSON.parse(jsonData);

        if (eventType === 'event') {
          this.handleEvent(eventData);
        } else if (eventType === 'event:test') {
          this.handleTestEvent(eventData);
        }
      }
    } catch (error) {
      this.logger.error({ err: error }, 'Error handling StreamElements message');
    }
  }

  private handleEvent(eventData: any) {
    const { type, data } = eventData;

    this.logger.info({ type }, 'StreamElements event received');

    if (type === 'tip') {
      this.emit('tip', {
        name: data.username,
        amount: data.amount,
        currency: data.currency,
        message: data.message,
        formatted: `${data.username} tipped ${data.currency}${data.amount}!`,
      });
    } else if (type === 'subscriber') {
      this.emit('subscriber', {
        name: data.username,
        tier: data.tier,
        amount: data.amount,
        formatted: `${data.username} subscribed (Tier ${data.tier})!`,
      });
    } else if (type === 'follow') {
      this.emit('follow', {
        name: data.username,
        formatted: `${data.username} just followed!`,
      });
    } else if (type === 'cheer') {
      this.emit('cheer', {
        name: data.username,
        amount: data.amount,
        message: data.message,
        formatted: `${data.username} cheered ${data.amount} bits!`,
      });
    } else if (type === 'host') {
      this.emit('host', {
        name: data.username,
        viewers: data.amount,
        formatted: `${data.username} is hosting with ${data.amount} viewers!`,
      });
    } else if (type === 'raid') {
      this.emit('raid', {
        name: data.username,
        viewers: data.amount,
        formatted: `${data.username} is raiding with ${data.amount} viewers!`,
      });
    }
  }

  private handleTestEvent(eventData: any) {
    this.logger.info('StreamElements test event received');
    this.emit('test', eventData);
  }

  // API Methods
  async getStore() {
    const response = await axios.get(
      `https://api.streamelements.com/kappa/v2/store/${this.accountId}/items`,
      {
        headers: { Authorization: `Bearer ${this.jwtToken}` },
      }
    );

    return response.data;
  }

  async getTips(limit = 10) {
    const response = await axios.get(
      `https://api.streamelements.com/kappa/v2/tips/${this.accountId}`,
      {
        params: { limit },
        headers: { Authorization: `Bearer ${this.jwtToken}` },
      }
    );

    return response.data;
  }

  async getLeaderboard(type = 'tips', limit = 10) {
    const response = await axios.get(
      `https://api.streamelements.com/kappa/v2/points/${this.accountId}/top`,
      {
        params: { limit },
        headers: { Authorization: `Bearer ${this.jwtToken}` },
      }
    );

    return response.data;
  }
}
