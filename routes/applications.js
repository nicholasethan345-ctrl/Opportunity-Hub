const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const auth = require('./auth');
const { supabase } = require('../lib/supabase');

const applicationsFile = path.join(__dirname, '../data/applications.json');
const listingsFile = path.join(__dirname, '../data/listings.json');

function normalizeApplication(record) {
  if (!record) return null;

  const jobId = record.job_id ?? record.jobId ?? record.opportunity_id ?? record.opportunityId;
  const jobTitle = record.job_title ?? record.jobTitle ?? record.opportunity_title ?? record.opportunityTitle ?? 'Role';

  return {
    id: record.id,
    jobId: jobId,
    opportunityId: jobId,
    jobTitle,
    opportunityTitle: jobTitle,
    opportunityType: record.opportunity_type ?? record.opportunityType ?? 'job',
    company: record.company ?? '',
    name: record.applicant_name ?? record.name ?? 'Applicant',
    email: record.email ?? '',
    phone: record.phone ?? '',
    resumeUrl: record.resume_url ?? record.resumeUrl ?? '',
    portfolioUrl: record.portfolio_url ?? record.portfolioUrl ?? '',
    coverLetter: record.cover_letter ?? record.coverLetter ?? '',
    status: record.status ?? 'applied',
    createdAt: record.created_at ?? record.createdAt ?? new Date().toISOString(),
    updatedAt: record.updated_at ?? record.updatedAt ?? new Date().toISOString(),
  };
}

function loadListings() {
  if (!fs.existsSync(listingsFile)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(listingsFile, 'utf8'));
  } catch (error) {
    return [];
  }
}

function loadApplications() {
  if (!fs.existsSync(applicationsFile)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(applicationsFile, 'utf8'));
  } catch (error) {
    return [];
  }
}

function saveApplications(applications) {
  fs.writeFileSync(applicationsFile, JSON.stringify(applications, null, 2));
}

async function getApplicationsFromStore() {
  if (!supabase) {
    return loadApplications();
  }

  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeApplication);
}

async function createApplicationRecord(application) {
  if (!supabase) {
    const applications = loadApplications();
    applications.unshift(application);
    saveApplications(applications);
    return application;
  }

  const { data, error } = await supabase
    .from('applications')
    .insert([
      {
        id: application.id,
        job_id: application.jobId,
        job_title: application.jobTitle,
        company: application.company,
        applicant_name: application.name,
        email: application.email,
        phone: application.phone,
        resume_url: application.resumeUrl,
        portfolio_url: application.portfolioUrl,
        cover_letter: application.coverLetter,
        status: application.status,
        created_at: application.createdAt,
        updated_at: application.updatedAt,
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return normalizeApplication(data);
}

async function updateApplicationStatusRecord(applicationId, status) {
  if (!supabase) {
    const applications = loadApplications();
    const index = applications.findIndex((item) => item.id === applicationId);

    if (index === -1) {
      return null;
    }

    applications[index].status = status;
    applications[index].updatedAt = new Date().toISOString();
    saveApplications(applications);
    return applications[index];
  }

  const { data, error } = await supabase
    .from('applications')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', applicationId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return normalizeApplication(data);
}

// GET /api/applications - Get applications (filtered based on auth)
router.get('/', auth.verifyToken, async (req, res) => {
  try {
    const applications = await getApplicationsFromStore();
    const employer = await auth.getEmployerById(req.employerId);
    
    // Check if user is admin
    const isAdmin = employer && (employer.role === 'admin' || employer.isAdmin === true || employer.email === 'admin@opportunityhub.test');
    
    if (isAdmin) {
      // Admin sees all applications
      res.json(applications);
    } else {
      // Employers see only their own listing applications
      const employerListings = loadListings().filter((listing) => listing.employerId === req.employerId);
      const employerListingIds = new Set(employerListings.map((listing) => String(listing.id)));

      const employerApplications = applications.filter((application) => {
        return employerListingIds.has(String(application.jobId || application.opportunityId));
      });

      res.json(employerApplications);
    }
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch applications' });
  }
});

router.get('/job/:jobId', async (req, res) => {
  try {
    const applications = await getApplicationsFromStore();
    const filteredApplications = applications.filter((application) => {
      return String(application.jobId || application.opportunityId) === String(req.params.jobId);
    });
    res.json(filteredApplications);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch job applications' });
  }
});

router.get('/opportunity/:opportunityId', async (req, res) => {
  try {
    const applications = await getApplicationsFromStore();
    const filteredApplications = applications.filter((application) => {
      return String(application.opportunityId || application.jobId) === String(req.params.opportunityId);
    });
    res.json(filteredApplications);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch opportunity applications' });
  }
});

// POST /api/applications - Create new application (public, no auth required)
router.post('/', async (req, res) => {
  const {
    jobId,
    jobTitle,
    opportunityId,
    opportunityTitle,
    opportunityType,
    company,
    name,
    email,
    phone,
    resumeUrl,
    portfolioUrl,
    coverLetter,
  } = req.body;

  const normalizedJobId = opportunityId ?? jobId;
  const normalizedJobTitle = opportunityTitle ?? jobTitle;

  if (!normalizedJobId || !normalizedJobTitle || !name || !email) {
    return res.status(400).json({ error: 'Opportunity id, opportunity title, full name, and email are required.' });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const application = {
    id: Date.now().toString(),
    jobId: String(normalizedJobId),
    opportunityId: String(normalizedJobId),
    jobTitle: String(normalizedJobTitle),
    opportunityTitle: String(normalizedJobTitle),
    opportunityType: opportunityType || 'job',
    company: company || '',
    name: String(name),
    email: String(email),
    phone: phone || '',
    resumeUrl: resumeUrl || '',
    portfolioUrl: portfolioUrl || '',
    coverLetter: coverLetter || '',
    status: 'applied',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const createdApplication = await createApplicationRecord(application);
    res.status(201).json(createdApplication);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to submit application' });
  }
});

// PATCH /api/applications/:id/status - Update application status (requires auth)
router.patch('/:id/status', auth.verifyToken, async (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  try {
    const applications = await getApplicationsFromStore();
    const application = applications.find((item) => String(item.id) === String(req.params.id));

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const employer = await auth.getEmployerById(req.employerId);
    const isAdmin = employer && (employer.role === 'admin' || employer.isAdmin === true || employer.email === 'admin@opportunityhub.test');

    if (!isAdmin) {
      const employerListings = loadListings().filter((listing) => listing.employerId === req.employerId);
      const listingMatch = employerListings.find((listing) => String(listing.id) === String(application.jobId || application.opportunityId));

      if (!listingMatch) {
        return res.status(403).json({ error: 'You are not authorized to update this application.' });
      }
    }

    const updatedApplication = await updateApplicationStatusRecord(application.id, status);

    if (!updatedApplication) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(updatedApplication);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update application status' });
  }
});

module.exports = router;
