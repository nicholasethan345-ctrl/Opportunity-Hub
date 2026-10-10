const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const auth = require('./auth');
const { supabase } = require('../lib/supabase');

const listingsFile = path.join(__dirname, '../data/listings.json');

function normalizeListing(record) {
  if (!record) return null;

  return {
    id: record.id,
    employerId: record.employer_id ?? record.employerId,
    company: record.company,
    title: record.title,
    location: record.location,
    type: record.type,
    category: record.category,
    salary: record.salary || 'Competitive',
    description: record.description,
    requirements: Array.isArray(record.requirements)
      ? record.requirements
      : typeof record.requirements === 'string'
        ? JSON.parse(record.requirements)
        : [],
    tags: Array.isArray(record.tags) ? record.tags : [],
    remote: Boolean(record.remote ?? false),
    featured: Boolean(record.featured ?? false),
    status: record.status || 'draft',
    postedDays: record.posted_days ?? record.postedDays ?? 0,
    createdAt: record.created_at ?? record.createdAt ?? new Date().toISOString(),
    updatedAt: record.updated_at ?? record.updatedAt ?? new Date().toISOString(),
    responsibilities: Array.isArray(record.responsibilities)
      ? record.responsibilities
      : typeof record.responsibilities === 'string'
        ? JSON.parse(record.responsibilities)
        : [],
  };
}

// Load listings from file
function loadListings() {
  if (!fs.existsSync(listingsFile)) {
    return [];
  }

  const data = fs.readFileSync(listingsFile, 'utf8');
  return JSON.parse(data);
}

// Save listings to file
function saveListings(listings) {
  fs.writeFileSync(listingsFile, JSON.stringify(listings, null, 2));
}

async function getListingsFromStore() {
  if (!supabase) {
    return loadListings();
  }

  const { data, error } = await supabase.from('listings').select('*').order('created_at', { ascending: false });
  if (error) {
    throw error;
  }

  return (data || []).map(normalizeListing);
}

async function getListingById(id) {
  if (!supabase) {
    const listings = loadListings();
    return listings.find((listing) => listing.id === id) || null;
  }

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeListing(data);
}

