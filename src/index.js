require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const db = require('./utils/database'); // Ensure this points to your SQLite setup
const { startSchedulers } = require('./utils/scheduler');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
    ]
});

// Command Collection
client.commands = new Collection();

// Dynamically load commands from the src/commands folder
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    }
}

// Event Handling - clientReady is the modern v14+ standard
client.once('clientReady', (readyClient) => {
    console.log(`🚀 Clock Bot is online as ${readyClient.user.tag}`);
    
    // Start automation (VC Validation & Auto-Lunch at 1:00 PM)
    startSchedulers(readyClient);
});

client.on('interactionCreate', async interaction => {
    /**
     * 1. Auto-Profile Sync
     * This fixes the 'FOREIGN KEY constraint failed' by ensuring a 
     * profile exists before a time_log is created.
     */
    if (interaction.isChatInputCommand() || interaction.isAutocomplete()) {
        try {
            db.prepare(`
                INSERT INTO profiles (discord_id, username) 
                VALUES (?, ?) 
                ON CONFLICT(discord_id) DO UPDATE SET username = excluded.username
            `).run(interaction.user.id, interaction.user.username);
        } catch (err) {
            console.error("Profile sync error:", err);
        }
    }

    /**
     * 2. Handle Autocomplete requests
     * Provides the real-time project list for Cloud Craft LLP
     */
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            console.error('Autocomplete Error:', error);
        }
        return;
    }

    /**
     * 3. Handle Slash Commands
     */
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('Command Execution Error:', error);
        
        // Modern interaction flags (64 = Ephemeral/Private)
        const errorMessage = { 
            content: 'There was an error executing this command! Check the console for SQL details.', 
            flags: [64] 
        };
        
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);