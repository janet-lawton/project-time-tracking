const db = require('./db.js');

// Clear existing data - delete in correct order (child tables first)
db.prepare('DELETE FROM time_entries').run();
db.prepare('DELETE FROM invoices').run();
db.prepare('DELETE FROM tasks').run();
db.prepare('DELETE FROM projects').run();
db.prepare('DELETE FROM clients').run();

// Reset auto-increment
db.prepare("DELETE FROM sqlite_sequence WHERE name='clients'").run();
db.prepare("DELETE FROM sqlite_sequence WHERE name='projects'").run();
db.prepare("DELETE FROM sqlite_sequence WHERE name='tasks'").run();
db.prepare("DELETE FROM sqlite_sequence WHERE name='time_entries'").run();
db.prepare("DELETE FROM sqlite_sequence WHERE name='invoices'").run();

console.log('🗑️  Existing data cleared');

// Insert clients
const clients = [
  { name: 'Acme Corp', email: 'client1@example.com', billing_address: '123 Business Ave, New York, NY 10001', currency: 'USD' },
  { name: 'TechStart Inc', email: 'client2@example.com', billing_address: '456 Innovation Blvd, San Francisco, CA 94105', currency: 'USD' },
  { name: 'GreenLeaf Consulting', email: 'client3@example.com', billing_address: '789 Eco Lane, Austin, TX 78701', currency: 'USD' },
  { name: 'BlueWave Media', email: 'client4@example.com', billing_address: '321 Creative Way, Los Angeles, CA 90001', currency: 'USD' },
];

const clientIds = [];
for (const c of clients) {
  const stmt = db.prepare(`
    INSERT INTO clients (name, email, billing_address, currency)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(c.name, c.email, c.billing_address, c.currency);
  clientIds.push(result.lastInsertRowid);
  console.log(`✅ Client created: ${c.name}`);
}

// Insert projects
const projects = [
  { client_id: clientIds[0], name: 'Website Redesign', hourly_rate: 150, budget_hours: 80 },
  { client_id: clientIds[0], name: 'Mobile App Development', hourly_rate: 175, budget_hours: 120 },
  { client_id: clientIds[1], name: 'Dashboard UI/UX', hourly_rate: 140, budget_hours: 60 },
  { client_id: clientIds[1], name: 'API Integration', hourly_rate: 160, budget_hours: 40 },
  { client_id: clientIds[2], name: 'Brand Strategy', hourly_rate: 200, budget_hours: 50 },
  { client_id: clientIds[2], name: 'Social Media Campaign', hourly_rate: 120, budget_hours: 30 },
  { client_id: clientIds[3], name: 'Video Production', hourly_rate: 180, budget_hours: 70 },
  { client_id: clientIds[3], name: 'Content Writing', hourly_rate: 100, budget_hours: 25 },
];

const projectIds = [];
for (const p of projects) {
  const stmt = db.prepare(`
    INSERT INTO projects (client_id, name, hourly_rate, budget_hours, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);
  const result = stmt.run(p.client_id, p.name, p.hourly_rate, p.budget_hours);
  projectIds.push(result.lastInsertRowid);
  console.log(`✅ Project created: ${p.name}`);
}

// Get task categories
const categories = db.prepare('SELECT id, name FROM task_categories').all();
console.log(`📂 Categories found: ${categories.map(c => c.name).join(', ')}`);

// Insert tasks for each project
const taskIds = [];

for (let i = 0; i < projectIds.length; i++) {
  const projectId = projectIds[i];
  // Use different categories for different projects
  const shuffledCategories = [...categories].sort(() => Math.random() - 0.5);
  const selectedCategories = shuffledCategories.slice(0, 3);
  
  for (const cat of selectedCategories) {
    const stmt = db.prepare(`
      INSERT INTO tasks (project_id, category_id, custom_name, status)
      VALUES (?, ?, ?, 'not_started')
    `);
    const result = stmt.run(projectId, cat.id, null);
    taskIds.push(result.lastInsertRowid);
  }
  console.log(`✅ Tasks created for project ${i + 1}`);
}

// Insert time entries (last 30 days)
const now = new Date();
for (let i = 0; i < 60; i++) {
  const taskId = taskIds[Math.floor(Math.random() * taskIds.length)];
  const dayOffset = Math.floor(Math.random() * 30);
  const date = new Date(now);
  date.setDate(date.getDate() - dayOffset);
  const dateStr = date.toISOString().split('T')[0];
  
  const startHour = 8 + Math.floor(Math.random() * 6);
  const durationMinutes = 30 + Math.floor(Math.random() * 120);
  const startTime = new Date(date);
  startTime.setHours(startHour, 0, 0);
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + durationMinutes);
  
  const stmt = db.prepare(`
    INSERT INTO time_entries (task_id, start_time, end_time, duration_minutes, date, billable, is_locked)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `);
  stmt.run(
    taskId,
    startTime.toISOString(),
    endTime.toISOString(),
    durationMinutes,
    dateStr,
    Math.random() > 0.2 ? 1 : 0
  );
}
console.log('✅ Time entries created');

console.log('\n🎉 Database seeded successfully!');
console.log(`📊 Summary:`);
console.log(`   - ${clients.length} clients`);
console.log(`   - ${projects.length} projects`);
console.log(`   - ${taskIds.length} tasks`);
console.log(`   - 60 time entries`);