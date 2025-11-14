/**
 * Fun Commands
 */
import { Context } from 'telegraf';

export async function handleDice(ctx: Context) {
  const roll = Math.floor(Math.random() * 6) + 1;
  await ctx.reply(`🎲 You rolled a ${roll}!`);
}

export async function handleCoinFlip(ctx: Context) {
  const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
  await ctx.reply(`🪙 ${result}!`);
}

export async function handle8Ball(ctx: Context) {
  const responses = [
    'Yes, definitely!',
    'It is certain.',
    'Without a doubt.',
    'Most likely.',
    'Outlook good.',
    'Ask again later.',
    'Cannot predict now.',
    'Concentrate and ask again.',
    'Don\'t count on it.',
    'My reply is no.',
    'Very doubtful.',
  ];

  const response = responses[Math.floor(Math.random() * responses.length)];
  await ctx.reply(`🎱 ${response}`);
}

export async function handleRPS(ctx: Context) {
  const args = ctx.message?.text?.split(' ').slice(1);
  if (!args || args.length === 0) {
    return ctx.reply('Usage: /rps <rock|paper|scissors>');
  }

  const choices = ['rock', 'paper', 'scissors'];
  const userChoice = args[0].toLowerCase();

  if (!choices.includes(userChoice)) {
    return ctx.reply('❌ Please choose rock, paper, or scissors!');
  }

  const botChoice = choices[Math.floor(Math.random() * choices.length)];

  let result: string;
  if (userChoice === botChoice) {
    result = "It's a tie!";
  } else if (
    (userChoice === 'rock' && botChoice === 'scissors') ||
    (userChoice === 'paper' && botChoice === 'rock') ||
    (userChoice === 'scissors' && botChoice === 'paper')
  ) {
    result = 'You win!';
  } else {
    result = 'I win!';
  }

  await ctx.reply(`✊✋✌️\n\nYou: ${userChoice}\nMe: ${botChoice}\n\n${result}`);
}

export async function handleMeme(ctx: Context) {
  const memes = [
    'https://i.imgur.com/2A3u9Jx.jpg',
    'https://i.imgur.com/QfLuJqO.jpg',
    'https://i.imgur.com/8ubGFLt.jpg',
  ];

  const meme = memes[Math.floor(Math.random() * memes.length)];
  await ctx.replyWithPhoto(meme);
}

export async function handleJoke(ctx: Context) {
  const jokes = [
    'Why do programmers prefer dark mode? Because light attracts bugs! 🐛',
    'Why did the developer go broke? Because he used up all his cache! 💰',
    'A SQL query walks into a bar, walks up to two tables and asks... "Can I join you?"',
    'How many programmers does it take to change a light bulb? None, that\'s a hardware problem!',
    'Why do Java developers wear glasses? Because they can\'t C#!',
  ];

  const joke = jokes[Math.floor(Math.random() * jokes.length)];
  await ctx.reply(`😂 ${joke}`);
}

export async function handlePet(ctx: Context) {
  const pets = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'];
  const pet = pets[Math.floor(Math.random() * pets.length)];
  await ctx.reply(`${pet} *pets the ${pet}*`);
}

export async function handleHug(ctx: Context) {
  const args = ctx.message?.text?.split(' ').slice(1);
  if (!args || args.length === 0) {
    return ctx.reply('🤗 *hugs you*');
  }

  const user = args[0];
  await ctx.reply(`🤗 *hugs ${user}*`);
}

export async function handleHighFive(ctx: Context) {
  await ctx.reply('🙏 *high fives* ✋');
}

export async function handleDab(ctx: Context) {
  await ctx.reply('😎 *dabs*');
}

export async function handleDance(ctx: Context) {
  const dances = ['💃', '🕺', '🎵', '🎶'];
  const dance = dances.join(' ');
  await ctx.reply(`${dance} Let's dance! ${dance}`);
}
