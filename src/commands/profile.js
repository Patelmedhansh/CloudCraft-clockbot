const { SlashCommandBuilder } = require('discord.js');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_profile')
        .setDescription('Set your company role and timezone')
        .addStringOption(opt => opt.setName('role').setDescription('e.g., Senior Dev, UI Designer').setRequired(true))
        .addStringOption(opt => opt.setName('timezone').setDescription('e.g., IST, GMT+5').setRequired(true)),

    async execute(interaction) {
        const roleName = interaction.options.getString('role');
        const tz = interaction.options.getString('timezone');
        const { id, username } = interaction.user;
        const member = interaction.member;

        // 1. Update SQLite Profile
        const stmt = db.prepare(`
            INSERT INTO profiles (discord_id, username, company_role, timezone)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(discord_id) DO UPDATE SET
            company_role = excluded.company_role,
            timezone = excluded.timezone
        `);
        stmt.run(id, username, roleName, tz);

        // 2. Auto-Role Tagging Logic
        // Searches for a role in the server that matches the input string
        const role = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
        
        let roleMsg = "";
        if (role) {
            try {
                await member.roles.add(role);
                roleMsg = `\n✅ Also tagged you with the **${role.name}** server role!`;
            } catch (err) {
                roleMsg = `\n⚠️ Found the role but couldn't assign it (check bot hierarchy).`;
            }
        } else {
            roleMsg = `\nℹ️ Note: No Discord role named "${roleName}" exists to tag you with.`;
        }

        await interaction.reply({
            content: `👤 **Profile Updated:** Registered as **${roleName}** in **${tz}**. ${roleMsg}`,
            flags: [64]
        });
    }
};