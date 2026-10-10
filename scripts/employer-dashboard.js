const API_BASE = '/api';

let authState = {
  token: localStorage.getItem('employer_token'),
  employer: JSON.parse(localStorage.getItem('employer_data') || 'null')
};

let currentEditingListingId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadTheme();
  
  if (authState.token) {
    showDashboard();
    fetchListings();
  } else {
    showAuthForms();
  }
});

function setupEventListeners() {
  // Auth
  document.getElementById('login-form-element').addEventListener('submit', handleLogin);
  document.getElementById('register-form-element').addEventListener('submit', handleRegister);
  document.getElementById('switch-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
  });
  document.getElementById('switch-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
  });
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Listing form
  document.getElementById('create-listing-btn').addEventListener('click', () => {
    currentEditingListingId = null;
    resetListingForm();
    openListingModal('New Job Listing');
  });

  document.getElementById('listing-form').addEventListener('submit', handleSaveListing);
  document.getElementById('modal-cancel').addEventListener('click', closeListingModal);
  document.querySelector('.modal-close').addEventListener('click', closeListingModal);

  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
}

// Auth handlers
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) throw new Error('Login failed');
    
    const data = await response.json();
    authState.token = data.token;
    authState.employer = data.employer;

    localStorage.setItem('employer_token', data.token);
    localStorage.setItem('employer_data', JSON.stringify(data.employer));

    showDashboard();
    fetchListings();
    showNotification('Login successful!', 'success');
  } catch (err) {
    showNotification('Login failed: ' + err.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const companyName = document.getElementById('register-company').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName, email, password })
    });

    if (!response.ok) throw new Error('Registration failed');
    
    const data = await response.json();
    authState.token = data.token;
    authState.employer = data.employer;

    localStorage.setItem('employer_token', data.token);
    localStorage.setItem('employer_data', JSON.stringify(data.employer));

    showDashboard();
    fetchListings();
    showNotification('Registration successful!', 'success');
  } catch (err) {
    showNotification('Registration failed: ' + err.message, 'error');
  }
}

function handleLogout() {
  authState.token = null;
  authState.employer = null;
  localStorage.removeItem('employer_token');
  localStorage.removeItem('employer_data');
  showAuthForms();
  showNotification('Logged out', 'info');
}

