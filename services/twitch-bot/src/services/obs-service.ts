/**
 * OBS WebSocket Service
 */
import { RedisClientType } from 'redis';
import { Logger } from 'pino';
import OBSWebSocket from 'obs-websocket-js';

export class OBSService {
  private obs: OBSWebSocket;
  private redis: RedisClientType;
  private logger: Logger;

  constructor(redis: RedisClientType, logger: Logger) {
    this.redis = redis;
    this.logger = logger;
    this.obs = new OBSWebSocket();

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.obs.on('StreamStateChanged', async (data) => {
      this.logger.info({ data }, 'Stream state changed');

      if (data.outputActive) {
        await this.redis.set('obs:streaming', 'true');
        await this.redis.set('stream_start_time', Date.now().toString());
      } else {
        await this.redis.set('obs:streaming', 'false');
      }
    });

    this.obs.on('CurrentProgramSceneChanged', async (data) => {
      this.logger.info({ sceneName: data.sceneName }, 'Scene changed');
      await this.redis.set('obs:current_scene', data.sceneName);
    });

    this.obs.on('ConnectionClosed', () => {
      this.logger.warn('OBS connection closed');
    });
  }

  async connect() {
    try {
      await this.obs.connect(
        process.env.OBS_WEBSOCKET_URL!,
        process.env.OBS_WEBSOCKET_PASSWORD!
      );
      this.logger.info('✅ Connected to OBS WebSocket');

      // Get initial state
      const streamStatus = await this.obs.call('GetStreamStatus');
      await this.redis.set('obs:streaming', streamStatus.outputActive ? 'true' : 'false');

      const currentScene = await this.obs.call('GetCurrentProgramScene');
      await this.redis.set('obs:current_scene', currentScene.currentProgramSceneName);

    } catch (error) {
      this.logger.error({ err: error }, 'Failed to connect to OBS');
    }
  }

  async disconnect() {
    await this.obs.disconnect();
    this.logger.info('Disconnected from OBS');
  }

  async switchScene(sceneName: string) {
    await this.obs.call('SetCurrentProgramScene', { sceneName });
    this.logger.info({ sceneName }, 'Switched scene');
  }

  async toggleSource(sceneName: string, sourceId: number, visible: boolean) {
    await this.obs.call('SetSceneItemEnabled', {
      sceneName,
      sceneItemId: sourceId,
      sceneItemEnabled: visible,
    });
    this.logger.info({ sceneName, sourceId, visible }, 'Toggled source');
  }

  async startStream() {
    await this.obs.call('StartStream');
    this.logger.info('Started stream');
  }

  async stopStream() {
    await this.obs.call('StopStream');
    this.logger.info('Stopped stream');
  }

  async getStats() {
    const stats = await this.obs.call('GetStats');
    return stats;
  }
}
