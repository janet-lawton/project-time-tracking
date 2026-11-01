const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/', (req, res) => {
  const { project_id, category_id, custom_name } = req.body;

  if (!project_id || !category_id) {
    return res.status(400).json({ error: 'project_id and category_id are required' });
  }

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id);
  if (!project) return res.status(400).json({ error: 'project_id does not reference an existing project' });

  const category = db.prepare('SELECT * FROM task_categories WHERE id = ?').get(category_id);
  if (!category) return res.status(400).json({ error: 'category_id does not reference an existing category' });

  const stmt = db.prepare(`
    INSERT INTO tasks (project_id, category_id, custom_name, status)
    VALUES (?, ?, ?, 'not_started')
  `);
  const result = stmt.run(project_id, category_id, custom_name || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/', (req, res) => {
  const { project_id } = req.query;

  let query = `
    SELECT t.*, tc.name AS category_name,
      COALESCE(SUM(te.duration_minutes), 0) AS total_minutes
    FROM tasks t
    JOIN task_categories tc ON t.category_id = tc.id
    LEFT JOIN time_entries te ON te.task_id = t.id
  `;
  const params = [];
  if (project_id) {
    query += ' WHERE t.project_id = ?';
    params.push(project_id);
  }
  query += ' GROUP BY t.id ORDER BY t.id';

  const tasks = db.prepare(query).all(...params);
  res.status(200).json(tasks);
});

router.get('/:id', (req, res) => {
  const task = db.prepare(`
    SELECT t.*, tc.name AS category_name,
      COALESCE(SUM(te.duration_minutes), 0) AS total_minutes
    FROM tasks t
    JOIN task_categories tc ON t.category_id = tc.id
    LEFT JOIN time_entries te ON te.task_id = t.id
    WHERE t.id = ?
    GROUP BY t.id
  `).get(req.params.id);

  if (!task) return res.status(404).json({ error: 'Not found' });
  res.status(200).json(task);
});

router.put('/:id/status', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['not_started', 'in_progress', 'paused', 'completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Not found' });

  db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, req.params.id);
  res.status(200).json({ success: true });
});

module.exports = router;