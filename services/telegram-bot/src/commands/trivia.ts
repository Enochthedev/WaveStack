/**
 * Trivia Commands
 */
import { Context } from 'telegraf';
import axios from 'axios';

interface TriviaQuestion {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

const activeTrivia = new Map<string, TriviaQuestion>();

export async function handleTrivia(ctx: Context) {
  try {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;

    // Check if there's already an active trivia
    if (activeTrivia.has(chatId)) {
      return ctx.reply('⏳ There\'s already an active trivia! Answer the current question first.');
    }

    // Fetch trivia question from Open Trivia API
    const response = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple');
    const question: TriviaQuestion = response.data.results[0];

    // Store active trivia
    activeTrivia.set(chatId, question);

    // Shuffle answers
    const allAnswers = [...question.incorrect_answers, question.correct_answer];
    const shuffled = allAnswers.sort(() => Math.random() - 0.5);

    const options = shuffled.map((answer, index) =>
      String.fromCharCode(65 + index) + '. ' + decodeHTML(answer)
    ).join('\n');

    const message = `
🎯 **Trivia Time!**

${decodeHTML(question.question)}

${options}

Type the letter of your answer (A, B, C, or D)
    `.trim();

    await ctx.reply(message, { parse_mode: 'Markdown' });

    // Auto-expire after 30 seconds
    setTimeout(() => {
      if (activeTrivia.has(chatId)) {
        activeTrivia.delete(chatId);
        ctx.reply(`⏱️ Time's up! The correct answer was: ${question.correct_answer}`);
      }
    }, 30000);

  } catch (error) {
    await ctx.reply('❌ Could not fetch trivia question. Try again!');
  }
}

export async function checkTriviaAnswer(ctx: Context, answer: string) {
  const chatId = ctx.chat?.id.toString();
  if (!chatId) return false;

  const trivia = activeTrivia.get(chatId);
  if (!trivia) return false;

  // Get the letter (A, B, C, D)
  const letter = answer.toUpperCase().trim();
  if (!['A', 'B', 'C', 'D'].includes(letter)) return false;

  // Map letter to answer
  const allAnswers = [...trivia.incorrect_answers, trivia.correct_answer].sort(() => Math.random() - 0.5);
  const index = letter.charCodeAt(0) - 65;
  const selectedAnswer = allAnswers[index];

  const isCorrect = selectedAnswer === trivia.correct_answer;

  if (isCorrect) {
    await ctx.reply('✅ Correct! +50 points! 🎉');
    // Award points (would integrate with economy service)
  } else {
    await ctx.reply(`❌ Wrong! The correct answer was: ${trivia.correct_answer}`);
  }

  activeTrivia.delete(chatId);
  return true;
}

function decodeHTML(html: string): string {
  const entities: Record<string, string> = {
    '&quot;': '"',
    '&#039;': "'",
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
  };

  return html.replace(/&[^;]+;/g, match => entities[match] || match);
}
