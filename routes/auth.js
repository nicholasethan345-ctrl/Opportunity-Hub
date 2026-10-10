const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const employersFile = path.join(__dirname, '../data/employers.json');

// Load employers from file
function loadEmployers() {
  if (!fs.existsSync(employersFile)) {
    return [];
  }
  const data = fs.readFileSync(employersFile, 'utf8');
  return JSON.parse(data);
}

// Save employers to file
function saveEmployers(employers) {
  fs.writeFileSync(employersFile, JSON.stringify(employers, null, 2));
}

// Generate simple token (in production, use JWT)
function generateToken(employerId) {
  return Buffer.from(`${employerId}:${Date.now()}`).toString('base64');
}

// Decode token
function decodeToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [employerId] = decoded.split(':');
    return employerId;
  } catch (e) {
    return null;
  }
}

// POST /api/auth/register - Register new employer
router.post('/register', (req, res) => {
  const { companyName, email, password } = req.body;

  if (!companyName || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const employers = loadEmployers();
  const existing = employers.find(e => e.email === email);

  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const employer = {
    id: Date.now().toString(),
    companyName,
    email,
    password, // In production, hash this with bcrypt
    createdAt: new Date().toISOString()
  };

  employers.push(employer);
  saveEmployers(employers);

  const token = generateToken(employer.id);

  res.status(201).json({
    success: true,
    employer: {
      id: employer.id,
      companyName: employer.companyName,
      email: employer.email
    },
    token
  });
});

// POST /api/auth/login - Login employer
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const employers = loadEmployers();
  const employer = employers.find(e => e.email === email && e.password === password);

  if (!employer) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(employer.id);

  res.json({
    success: true,
    employer: {
      id: employer.id,
      companyName: employer.companyName,
      email: employer.email
    },
    token
  });
});

// GET /api/auth/me - Get current employer (requires token)
router.get('/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const employerId = decodeToken(token);
  if (!employerId) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const employers = loadEmployers();
  const employer = employers.find(e => e.id === employerId);

  if (!employer) {
    return res.status(404).json({ error: 'Employer not found' });
  }

  res.json({
    id: employer.id,
    companyName: employer.companyName,
    email: employer.email
  });
});

// Middleware to verify token
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const employerId = decodeToken(token);
  if (!employerId) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.employerId = employerId;
  next();
}

router.verifyToken = verifyToken;

module.exports = router;
