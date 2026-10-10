const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { supabase } = require('../lib/supabase');

const employersFile = path.join(__dirname, '../data/employers.json');

function normalizeEmployer(record) {
  if (!record) return null;

  return {
    id: record.id,
    companyName: record.company_name ?? record.companyName ?? 'Unknown Company',
    email: record.email,
    password: record.password,
    createdAt: record.created_at ?? record.createdAt ?? new Date().toISOString(),
  };
}

function loadEmployers() {
  if (!fs.existsSync(employersFile)) {
    return [];
  }

  const data = fs.readFileSync(employersFile, 'utf8');
  return JSON.parse(data);
}

function saveEmployers(employers) {
  fs.writeFileSync(employersFile, JSON.stringify(employers, null, 2));
}

async function getEmployersFromStore() {
  if (!supabase) {
    return loadEmployers();
  }

  const { data, error } = await supabase.from('employers').select('*');
  if (error) {
    throw error;
  }

  return (data || []).map(normalizeEmployer);
}

async function getEmployerByEmail(email) {
  if (!supabase) {
    return loadEmployers().find((employer) => employer.email === email) || null;
  }

  const { data, error } = await supabase
    .from('employers')
    .select('*')
    .eq('email', email)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeEmployer(data);
}

async function getEmployerById(id) {
  if (!supabase) {
    const employers = loadEmployers();
    return employers.find((employer) => employer.id === id) || null;
  }

  const { data, error } = await supabase
    .from('employers')
    .select('*')
    .eq('id', id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeEmployer(data);
}

async function createEmployerRecord(employer) {
  if (!supabase) {
    const employers = loadEmployers();
    employers.push(employer);
    saveEmployers(employers);
    return employer;
  }

  const { data, error } = await supabase
    .from('employers')
    .insert([
      {
        id: employer.id,
        company_name: employer.companyName,
        email: employer.email,
        password: employer.password,
        created_at: employer.createdAt,
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return normalizeEmployer(data);
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
router.post('/register', async (req, res) => {
  const { companyName, email, password } = req.body;

  if (!companyName || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const employers = await getEmployersFromStore();
    const existing = employers.find((employer) => employer.email === email);

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const employer = {
      id: Date.now().toString(),
      companyName,
      email,
      password,
      createdAt: new Date().toISOString(),
    };

    const savedEmployer = await createEmployerRecord(employer);
    const token = generateToken(savedEmployer.id);

    res.status(201).json({
      success: true,
      employer: {
        id: savedEmployer.id,
        companyName: savedEmployer.companyName,
        email: savedEmployer.email,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// POST /api/auth/login - Login employer
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const employer = await getEmployerByEmail(email);

    if (!employer || employer.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(employer.id);

    res.json({
      success: true,
      employer: {
        id: employer.id,
        companyName: employer.companyName,
        email: employer.email,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

// GET /api/auth/me - Get current employer (requires token)
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const employerId = decodeToken(token);
  if (!employerId) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const employer = await getEmployerById(employerId);

    if (!employer) {
      return res.status(404).json({ error: 'Employer not found' });
    }

    res.json({
      id: employer.id,
      companyName: employer.companyName,
      email: employer.email,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to get employer' });
  }
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
router.getEmployerById = getEmployerById;

module.exports = router;
