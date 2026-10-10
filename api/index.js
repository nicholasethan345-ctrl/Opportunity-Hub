const express = require('express');
const path = require('path');
const fs = require('fs');
const { config } = require('dotenv');

config();

const listingsRouter = require('../routes/listings');
const authRouter = require('../routes/auth');
const applicationsRouter = require('../routes/applications');
const { errorHandler } = require('../middleware/errorHandler');

const app = express();
const rootDir = path.join(__dirname, '..');

app.use(express.json());
app.use(express.static(rootDir));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

const dataDir = path.join(rootDir, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use('/api/auth', authRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/applications', applicationsRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.get('/details.html', (req, res) => {
  res.sendFile(path.join(rootDir, 'details.html'));
});

app.get('/employer-dashboard.html', (req, res) => {
  res.sendFile(path.join(rootDir, 'employer-dashboard.html'));
});

app.get('/applicants.html', (req, res) => {
  res.sendFile(path.join(rootDir, 'applicants.html'));
});

app.use(errorHandler);

module.exports = app;
