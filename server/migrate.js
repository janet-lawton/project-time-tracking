const Database = require('better-sqlite3');
const db = new Database('invoice_app.db');

const BASE_URL = 'https://project-time-tracking-production.up.railway.app/api';

async function main() {
  const projectIdMap = {};
  const taskIdMap = {};

  const projects = db.prepare('SELECT * FROM projects').all();
  for (const p of projects) {
    const res = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: p.client_id,
        name: p.name,
        hourly_rate: p.hourly_rate,
        budget_hours: p.budget_hours,
        is_active: p.is_active
      })
    });
    const newProject = await res.json();
    if (!res.ok) {
      console.error(`Project ${p.id} (${p.name}) failed:`, newProject);
      continue;
    }
    projectIdMap[p.id] = newProject.id;
    console.log(`Project "${p.name}": local ${p.id} -> production ${newProject.id}`);

    const tasksRes = await fetch(`${BASE_URL}/tasks?project_id=${newProject.id}`);
    const prodTasks = await tasksRes.json();
    const localTasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(p.id);

    for (const lt of localTasks) {
      const match = prodTasks.find(pt => pt.category_id === lt.category_id);
      if (match) {
        taskIdMap[lt.id] = match.id;
      } else {
        console.warn(`  No matching production task for local task ${lt.id} (category ${lt.category_id})`);
      }
    }
  }

  const timeEntries = db.prepare('SELECT * FROM time_entries').all();
  let teSuccess = 0, teFail = 0;
  for (const te of timeEntries) {
    const prodTaskId = taskIdMap[te.task_id];
    if (!prodTaskId) {
      console.warn(`Skipping time entry ${te.id}: no mapped production task for local task ${te.task_id}`);
      teFail++;
      continue;
    }
    const res = await fetch(`${BASE_URL}/time-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_id: prodTaskId,
        start_time: te.start_time,
        end_time: te.end_time,
        duration_minutes: te.duration_minutes,
        date: te.date,
        billable: !!te.billable
      })
    });
    if (res.ok) {
      teSuccess++;
    } else {
      teFail++;
      console.error(`Time entry ${te.id} failed:`, await res.json());
    }
  }
  console.log(`Time entries: ${teSuccess} created, ${teFail} failed/skipped`);

  const invoices = db.prepare('SELECT * FROM invoices').all();
  for (const inv of invoices) {
    const prodProjectId = projectIdMap[inv.project_id];
    if (!prodProjectId) {
      console.warn(`Skipping invoice ${inv.invoice_number}: no mapped production project`);
      continue;
    }
    const res = await fetch(`${BASE_URL}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: prodProjectId,
        start_date: inv.period_start,
        end_date: inv.period_end,
        due_date: inv.due_date,
        notes: inv.notes
      })
    });
    const newInvoice = await res.json();
    if (!res.ok) {
      console.error(`Invoice ${inv.invoice_number} failed:`, newInvoice);
      continue;
    }
    console.log(`Invoice ${inv.invoice_number} -> production ${newInvoice.invoice_number} (subtotal: ${newInvoice.subtotal})`);

    if (inv.status && inv.status !== 'draft') {
      const statusRes = await fetch(`${BASE_URL}/invoices/${newInvoice.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: inv.status })
      });
      if (!statusRes.ok) {
        console.error(`  Failed to set status for invoice ${newInvoice.invoice_number}`);
      }
    }
  }

  console.log('Migration complete.');
}

main().catch(err => {
  console.error('Migration script crashed:', err);
});
