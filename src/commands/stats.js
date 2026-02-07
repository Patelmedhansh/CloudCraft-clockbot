const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats_me')
        .setDescription('View your work summary for today'),

    async execute(interaction) {
        const userId = interaction.user.id;
        
        // Fetch all logs for today for this user
        const logs = db.prepare(`
            SELECT type, timestamp FROM time_logs 
            WHERE user_id = ? AND date(timestamp) = date('now')
            ORDER BY timestamp ASC
        `).all(userId);

        if (logs.length === 0) {
            return interaction.reply("You haven't clocked in today yet!");
        }

        let totalWorkMs = 0;
        let lastInTime = null;

        logs.forEach(log => {
            const time = new Date(log.timestamp).getTime();
            if (log.type === 'IN') {
                lastInTime = time;
            } else if (log.type === 'OUT' && lastInTime) {
                totalWorkMs += (time - lastInTime);
                lastInTime = null;
            }
        });

        // If still clocked in, calculate up to now
        if (lastInTime) {
            totalWorkMs += (Date.now() - lastInTime);
        }

        const totalHours = (totalWorkMs / (1000 * 60 * 60)).toFixed(2);

        const statsEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`📊 Daily Stats: ${interaction.user.username}`)
            .addFields(
                { name: 'Total Work Time', value: `⏱️ ${totalHours} hours`, inline: true },
                { name: 'Status', value: lastInTime ? '🟢 Currently Working' : '⚪ Off Clock', inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [statsEmbed] });
    }
};