/**
 * Clip Commands
 */
import { Context } from 'telegraf';
import axios from 'axios';

const CLIPPER_API = process.env.CLIPPER_API_URL || 'http://clipper:8000';

export async function handleClip(ctx: Context) {
  const args = ctx.message?.text?.split(' ').slice(1);
  const duration = args && args.length > 0 ? parseInt(args[0]) : 30;

  if (isNaN(duration) || duration < 5 || duration > 60) {
    return ctx.reply('❌ Duration must be between 5 and 60 seconds');
  }

  await ctx.reply('🎬 Creating clip...');

  try {
    // This would need actual stream URL from config/database
    const streamUrl = process.env.STREAM_URL || 'https://twitch.tv/your_channel';

    const response = await axios.post(`${CLIPPER_API}/api/v1/clip`, {
      source: streamUrl,
      start_sec: -5, // Start 5 seconds before
      duration_sec: duration,
    });

    const clipId = response.data.clip_id;

    // Poll for completion
    let complete = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!complete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusResponse = await axios.get(`${CLIPPER_API}/api/v1/clip/${clipId}`);
      const status = statusResponse.data.status;

      if (status === 'completed') {
        complete = true;
        await ctx.reply(
          `✅ Clip created!\n\n🎥 ${statusResponse.data.output_url || 'Ready for download'}`
        );
      } else if (status === 'failed') {
        await ctx.reply('❌ Failed to create clip');
        return;
      }

      attempts++;
    }

    if (!complete) {
      await ctx.reply('⏱️ Clip is still processing... Check back soon!');
    }

  } catch (error: any) {
    await ctx.reply(`❌ Error creating clip: ${error.message}`);
  }
}

export async function handleHighlights(ctx: Context) {
  try {
    const response = await axios.get(`${CLIPPER_API}/api/v1/clips/recent`);
    const clips = response.data.clips || [];

    if (clips.length === 0) {
      return ctx.reply('No recent highlights found.');
    }

    let message = '🎬 **Recent Highlights**\n\n';
    clips.slice(0, 5).forEach((clip: any, index: number) => {
      message += `${index + 1}. ${clip.title || 'Clip'} (${clip.duration}s)\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });

  } catch (error) {
    await ctx.reply('❌ Could not fetch highlights');
  }
}
