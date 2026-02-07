const cron = require('node-cron');
const db = require('./database');
const { EmbedBuilder } = require('discord.js');

/**
 * Main Scheduler function to handle automation for Cloud Craft LLP
 * @param {import('discord.js').Client} client 
 */
function startSchedulers(client) {
    
    // 1. Every 10 minutes: VC Validation Check
    // Ensures users "Punched In" are actually in the Office VC
    cron.schedule('*/10 * * * *', async () => {
        console.log('Running VC Validation check...');
        
        const activeWorkers = db.prepare(`
            SELECT user_id FROM time_logs 
            WHERE id IN (SELECT MAX(id) FROM time_logs GROUP BY user_id) 
            AND type = 'IN'
        `).all();

        for (const worker of activeWorkers) {
            try {
                const guild = client.guilds.cache.first(); 
                if (!guild) continue;

                const member = await guild.members.fetch(worker.user_id);
                
                if (member && !member.voice.channel) {
                    await member.send("🚨 **Cloud Craft Notice:** You are clocked in but not in an Office Voice Channel. Please join a VC or punch out!").catch(() => {
                        console.log(`Could not send DM to ${member.user.tag}`);
                    });
                }
            } catch (error) {
                console.error(`Error checking VC for user ${worker.user_id}:`, error.message);
            }
        }
    });

    // 2. Auto-Lunch: Move everyone to 'BREAK' status at 1:00 PM
    cron.schedule('0 13 * * *', () => {
        console.log('Triggering Auto-Lunch for active workers...');
        
        const activeWorkers = db.prepare(`
            SELECT user_id, project_id FROM time_logs 
            WHERE id IN (SELECT MAX(id) FROM time_logs GROUP BY user_id) 
            AND type = 'IN'
        `).all();

        for (const worker of activeWorkers) {
            db.prepare("INSERT INTO time_logs (user_id, project_id, type) VALUES (?, ?, 'BREAK_START')")
              .run(worker.user_id, worker.project_id);
        }
    });

    // 3. Weekly Digest: Sunday at 6:00 PM (18:00)
    // Summarizes the "Most Productive Projects" of the week
    cron.schedule('0 18 * * 0', async () => {
        console.log('Generating Weekly Digest...');
        
        // Find the designated admin-logs channel
        const channel = client.channels.cache.find(ch => ch.name === 'admin-logs');
        if (!channel) {
            console.log('Weekly Digest skipped: #admin-logs channel not found.');
            return;
        }

        // Calculate session counts per project for the last 7 days
        const report = db.prepare(`
            SELECT p.name, COUNT(t.id) as total_sessions
            FROM projects p
            JOIN time_logs t ON p.id = t.project_id
            WHERE t.timestamp >= date('now', '-7 days') AND t.type = 'IN'
            GROUP BY p.name
            ORDER BY total_sessions DESC
        `).all();

        if (report.length === 0) return;

        const digestEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📈 Weekly Project Summary')
            .setDescription('Overview of Cloud Craft LLP activity for the past 7 days.')
            .setTimestamp();

        report.forEach(row => {
            digestEmbed.addFields({ 
                name: `Project: ${row.name}`, 
                value: `Total Sessions: ${row.total_sessions}`, 
                inline: true 
            });
        });

        await channel.send({ embeds: [digestEmbed] });
    });
}

module.exports = { startSchedulers };