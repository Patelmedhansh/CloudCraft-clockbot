const { SlashCommandBuilder, ActivityType } = require('discord.js');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('attendance')
        .setDescription('Clock in/out or manage breaks')
        .addSubcommand(sub => 
            sub.setName('in')
               .setDescription('Punch in for work')
               .addStringOption(opt => 
                    opt.setName('project')
                       .setDescription('Project name')
                       .setRequired(true)
                       .setAutocomplete(true))) // Enables real-time suggestions
        .addSubcommand(sub => sub.setName('out').setDescription('Punch out for the day'))
        .addSubcommand(sub => sub.setName('break_start').setDescription('Start your break'))
        .addSubcommand(sub => sub.setName('break_end').setDescription('Return from break')),

    /**
     * Handles the real-time project name suggestions as the user types
     */
    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused();
            
            // Fetch active projects matching the user's input from SQLite
            const projects = db.prepare("SELECT name FROM projects WHERE status = 'active' AND name LIKE ? LIMIT 25")
                               .all(`%${focusedValue}%`);

            // Respond to Discord with the list of matching projects
            await interaction.respond(
                projects.map(p => ({ name: p.name, value: p.name }))
            );
        } catch (error) {
            console.error('Autocomplete Error:', error);
            // Always respond with an empty array if there is an error to avoid "Loading options failed"
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const { user, member, client } = interaction;

        // 1. Office Culture Check: VC Validation for 'In' and 'Break End'
        if ((subcommand === 'in' || subcommand === 'break_end') && !member.voice.channel) {
            return interaction.reply({ 
                content: "⚠️ **Office Culture:** You must be in a Voice Channel to perform this action!", 
                flags: [64] 
            });
        }

        // 2. Logic for /attendance in
        if (subcommand === 'in') {
            const projectName = interaction.options.getString('project');
            const project = db.prepare("SELECT id FROM projects WHERE name = ? AND status = 'active'").get(projectName);
            
            if (!project) return interaction.reply({ content: `❌ Project "${projectName}" not found.`, flags: [64] });

            // Log the 'IN' status
            db.prepare("INSERT INTO time_logs (user_id, project_id, type) VALUES (?, ?, 'IN')").run(user.id, project.id);
            
            // Sync Discord Status Overlay
            client.user.setActivity({
                name: `Working on ${projectName}`,
                type: ActivityType.Custom,
                state: `Working on ${projectName} 🚀`
            });

            return interaction.reply(`✅ **${user.username}** clocked into **${projectName}**.`);
        }

        // 3. Logic for /attendance break_start
        if (subcommand === 'break_start') {
            db.prepare("INSERT INTO time_logs (user_id, type) VALUES (?, 'BREAK_START')").run(user.id);
            
            client.user.setActivity({
                name: 'On Break',
                type: ActivityType.Custom,
                state: 'On Break ☕'
            });

            return interaction.reply(`☕ **${user.username}** is now on break.`);
        }

        // 4. Logic for /attendance break_end
        if (subcommand === 'break_end') {
            db.prepare("INSERT INTO time_logs (user_id, type) VALUES (?, 'BREAK_END')").run(user.id);
            
            // Restore project status by finding the most recent 'IN' log
            const lastIn = db.prepare("SELECT project_id FROM time_logs WHERE user_id = ? AND type = 'IN' ORDER BY id DESC LIMIT 1").get(user.id);
            
            if (lastIn) {
                const project = db.prepare("SELECT name FROM projects WHERE id = ?").get(lastIn.project_id);
                client.user.setActivity({
                    name: `Working on ${project.name}`,
                    type: ActivityType.Custom,
                    state: `Working on ${project.name} 🚀`
                });
            }

            return interaction.reply(`🏁 **${user.username}** is back from break.`);
        }

        // 5. Logic for /attendance out
        if (subcommand === 'out') {
            db.prepare("INSERT INTO time_logs (user_id, type) VALUES (?, 'OUT')").run(user.id);
            
            // Clear Discord Presence
            client.user.setPresence({ activities: [] });
            
            return interaction.reply(`👋 **${user.username}** has clocked out. Great work!`);
        }
    }
};