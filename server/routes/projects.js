const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all projects
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT p.*, c.name as client_name 
      FROM projects p
      JOIN clients c ON c.id = p.client_id
      ORDER BY p.name ASC
    `);
    const rows = stmt.all();
    res.json(rows);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET single project
router.get('/:id', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT p.*, c.name as client_name 
      FROM projects p
      JOIN clients c ON c.id = p.client_id
      WHERE p.id = ?
    `);
    const row = stmt.get(req.params.id);
    
    if (!row) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(row);
  } catch (err) {
    console.error('Error fetching project:', err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST create new project with auto-generated tasks
router.post('/', (req, res) => {
  const { client_id, name, hourly_rate, budget_hours, is_active } = req.body;
  
  // Validate required fields
  if (!client_id || !name) {
    return res.status(400).json({ error: 'client_id and name are required' });
  }

  try {
    // Insert the project
    const stmt = db.prepare(`
      INSERT INTO projects (client_id, name, hourly_rate, budget_hours, is_active)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      client_id,
      name,
      hourly_rate || null,
      budget_hours || null,
      is_active !== undefined ? is_active : 1
    );
    
    const projectId = result.lastInsertRowid;

    // Get all task categories
    const categories = db.prepare('SELECT id FROM task_categories').all();

    // Create default tasks for each category
    const taskStmt = db.prepare(`
      INSERT INTO tasks (project_id, category_id, custom_name, status)
      VALUES (?, ?, ?, 'not_started')
    `);

    for (const category of categories) {
      taskStmt.run(projectId, category.id, null);
    }

    // Fetch and return the new project with client name
    const newProject = db.prepare(`
      SELECT p.*, c.name as client_name 
      FROM projects p
      JOIN clients c ON c.id = p.client_id
      WHERE p.id = ?
    `).get(projectId);

    res.status(201).json(newProject);
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT update project
router.put('/:id', (req, res) => {
  const { name, hourly_rate, budget_hours, is_active } = req.body;
  
  try {
    const stmt = db.prepare(`
      UPDATE projects 
      SET name = ?, hourly_rate = ?, budget_hours = ?, is_active = ?
      WHERE id = ?
    `);
    const result = stmt.run(name, hourly_rate, budget_hours, is_active, req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const updated = db.prepare(`
      SELECT p.*, c.name as client_name 
      FROM projects p
      JOIN clients c ON c.id = p.client_id
      WHERE p.id = ?
    `).get(req.params.id);
    
    res.json(updated);
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE project
router.delete('/:id', (req, res) => {
  try {
    // Check if project has time entries
    const checkStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM time_entries te
      JOIN tasks t ON t.id = te.task_id
      WHERE t.project_id = ?
    `);
    const result = checkStmt.get(req.params.id);
    
    if (result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete project with time entries' });
    }
    
    // Delete tasks first (cascade)
    db.prepare('DELETE FROM tasks WHERE project_id = ?').run(req.params.id);
    
    // Delete project
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    const deleteResult = stmt.run(req.params.id);
    
    if (deleteResult.changes === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;