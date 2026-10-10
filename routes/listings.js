const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const auth = require('./auth');

const listingsFile = path.join(__dirname, '../data/listings.json');

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

// GET /api/listings - Get all published listings
router.get('/', (req, res) => {
  const listings = loadListings();
  const published = listings.filter(l => l.status === 'published');
  res.json(published);
});

// GET /api/listings/draft - Get all draft listings for logged-in employer
router.get('/drafts/all', auth.verifyToken, (req, res) => {
  const listings = loadListings();
  const draftListings = listings.filter(l => l.employerId === req.employerId && l.status === 'draft');
  res.json(draftListings);
});

// GET /api/listings/:id - Get specific listing by ID
router.get('/:id', (req, res) => {
  const listings = loadListings();
  const listing = listings.find(l => l.id === req.params.id);

  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  res.json(listing);
});

// POST /api/listings - Create new listing (requires authentication)
router.post('/', auth.verifyToken, (req, res) => {
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
    status = 'draft'
  } = req.body;

  if (!title || !location || !type || !category || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const listings = loadListings();
  const employers = require('./auth');

  // Get employer company name
  const employersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/employers.json'), 'utf8'));
  const employer = employersData.find(e => e.id === req.employerId);

  const newListing = {
    id: Date.now().toString(),
    employerId: req.employerId,
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
    responsibilities: []
  };

  listings.push(newListing);
  saveListings(listings);

  res.status(201).json(newListing);
});

// PUT /api/listings/:id - Update listing (requires authentication and ownership)
router.put('/:id', auth.verifyToken, (req, res) => {
  const listings = loadListings();
  const listingIndex = listings.findIndex(l => l.id === req.params.id);

  if (listingIndex === -1) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  const listing = listings[listingIndex];

  // Verify ownership
  if (listing.employerId !== req.employerId) {
    return res.status(403).json({ error: 'Unauthorized to update this listing' });
  }

  // Allow updates to all fields
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
    responsibilities
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

  listings[listingIndex] = listing;
  saveListings(listings);

  res.json(listing);
});

// POST /api/listings/:id/publish - Publish a draft listing
router.post('/:id/publish', auth.verifyToken, (req, res) => {
  const listings = loadListings();
  const listing = listings.find(l => l.id === req.params.id);

  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  if (listing.employerId !== req.employerId) {
    return res.status(403).json({ error: 'Unauthorized to publish this listing' });
  }

  if (listing.status !== 'draft') {
    return res.status(400).json({ error: 'Only draft listings can be published' });
  }

  const listingIndex = listings.findIndex(l => l.id === req.params.id);
  listings[listingIndex].status = 'published';
  listings[listingIndex].postedDays = 0;
  listings[listingIndex].updatedAt = new Date().toISOString();

  saveListings(listings);

  res.json(listings[listingIndex]);
});

// POST /api/listings/:id/unpublish - Unpublish a listing back to draft
router.post('/:id/unpublish', auth.verifyToken, (req, res) => {
  const listings = loadListings();
  const listing = listings.find(l => l.id === req.params.id);

  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  if (listing.employerId !== req.employerId) {
    return res.status(403).json({ error: 'Unauthorized to unpublish this listing' });
  }

  const listingIndex = listings.findIndex(l => l.id === req.params.id);
  listings[listingIndex].status = 'draft';
  listings[listingIndex].updatedAt = new Date().toISOString();

  saveListings(listings);

  res.json(listings[listingIndex]);
});

// DELETE /api/listings/:id - Delete listing (requires authentication and ownership)
router.delete('/:id', auth.verifyToken, (req, res) => {
  const listings = loadListings();
  const listingIndex = listings.findIndex(l => l.id === req.params.id);

  if (listingIndex === -1) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  const listing = listings[listingIndex];

  // Verify ownership
  if (listing.employerId !== req.employerId) {
    return res.status(403).json({ error: 'Unauthorized to delete this listing' });
  }

  listings.splice(listingIndex, 1);
  saveListings(listings);

  res.json({ success: true, message: 'Listing deleted' });
});

module.exports = router;
