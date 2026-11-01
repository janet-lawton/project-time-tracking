const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM task_categories ORDER BY name').all();
  res.status(200).json(categories);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    const stmt = db.prepare('INSERT INTO task_categories (name) VALUES (?)');
    const result = stmt.run(name);
    res.status(201).json({ id: result.lastInsertRowid, name });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Category already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM task_categories WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Category not found' });
  }
  res.json({ message: 'Category deleted successfully' });
});

module.exports = router;