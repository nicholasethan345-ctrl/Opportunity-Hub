const express = require('express');
const path = require('path');
const fs = require('fs');
const { config } = require('dotenv');

config();

const listingsRouter = require('./routes/listings');
const authRouter = require('./routes/auth');
const applicationsRouter = require('./routes/applications');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// CORS headers for API requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/applications', applicationsRouter);

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/details.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'details.html'));
});

app.get('/employer-dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'employer-dashboard.html'));
});

app.get('/applicants.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'applicants.html'));
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Opportunity Hub backend running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.warn('Supabase is not configured yet. Add SUPABASE_URL and SUPABASE_ANON_KEY to a .env file to enable database storage.');
  }
});

module.exports = app;
