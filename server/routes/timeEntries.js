const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

// POST / - Start a new segment for a task
router.post('/', (req, res) => {
  const { task_id, start_time, end_time, duration_minutes, date, billable } = req.body;

  if (!task_id) {
    return res.status(400).json({ error: 'task_id is required' });
  }
  if (!date) {
    return res.status(400).json({ error: 'date is required' });
  }

  // Verify task exists
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task_id);
  if (!task) {
    return res.status(400).json({ error: 'task_id does not reference an existing task' });
  }

  const stmt = db.prepare(`
    INSERT INTO time_entries (task_id, start_time, end_time, duration_minutes, date, billable, is_locked)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    task_id,
    start_time || null,
    end_time || null,
    duration_minutes || null,
    date,
    billable !== undefined ? (billable ? 1 : 0) : 1,
    0
  );
  
  res.status(201).json({ id: result.lastInsertRowid });
});

// GET / - List time entries
router.get('/', (req, res) => {
  const { task_id } = req.query;
  
  let query = 'SELECT * FROM time_entries';
  const params = [];
  if (task_id) {
    query += ' WHERE task_id = ?';
    params.push(task_id);
  }
  query += ' ORDER BY date DESC, start_time DESC';
  
  const entries = db.prepare(query).all(...params);
  res.json(entries);
});

// GET /:id - Get a single time entry
router.get('/:id', (req, res) => {
  const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(req.params.id);
  if (!entry) {
    return res.status(404).json({ error: 'Time entry not found' });
  }
  res.json(entry);
});

// PUT /:id - Update a time entry (only if not locked)
router.put('/:id', (req, res) => {
  const { start_time, end_time, duration_minutes, date, billable } = req.body;
  
  // Check if entry exists and is not locked
  const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(req.params.id);
  if (!entry) {
    return res.status(404).json({ error: 'Time entry not found' });
  }
  if (entry.is_locked) {
    return res.status(403).json({ error: 'Cannot update a locked time entry' });
  }

  const stmt = db.prepare(`
    UPDATE time_entries 
    SET start_time = ?, end_time = ?, duration_minutes = ?, date = ?, billable = ?
    WHERE id = ?
  `);
  
  const result = stmt.run(
    start_time || null,
    end_time || null,
    duration_minutes || null,
    date,
    billable !== undefined ? (billable ? 1 : 0) : entry.billable,
    req.params.id
  );
  
  const updated = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /:id - Delete a time entry (only if not locked)
router.delete('/:id', requireAdmin, (req, res) => {
  const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(req.params.id);
  if (!entry) {
    return res.status(404).json({ error: 'Time entry not found' });
  }
  if (entry.is_locked) {
    return res.status(403).json({ error: 'Cannot delete a locked time entry' });
  }

  db.prepare('DELETE FROM time_entries WHERE id = ?').run(req.params.id);
  res.json({ message: 'Time entry deleted successfully' });
});

module.exports = router;