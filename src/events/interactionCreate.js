const { ActivityType } = require('discord.js');
const db = require('../utils/database');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const { commandName, options, member, user, client } = interaction;

        // --- /IN COMMAND LOGIC ---
        if (commandName === 'in') {
            const projectName = options.getString('project');

            // 1. VC Validation
            if (!member.voice.channel) {
                return interaction.reply({
                    content: "⚠️ **Clock-In Denied:** You must be in an Office Voice Channel to punch in!",
                    ephemeral: true
                });
            }

            // 2. Fetch Project from SQLite
            const project = db.prepare('SELECT id FROM projects WHERE name = ? AND status = "active"')
                             .get(projectName);

            if (!project) {
                return interaction.reply({ 
                    content: `❌ Project "${projectName}" not found or is archived.`, 
                    ephemeral: true 
                });
            }

            // 3. Prevent Double Punch-In
            const lastLog = db.prepare('SELECT type FROM time_logs WHERE user_id = ? ORDER BY id DESC LIMIT 1')
                              .get(user.id);
            
            if (lastLog && lastLog.type === 'IN') {
                return interaction.reply({ content: "You are already clocked in!", ephemeral: true });
            }

            // 4. Log to Database
            const stmt = db.prepare('INSERT INTO time_logs (user_id, project_id, type) VALUES (?, ?, ?)');
            stmt.run(user.id, project.id, 'IN');

            // 5. Update Status Overlay
            client.user.setActivity({
                name: `Working on ${projectName}`,
                type: ActivityType.Custom,
                state: `Working on ${projectName} 🚀`
            });

            await interaction.reply(`✅ **${user.username}** is now clocked into **${projectName}**.`);
        }

        // --- /OUT COMMAND LOGIC ---
        if (commandName === 'out') {
            const stmt = db.prepare('INSERT INTO time_logs (user_id, type) VALUES (?, ?)');
            stmt.run(user.id, 'OUT');

            client.user.setPresence({ activities: [], status: 'online' });
            await interaction.reply(`👋 **${user.username}** has clocked out. See you tomorrow!`);
        }
    }
};