// Listings handlers
async function fetchListings() {
  try {
    const response = await fetch(`${API_BASE}/listings/drafts/all`, {
      headers: { 'Authorization': `Bearer ${authState.token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch listings');
    
    const listings = await response.json();
    renderListings(listings);
  } catch (err) {
    showNotification('Error loading listings: ' + err.message, 'error');
  }
}

function renderListings(listings) {
  const container = document.getElementById('listings-container');
  
  if (listings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No listings yet</h3>
        <p>Create your first job listing to get started.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = listings.map(listing => `
    <div class="listing-row">
      <div class="listing-info">
        <h4>${escapeHtml(listing.title)}</h4>
        <p>${escapeHtml(listing.location)} • ${escapeHtml(listing.type)}</p>
      </div>
      <div>
        <span class="status-badge ${listing.status}">${listing.status}</span>
      </div>
      <div>
        <p>${escapeHtml(listing.salary)}</p>
      </div>
      <div>
        <p>${new Date(listing.createdAt).toLocaleDateString()}</p>
      </div>
      <div class="listing-actions">
        <button class="icon-btn" title="Edit" onclick="editListing('${listing.id}')">✏️</button>
        <button class="icon-btn" title="${listing.status === 'draft' ? 'Publish' : 'Unpublish'}" onclick="togglePublish('${listing.id}', '${listing.status}')">${listing.status === 'draft' ? '📤' : '📥'}</button>
        <button class="icon-btn" title="Delete" onclick="deleteListing('${listing.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

async function editListing(listingId) {
  try {
    const response = await fetch(`${API_BASE}/listings/${listingId}`);
    if (!response.ok) throw new Error('Failed to fetch listing');
    
    const listing = await response.json();
    currentEditingListingId = listingId;
    
    // Populate form
    document.getElementById('listing-title').value = listing.title;
    document.getElementById('listing-location').value = listing.location;
    document.getElementById('listing-type').value = listing.type;
    document.getElementById('listing-category').value = listing.category;
    document.getElementById('listing-salary').value = listing.salary;
    document.getElementById('listing-description').value = listing.description;
    document.getElementById('listing-requirements').value = (listing.requirements || []).join('\n');
    document.getElementById('listing-tags').value = (listing.tags || []).join(', ');
    document.getElementById('listing-remote').checked = listing.remote;
    document.getElementById('listing-featured').checked = listing.featured;
    
    openListingModal('Edit Job Listing');
  } catch (err) {
    showNotification('Error loading listing: ' + err.message, 'error');
  }
}

async function handleSaveListing(e) {
  e.preventDefault();
  
  const listing = {
    title: document.getElementById('listing-title').value,
    location: document.getElementById('listing-location').value,
    type: document.getElementById('listing-type').value,
    category: document.getElementById('listing-category').value,
    salary: document.getElementById('listing-salary').value,
    description: document.getElementById('listing-description').value,
    requirements: document.getElementById('listing-requirements').value.split('\n').filter(r => r.trim()),
    tags: document.getElementById('listing-tags').value.split(',').map(t => t.trim()).filter(t => t),
    remote: document.getElementById('listing-remote').checked,
    featured: document.getElementById('listing-featured').checked,
    status: e.submitter.value
  };

  try {
    const url = currentEditingListingId 
      ? `${API_BASE}/listings/${currentEditingListingId}`
      : `${API_BASE}/listings`;
    
    const method = currentEditingListingId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authState.token}`
      },
      body: JSON.stringify(listing)
    });

    if (!response.ok) throw new Error('Failed to save listing');
    
    closeListingModal();
    fetchListings();
    showNotification(`Listing ${currentEditingListingId ? 'updated' : 'created'} successfully!`, 'success');
  } catch (err) {
    showNotification('Error saving listing: ' + err.message, 'error');
  }
}

async function togglePublish(listingId, currentStatus) {
  const endpoint = currentStatus === 'draft' ? 'publish' : 'unpublish';
  
  try {
    const response = await fetch(`${API_BASE}/listings/${listingId}/${endpoint}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authState.token}` }
    });

    if (!response.ok) throw new Error('Failed to update listing status');
    
    fetchListings();
    showNotification(`Listing ${endpoint}ed successfully!`, 'success');
  } catch (err) {
    showNotification('Error: ' + err.message, 'error');
  }
}

async function deleteListing(listingId) {
  if (!confirm('Are you sure you want to delete this listing?')) return;

  try {
    const response = await fetch(`${API_BASE}/listings/${listingId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authState.token}` }
    });

    if (!response.ok) throw new Error('Failed to delete listing');
    
    fetchListings();
    showNotification('Listing deleted', 'success');
  } catch (err) {
    showNotification('Error deleting listing: ' + err.message, 'error');
  }
}

// UI helpers
function showAuthForms() {
  document.getElementById('auth-container').style.display = 'block';
  document.getElementById('dashboard-container').style.display = 'none';
  document.getElementById('logout-btn').style.display = 'none';
}

function showDashboard() {
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('dashboard-container').style.display = 'block';
  document.getElementById('logout-btn').style.display = 'block';
  
  if (authState.employer) {
    document.getElementById('company-name').textContent = authState.employer.companyName;
  }
}

function openListingModal(title) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('listing-modal').classList.add('active');
}

function closeListingModal() {
  document.getElementById('listing-modal').classList.remove('active');
  resetListingForm();
}

function resetListingForm() {
  document.getElementById('listing-form').reset();
  currentEditingListingId = null;
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.right = '20px';
  notification.style.bottom = '20px';
  notification.style.zIndex = '9999';
  notification.style.background = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#2563eb';
  notification.style.color = '#fff';
  notification.style.padding = '0.9rem 1.25rem';
  notification.style.borderRadius = '12px';
  notification.style.boxShadow = '0 20px 45px rgba(15, 23, 42, 0.16)';
  notification.style.fontWeight = '600';
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 2500);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function toggleTheme() {
  const docBody = document.body;
  const currentTheme = docBody.dataset.theme;
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  docBody.dataset.theme = nextTheme;
  localStorage.setItem('opportunity-hub-theme', nextTheme);
  document.getElementById('theme-toggle').textContent = nextTheme === 'dark' ? '☀️ Light' : '🌙 Dark';
}

function loadTheme() {
  const storedTheme = localStorage.getItem('opportunity-hub-theme') || 'light';
  document.body.dataset.theme = storedTheme;
  document.getElementById('theme-toggle').textContent = storedTheme === 'dark' ? '☀️ Light' : '🌙 Dark';
}
