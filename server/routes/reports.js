const express = require('express');
const router = express.Router();
const db = require('../db.js');

// GET /api/reports/project-summary
// Query params: start_date (optional), end_date (optional)
// Returns: project_id, project_name, client_name, total_hours, billable_amount, budget_hours, utilization_percentage
router.get('/project-summary', (req, res) => {
  const { start_date, end_date } = req.query;
  
  let query = `
    SELECT 
      p.id AS project_id,
      p.name AS project_name,
      c.name AS client_name,
      c.currency,
      p.budget_hours,
      COALESCE(SUM(te.duration_minutes) / 60.0, 0) AS total_hours,
      COALESCE(SUM(te.duration_minutes) / 60.0 * p.hourly_rate, 0) AS billable_amount
    FROM projects p
    JOIN clients c ON c.id = p.client_id
    LEFT JOIN tasks t ON t.project_id = p.id
    LEFT JOIN time_entries te ON te.task_id = t.id
    WHERE p.is_active = 1
  `;

  const params = [];

  // Add date filters if provided
  if (start_date) {
    query += ` AND te.date >= ?`;
    params.push(start_date);
  }
  if (end_date) {
    query += ` AND te.date <= ?`;
    params.push(end_date);
  }

  query += `
    GROUP BY p.id, p.name, c.name, c.currency, p.budget_hours
    ORDER BY p.name ASC
  `;

  try {
    const stmt = db.prepare(query);
    const rows = stmt.all(...params);

    // Calculate utilization percentage for each project
    const results = rows.map(row => ({
      ...row,
      utilization_percentage: row.budget_hours && row.budget_hours > 0 
        ? Math.min(Math.round((row.total_hours / row.budget_hours) * 100), 100)
        : 0,
      // Format billable_amount based on currency
      formatted_amount: row.currency 
        ? `${row.currency} ${row.billable_amount.toFixed(2)}`
        : `$${row.billable_amount.toFixed(2)}`
    }));

    res.json(results);
  } catch (err) {
    console.error('Error generating project summary:', err);
    res.status(500).json({ error: 'Failed to generate project summary report' });
  }
});

module.exports = router;
