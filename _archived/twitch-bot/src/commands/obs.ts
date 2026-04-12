/**
 * OBS Commands - Control OBS via WebSocket
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';
import OBSWebSocket from 'obs-websocket-js';

export class OBSCommands {
  private client: tmi.Client;
  private redis: RedisClientType;
  private logger: Logger;
  private obs: OBSWebSocket;

  constructor(client: tmi.Client, redis: RedisClientType, logger: Logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
    this.obs = new OBSWebSocket();

    this.connectOBS();
  }

  private async connectOBS() {
    try {
      await this.obs.connect(
        process.env.OBS_WEBSOCKET_URL!,
        process.env.OBS_WEBSOCKET_PASSWORD!
      );
      this.logger.info('Connected to OBS WebSocket');
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to connect to OBS');
    }
  }

  async execute(channel: string, userstate: tmi.ChatUserstate, args: string[]) {
    const command = args[0];

    try {
      if (command === 'scene' && args[1]) {
        await this.obs.call('SetCurrentProgramScene', { sceneName: args[1] });
        await this.client.say(channel, `🎬 Switched to scene: ${args[1]}`);

      } else if (command === 'source' && args[1] && args[2]) {
        const visible = args[2].toLowerCase() === 'show';
        await this.obs.call('SetSceneItemEnabled', {
          sceneName: args[1],
          sceneItemId: parseInt(args[3]),
          sceneItemEnabled: visible,
        });
        await this.client.say(channel, `👁️ Source ${visible ? 'shown' : 'hidden'}`);

      } else if (command === 'startstream') {
        await this.obs.call('StartStream');
        await this.client.say(channel, `🔴 Stream started!`);

      } else if (command === 'stopstream') {
        await this.obs.call('StopStream');
        await this.client.say(channel, `⏹️ Stream stopped!`);
      }

      this.logger.info({ command, args }, 'OBS command executed');

    } catch (error) {
      this.logger.error({ err: error, command }, 'Error executing OBS command');
      await this.client.say(channel, `@${userstate.username}, OBS command failed!`);
    }
  }
}
