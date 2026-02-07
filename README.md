

###  Project README (`README.md`)

```markdown
# 🕒 Clock Bot | Cloud Craft LLP

A custom-built **Office Culture & Productivity Bot** designed for remote team management at Cloud Craft LLP. 
This bot bridges the gap between remote work and "office presence" using strict Voice Channel validation and project-specific time tracking.

## 🚀 Core Features
* **VC-Validated Attendance:** Users must be in an Office Voice Channel to `/attendance in`.
* **Project Autocomplete:** Real-time project suggestions based on the active project database.
* **Auto-Role Tagging:** Automatically assigns Discord roles based on designations set in `/set_profile`.
* **Smart Reminders:** Automatically DMs "Ghost Workers" who are clocked in but missing from Voice Channels.
* **Weekly Digest:** Sunday evening summaries of project hours sent to `#admin-logs`.

## 🛠️ Tech Stack
* **Runtime:** Node.js v20+
* **Library:** Discord.js v14+
* **Database:** SQLite (local `clockbot.db`)
* **Automation:** Node-Cron for Auto-Lunch (1:00 PM) and VC checks

## 📋 Setup & Installation

### 1. Environment Variables
Create a `.env` file in the root:
```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_id
GUILD_ID=your_server_id

```

### 2. Installation

```bash
npm install
node deploy-commands.js
npm start

```

### 3. Server Hierarchy (Important!)

For the **Auto-Role** feature to work, the `ClockBot` role must be positioned **above** the roles it is intended to assign in your Discord Server Settings.

## 👑 Admin Commands

| Command | Description |
| --- | --- |
| `/admin project_create` | Add a new project to the active database |
| `/admin status_all` | View real-time clock status of all team members |
| `/admin roles` | View team directory, roles, and timezones |
| `/admin ping_absent` | Identify users clocked in but not in a VC |

---

**Developed for Cloud Craft LLP** *Blending Tech Mastery with Humanities & Art*

```



```