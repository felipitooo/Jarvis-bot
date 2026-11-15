-- 009_web_panels_automations.sql
-- Etapa 9: Painel Web, Painel Discord e Automações/Produtividade

-- 1. Web Sessions & OAuth2 State
CREATE TABLE IF NOT EXISTS web_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_data TEXT NOT NULL,
  csrf_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_web_sessions_expires ON web_sessions(expires_at);

-- 2. Automation Tasks & Reminders
CREATE TABLE IF NOT EXISTS automation_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_at TEXT NOT NULL,
  recurrence TEXT DEFAULT 'NONE' CHECK(recurrence IN ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
  target_channel_id TEXT,
  created_at TEXT NOT NULL,
  executed_at TEXT,
  FOREIGN KEY(guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_automation_tasks_due ON automation_tasks(guild_id, status, due_at);

-- 3. Team Quests / Missions
CREATE TABLE IF NOT EXISTS automation_missions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_role_id TEXT,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED')),
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  due_at TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY(guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_automation_missions_guild ON automation_missions(guild_id, status);

-- 4. Mission Steps (Checklist)
CREATE TABLE IF NOT EXISTS automation_mission_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id INTEGER NOT NULL,
  step_order INTEGER NOT NULL,
  description TEXT NOT NULL,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_by TEXT,
  completed_at TEXT,
  FOREIGN KEY(mission_id) REFERENCES automation_missions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mission_steps_mission ON automation_mission_steps(mission_id, step_order);

-- 5. Automated Briefings Configuration
CREATE TABLE IF NOT EXISTS automation_briefing_configs (
  guild_id TEXT PRIMARY KEY,
  is_enabled INTEGER NOT NULL DEFAULT 0,
  briefing_channel_id TEXT,
  schedule_cron TEXT DEFAULT '0 8 * * *',
  last_sent_at TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);
