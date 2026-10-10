const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const submissionsFile = path.join(__dirname, '../data/contact-submissions.json');

function loadSubmissions() {
  if (!fs.existsSync(submissionsFile)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(submissionsFile, 'utf8'));
  } catch (error) {
    return [];
  }
}

function saveSubmissions(submissions) {
  fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2));
}

router.get('/', (req, res) => {
  try {
    const submissions = loadSubmissions();
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load contact submissions.' });
  }
});

router.post('/', (req, res) => {
  const { name, email, company, reason, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const submission = {
    id: Date.now().toString(),
    name: String(name).trim(),
    email: String(email).trim(),
    company: String(company || '').trim(),
    reason: String(reason || 'General enquiry').trim(),
    message: String(message).trim(),
    createdAt: new Date().toISOString(),
  };

  try {
    const submissions = loadSubmissions();
    submissions.unshift(submission);
    saveSubmissions(submissions);

    res.status(201).json({
      success: true,
      message: 'Thanks for reaching out. We will respond soon.',
      submission,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to submit your message.' });
  }
});

module.exports = router;
