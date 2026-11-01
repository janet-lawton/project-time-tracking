const Database = require('better-sqlite3');
const dbPath = process.env.DB_PATH || 'invoice_app.db';
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    billing_address TEXT NOT NULL,
    default_hourly_rate REAL,
    currency TEXT DEFAULT 'USD'
);

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id),
    name TEXT NOT NULL,
    hourly_rate REAL,
    budget_hours REAL,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS task_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id),
    category_id INTEGER REFERENCES task_categories(id),
    custom_name TEXT,
    status TEXT DEFAULT 'not_started'
);

CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER REFERENCES tasks(id),
    start_time TEXT,
    end_time TEXT,
    duration_minutes INTEGER,
    date TEXT,
    billable INTEGER DEFAULT 1,
    invoice_id INTEGER,
    is_locked INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    invoice_number TEXT UNIQUE NOT NULL,
    issue_date TEXT NOT NULL,
    due_date TEXT,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    subtotal REAL NOT NULL,
    currency TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Seed default task categories if they don't already exist
const defaultCategories = ['Client Meeting', 'Research & Ideation', 'Design', 'Other'];
const insertCategory = db.prepare('INSERT OR IGNORE INTO task_categories (name) VALUES (?)');
defaultCategories.forEach(name => insertCategory.run(name));

module.exports = db;
