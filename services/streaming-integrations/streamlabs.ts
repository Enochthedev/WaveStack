/**
 * Streamlabs Integration
 * Connect to Streamlabs alerts and donation events
 */
import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
import { Logger } from 'pino';

export class StreamlabsIntegration extends EventEmitter {
  private ws: WebSocket | null = null;
  private logger: Logger;
  private token: string;

  constructor(token: string, logger: Logger) {
    super();
    this.token = token;
    this.logger = logger;
  }

  connect() {
    const socketUrl = `https://sockets.streamlabs.com?token=${this.token}`;

    this.ws = new WebSocket(socketUrl);

    this.ws.on('open', () => {
      this.logger.info('✅ Connected to Streamlabs');
      this.emit('connected');
    });

    this.ws.on('message', (data: string) => {
      try {
        const event = JSON.parse(data);

        if (event.type === 'donation') {
          this.handleDonation(event);
        } else if (event.type === 'follow') {
          this.handleFollow(event);
        } else if (event.type === 'subscription') {
          this.handleSubscription(event);
        } else if (event.type === 'bits') {
          this.handleBits(event);
        }
      } catch (error) {
        this.logger.error({ err: error }, 'Error processing Streamlabs event');
      }
    });

    this.ws.on('close', () => {
      this.logger.warn('Streamlabs connection closed');
      this.emit('disconnected');

      // Reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000);
    });

    this.ws.on('error', (error) => {
      this.logger.error({ err: error }, 'Streamlabs error');
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleDonation(event: any) {
    const { name, amount, currency, message } = event.message[0];

    this.logger.info({ name, amount, currency }, 'Donation received');

    this.emit('donation', {
      name,
      amount,
      currency,
      message,
      formatted: `${name} donated ${currency}${amount}`,
    });
  }

  private handleFollow(event: any) {
    const { name } = event.message[0];

    this.logger.info({ name }, 'New follower');

    this.emit('follow', {
      name,
      formatted: `${name} just followed!`,
    });
  }

  private handleSubscription(event: any) {
    const { name, months, message } = event.message[0];

    this.logger.info({ name, months }, 'New subscription');

    this.emit('subscription', {
      name,
      months,
      message,
      formatted: `${name} subscribed (${months} months)!`,
    });
  }

  private handleBits(event: any) {
    const { name, amount, message } = event.message[0];

    this.logger.info({ name, amount }, 'Bits cheered');

    this.emit('bits', {
      name,
      amount,
      message,
      formatted: `${name} cheered ${amount} bits!`,
    });
  }
}
