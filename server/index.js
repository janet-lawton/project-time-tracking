const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const clientsRouter = require('./routes/clients');
const projectsRouter = require('./routes/projects');
const timeEntriesRouter = require('./routes/timeEntries');
const taskCategoriesRouter = require('./routes/taskCategories');
const tasksRouter = require('./routes/tasks');
const reportsRoutes = require('./routes/reports');
const invoicesRouter = require('./routes/invoices');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Routes - all use full /api/resource paths
app.use('/api/clients', clientsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/time-entries', timeEntriesRouter);
app.use('/api/task-categories', taskCategoriesRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/reports', reportsRoutes);
app.use('/api/invoices', invoicesRouter);

// Serve the built React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// Catch-all: send index.html for any non-API route
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));