async function createListingRecord(payload) {
  if (!supabase) {
    const listings = loadListings();
    listings.push(payload);
    saveListings(listings);
    return payload;
  }

  const { data, error } = await supabase
    .from('listings')
    .insert([
      {
        id: payload.id,
        employer_id: payload.employerId,
        company: payload.company,
        title: payload.title,
        location: payload.location,
        type: payload.type,
        category: payload.category,
        salary: payload.salary,
        description: payload.description,
        requirements: payload.requirements,
        tags: payload.tags,
        remote: payload.remote,
        featured: payload.featured,
        status: payload.status,
        posted_days: payload.postedDays,
        created_at: payload.createdAt,
        updated_at: payload.updatedAt,
        responsibilities: payload.responsibilities,
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return normalizeListing(data);
}

async function saveListingRecord(listing) {
  if (!supabase) {
    const listings = loadListings();
    const listingIndex = listings.findIndex((item) => item.id === listing.id);

    if (listingIndex !== -1) {
      listings[listingIndex] = listing;
    } else {
      listings.push(listing);
    }

    saveListings(listings);
    return listing;
  }

  const { data, error } = await supabase
    .from('listings')
    .upsert([
      {
        id: listing.id,
        employer_id: listing.employerId,
        company: listing.company,
        title: listing.title,
        location: listing.location,
        type: listing.type,
        category: listing.category,
        salary: listing.salary,
        description: listing.description,
        requirements: listing.requirements,
        tags: listing.tags,
        remote: listing.remote,
        featured: listing.featured,
        status: listing.status,
        posted_days: listing.postedDays,
        created_at: listing.createdAt,
        updated_at: listing.updatedAt,
        responsibilities: listing.responsibilities,
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return normalizeListing(data);
}

async function deleteListingRecord(id) {
  if (!supabase) {
    const listings = loadListings();
    const filtered = listings.filter((listing) => listing.id !== id);
    saveListings(filtered);
    return true;
  }

  const { error } = await supabase.from('listings').delete().eq('id', id);
  if (error) {
    throw error;
  }

  return true;
}

// GET /api/listings - Get all published listings
router.get('/', async (req, res) => {
  try {
    const listings = await getListingsFromStore();
    const published = listings.filter((listing) => listing.status === 'published');
    res.json(published);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load listings' });
  }
});

// GET /api/listings/drafts/all - Get all listings for the logged-in employer
router.get('/drafts/all', auth.verifyToken, async (req, res) => {
  try {
    const listings = await getListingsFromStore();
    const employerListings = listings.filter((listing) => listing.employerId === req.employerId);
    res.json(employerListings);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load employer listings' });
  }
});

// GET /api/listings/:id - Get specific listing by ID
router.get('/:id', async (req, res) => {
  try {
    const listing = await getListingById(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(listing);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to get listing' });
  }
});

// POST /api/listings - Create new listing (requires authentication)
router.post('/', auth.verifyToken, async (req, res) => {
  const {
    title,
    location,
    type,
    category,
    salary,
    description,
    requirements,
    tags,
    remote,
    featured,
    status = 'draft',
  } = req.body;

  if (!title || !location || !type || !category || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const employerId = req.employerId;
    const employer = await auth.getEmployerById(employerId);

    const newListing = {
      id: Date.now().toString(),
      employerId,
      company: employer?.companyName || 'Unknown Company',
      title,
      location,
      type,
      category,
      salary: salary || 'Competitive',
      description,
      requirements: requirements || [],
      tags: tags || [],
      remote: remote ?? false,
      featured: featured ?? false,
      status,
      postedDays: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responsibilities: [],
    };

    const savedListing = await createListingRecord(newListing);
    res.status(201).json(savedListing);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to create listing' });
  }
});

// PUT /api/listings/:id - Update listing (requires authentication and ownership)
router.put('/:id', auth.verifyToken, async (req, res) => {
  try {
    const listings = await getListingsFromStore();
    const listingIndex = listings.findIndex((item) => item.id === req.params.id);

    if (listingIndex === -1) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const listing = listings[listingIndex];

    if (listing.employerId !== req.employerId) {
      return res.status(403).json({ error: 'Unauthorized to update this listing' });
    }

    const {
      title,
      location,
      type,
      category,
      salary,
      description,
      requirements,
      tags,
      remote,
      featured,
      status,
      responsibilities,
    } = req.body;

    if (title) listing.title = title;
    if (location) listing.location = location;
    if (type) listing.type = type;
    if (category) listing.category = category;
    if (salary) listing.salary = salary;
    if (description) listing.description = description;
    if (requirements) listing.requirements = requirements;
    if (tags) listing.tags = tags;
    if (remote !== undefined) listing.remote = remote;
    if (featured !== undefined) listing.featured = featured;
    if (status) listing.status = status;
    if (responsibilities) listing.responsibilities = responsibilities;

    listing.updatedAt = new Date().toISOString();

    const savedListing = await saveListingRecord(listing);
    res.json(savedListing);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update listing' });
  }
});

// POST /api/listings/:id/publish - Publish a draft listing
router.post('/:id/publish', auth.verifyToken, async (req, res) => {
  try {
    const listing = await getListingById(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.employerId !== req.employerId) {
      return res.status(403).json({ error: 'Unauthorized to publish this listing' });
    }

    if (listing.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft listings can be published' });
    }

    listing.status = 'published';
    listing.postedDays = 0;
    listing.updatedAt = new Date().toISOString();

    const savedListing = await saveListingRecord(listing);
    res.json(savedListing);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to publish listing' });
  }
});

// POST /api/listings/:id/unpublish - Unpublish a listing back to draft
router.post('/:id/unpublish', auth.verifyToken, async (req, res) => {
  try {
    const listing = await getListingById(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.employerId !== req.employerId) {
      return res.status(403).json({ error: 'Unauthorized to unpublish this listing' });
    }

    listing.status = 'draft';
    listing.updatedAt = new Date().toISOString();

    const savedListing = await saveListingRecord(listing);
    res.json(savedListing);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to unpublish listing' });
  }
});

// DELETE /api/listings/:id - Delete listing (requires authentication and ownership)
router.delete('/:id', auth.verifyToken, async (req, res) => {
  try {
    const listing = await getListingById(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.employerId !== req.employerId) {
      return res.status(403).json({ error: 'Unauthorized to delete this listing' });
    }

    await deleteListingRecord(req.params.id);
    res.json({ success: true, message: 'Listing deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to delete listing' });
  }
});

module.exports = router;
