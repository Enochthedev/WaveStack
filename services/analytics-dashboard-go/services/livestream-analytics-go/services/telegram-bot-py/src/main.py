import os
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from redis import Redis
import httpx
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

redis_client = Redis.from_url(os.getenv('REDIS_URL', 'redis://redis:6379'), decode_responses=True)
ai_url = os.getenv('AI_PERSONALITY_URL', 'http://ai-personality:8200')

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text('👋 WaveStack Telegram Bot (Python) ready! Use /help for commands.')

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        '🤖 Available commands:\n'
        '/start - Start bot\n'
        '/help - Show this message\n'
        '/points - Check your points\n'
        '/stats - Show stats\n'
        'Or just chat with me!'
    )

async def points(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = str(update.effective_user.id)
    points = redis_client.get(f'user:{user_id}:points') or '0'
    await update.message.reply_text(f'✨ You have {points} points!')

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_message = update.message.text
    user_id = str(update.effective_user.id)
    
    # Award points
    redis_client.incr(f'user:{user_id}:points')
    
    # Get AI response
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f'{ai_url}/api/v1/personality/chat',
                json={'message': user_message, 'user_id': user_id},
                timeout=30.0
            )
            if response.status_code == 200:
                ai_response = response.json().get('response', 'Hello!')
                await update.message.reply_text(ai_response)
            else:
                await update.message.reply_text('Hello! How can I help?')
    except Exception as e:
        logger.error(f'AI error: {e}')
        await update.message.reply_text('Hello! How can I help?')

def main():
    token = os.getenv('TELEGRAM_BOT_TOKEN')
    if not token:
        logger.error('TELEGRAM_BOT_TOKEN not set!')
        return
    
    app = Application.builder().token(token).build()
    
    app.add_handler(CommandHandler('start', start))
    app.add_handler(CommandHandler('help', help_command))
    app.add_handler(CommandHandler('points', points))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    logger.info('🚀 Telegram Bot (Python) starting...')
    logger.info('✅ Using mature python-telegram-bot library')
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
