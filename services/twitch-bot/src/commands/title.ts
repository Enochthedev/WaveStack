/**
 * Title Command - Change stream title
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';
import axios from 'axios';

export class TitleCommand {
  private client: tmi.Client;
  private redis: RedisClientType;
  private logger: Logger;

  constructor(client: tmi.Client, redis: RedisClientType, logger: Logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
  }

  async execute(channel: string, userstate: tmi.ChatUserstate, args: string[]) {
    if (args.length === 0) {
      return this.client.say(channel, `Usage: !settitle <new title>`);
    }

    const newTitle = args.join(' ');

    try {
      // Get Twitch access token
      const authResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
          client_id: process.env.TWITCH_CLIENT_ID,
          client_secret: process.env.TWITCH_CLIENT_SECRET,
          grant_type: 'client_credentials',
        },
      });

      const accessToken = authResponse.data.access_token;

      // Get broadcaster ID
      const channelName = channel.replace('#', '');
      const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
        params: { login: channelName },
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID!,
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const broadcasterId = userResponse.data.data[0].id;

      // Update channel title
      await axios.patch(
        'https://api.twitch.tv/helix/channels',
        { title: newTitle },
        {
          params: { broadcaster_id: broadcasterId },
          headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID!,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      await this.client.say(channel, `✅ Stream title updated to: ${newTitle}`);

      this.logger.info({ newTitle }, 'Stream title updated');

    } catch (error) {
      this.logger.error({ err: error }, 'Error updating title');
      await this.client.say(channel, `❌ Failed to update title`);
    }
  }
}
