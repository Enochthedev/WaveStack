/**
 * Deploy Slash Commands to Discord
 */
import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config();

const commands: any[] = [];

// Load all command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command) {
    commands.push(command.data.toJSON());
  }
}

// Deploy commands
const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    const data: any = await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, process.env.DISCORD_GUILD_ID!),
      { body: commands },
    );

    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('Error deploying commands:', error);
  }
})();
