const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Founder/CEO Administrative tools')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // Subcommands
        .addSubcommand(sub => sub.setName('help').setDescription('View the complete command guide'))
        .addSubcommand(sub => sub.setName('ping_absent').setDescription('List users clocked in but not in VC'))
        .addSubcommand(sub => sub.setName('status_all').setDescription('Show real-time clock status of all team members'))
        .addSubcommand(sub => sub.setName('roles').setDescription('List registered team members and their company roles'))
        .addSubcommand(sub => 
            sub.setName('project_create')
               .setDescription('Add a new project')
               .addStringOption(opt => opt.setName('name').setDescription('Project name').setRequired(true)))
        .addSubcommand(sub => 
            sub.setName('project_archive')
               .setDescription('Archive an old project')
               .addStringOption(opt => opt.setName('name').setDescription('Project name').setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // --- HELP GUIDE ---
        if (subcommand === 'help') {
            const helpEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🕒 Clock Bot: Complete Command Guide')
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .setDescription('Cloud Craft LLP Internal Productivity System')
                .addFields(
                    { name: '🚀 Attendance', value: '`/attendance in [project]` - Clock in (VC required)\n`/attendance out` - Clock out for the day\n`/attendance break_start` - Start break (☕ status)\n`/attendance break_end` - Return to work' },
                    { name: '👤 Personal & Profile', value: '`/set_profile [role] [tz]` - Update designation & get tagged\n`/stats_me` - View your daily hours & activity logs' },
                    { name: '🛠️ Admin: Oversight', value: '`/admin status_all` - Real-time activity of everyone\n`/admin roles` - Directory of team roles & timezones\n`/admin ping_absent` - Find users clocked in but missing from VC' },
                    { name: '🏗️ Admin: Project Management', value: '`/admin project_create [name]` - Add new active project\n`/admin project_archive [name]` - Deactivate old projects' }
                )
                .setFooter({ text: 'Cloud Craft LLP • Precision & Polymathy' });
            
            return interaction.reply({ embeds: [helpEmbed] });
        }

        // --- PING ABSENT ---
        if (subcommand === 'ping_absent') {
            const activeWorkers = db.prepare(`
                SELECT user_id FROM time_logs 
                WHERE id IN (SELECT MAX(id) FROM time_logs GROUP BY user_id) 
                AND type = 'IN'
            `).all();

            let absentList = [];
            for (const worker of activeWorkers) {
                const member = await interaction.guild.members.fetch(worker.user_id).catch(() => null);
                if (member && !member.voice.channel) {
                    absentList.push(`<@${worker.user_id}>`);
                }
            }

            if (absentList.length === 0) return interaction.reply("✅ Everyone clocked in is currently in a VC.");
            return interaction.reply(`🚨 **Ghost Workers:** Clocked in but missing from VC:\n${absentList.join(', ')}`);
        }

        // --- STATUS ALL ---
        if (subcommand === 'status_all') {
            const latestLogs = db.prepare(`
                SELECT p.username, t.type, pr.name as project_name
                FROM profiles p
                LEFT JOIN time_logs t ON t.id = (
                    SELECT id FROM time_logs WHERE user_id = p.discord_id ORDER BY timestamp DESC LIMIT 1
                )
                LEFT JOIN projects pr ON t.project_id = pr.id
            `).all();

            const statusEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🏢 Cloud Craft LLP: Live Office Status')
                .setTimestamp();

            latestLogs.forEach(log => {
                let statusEmoji = '⚪';
                let activity = 'Clocked Out';

                if (log.type === 'IN') {
                    statusEmoji = '🟢';
                    activity = `Working on **${log.project_name || 'Tasks'}**`;
                } else if (log.type === 'BREAK_START' || log.type === 'BREAK_END') {
                    statusEmoji = '🟡';
                    activity = 'On Break ☕';
                }

                statusEmbed.addFields({ name: `${statusEmoji} ${log.username}`, value: activity });
            });

            return interaction.reply({ embeds: [statusEmbed] });
        }

        // --- ROLES DIRECTORY ---
        if (subcommand === 'roles') {
            const profiles = db.prepare("SELECT username, company_role, timezone FROM profiles").all();
            if (profiles.length === 0) return interaction.reply("No profiles registered.");

            const roleEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('👥 Team Directory: Roles & Timezones');

            profiles.forEach(p => {
                roleEmbed.addFields({ 
                    name: p.username, 
                    value: `Role: **${p.company_role || 'Freelancer'}**\nTZ: \`${p.timezone || 'IST'}\``, 
                    inline: true 
                });
            });

            return interaction.reply({ embeds: [roleEmbed] });
        }

        // --- PROJECT CREATION ---
        if (subcommand === 'project_create') {
            const name = interaction.options.getString('name');
            try {
                db.prepare("INSERT INTO projects (name, status) VALUES (?, 'active')").run(name);
                await interaction.reply(`🏗️ Project **${name}** created and is now active.`);
            } catch (err) {
                await interaction.reply({ content: "❌ Project name already exists or database is busy.", flags: [64] });
            }
        }

        // --- PROJECT ARCHIVE ---
        if (subcommand === 'project_archive') {
            const name = interaction.options.getString('name');
            const result = db.prepare("UPDATE projects SET status = 'archived' WHERE name = ?").run(name);
            
            if (result.changes > 0) {
                await interaction.reply(`📁 Project **${name}** has been archived.`);
            } else {
                await interaction.reply({ content: "❌ Project not found.", flags: [64] });
            }
        }
    }
};