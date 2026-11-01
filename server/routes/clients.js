const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/', (req, res) => {
  const { name, email, billing_address, default_hourly_rate, currency } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  const stmt = db.prepare(`
    INSERT INTO clients (name, email, billing_address, default_hourly_rate, currency)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(name, email, billing_address || null, default_hourly_rate || null, currency || 'USD');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/', (req, res) => {
  const clients = db.prepare('SELECT * FROM clients ORDER BY name').all();
  res.json(clients);
});

router.get('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json(client);
});

router.put('/:id', (req, res) => {
  const { name, email, phone, billing_address, default_hourly_rate, currency } = req.body;
  
  const stmt = db.prepare(`
    UPDATE clients 
    SET name = ?, email = ?, phone = ?, billing_address = ?, default_hourly_rate = ?, currency = ?
    WHERE id = ?
  `);
  const result = stmt.run(name, email, phone || null, billing_address, default_hourly_rate || null, currency || 'USD', req.params.id);
  
  if (result.changes === 0) return res.status(404).json({ error: 'Client not found' });
  
  const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Client not found' });
  res.json({ message: 'Client deleted successfully' });
});

module.exports = router;