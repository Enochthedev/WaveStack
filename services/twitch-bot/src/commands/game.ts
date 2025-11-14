/**
 * Game Command - Change stream category/game
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';
import axios from 'axios';

export class GameCommand {
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
      return this.client.say(channel, `Usage: !setgame <game name>`);
    }

    const gameName = args.join(' ');

    try {
      const authResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
          client_id: process.env.TWITCH_CLIENT_ID,
          client_secret: process.env.TWITCH_CLIENT_SECRET,
          grant_type: 'client_credentials',
        },
      });

      const accessToken = authResponse.data.access_token;

      // Search for game
      const gameResponse = await axios.get('https://api.twitch.tv/helix/games', {
        params: { name: gameName },
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID!,
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (gameResponse.data.data.length === 0) {
        return this.client.say(channel, `❌ Game not found: ${gameName}`);
      }

      const gameId = gameResponse.data.data[0].id;
      const actualGameName = gameResponse.data.data[0].name;

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

      // Update channel game
      await axios.patch(
        'https://api.twitch.tv/helix/channels',
        { game_id: gameId },
        {
          params: { broadcaster_id: broadcasterId },
          headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID!,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      await this.client.say(channel, `✅ Stream category updated to: ${actualGameName}`);

      this.logger.info({ gameName: actualGameName }, 'Stream category updated');

    } catch (error) {
      this.logger.error({ err: error }, 'Error updating game');
      await this.client.say(channel, `❌ Failed to update game`);
    }
  }
}
