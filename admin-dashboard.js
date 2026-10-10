const API_BASE = '/api';

const state = {
  token: localStorage.getItem('admin_token'),
  applications: [],
  search: '',
  type: 'all',
  status: 'all',
};

const els = {
  authView: document.getElementById('auth-view'),
  adminView: document.getElementById('admin-view'),
  adminLoginForm: document.getElementById('admin-login-form'),
  adminSearch: document.getElementById('admin-search'),
  adminTypeFilter: document.getElementById('admin-type-filter'),
  adminStatusFilter: document.getElementById('admin-status-filter'),
  tableBody: document.getElementById('admin-table-body'),
  logoutButton: document.getElementById('admin-logout'),
  totalStat: document.getElementById('stat-total'),
  appliedStat: document.getElementById('stat-applied'),
  interviewingStat: document.getElementById('stat-interviewing'),
  offerStat: document.getElementById('stat-offer'),
};

function init() {
  loadTheme();
  setupEvents();

  if (state.token) {
    showAdminView();
    fetchApplications();
  } else {
    showAuthView();
  }
}

function setupEvents() {
  els.adminLoginForm.addEventListener('submit', handleAdminLogin);
  els.adminSearch.addEventListener('input', (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderTable();
  });
  els.adminTypeFilter.addEventListener('change', (event) => {
    state.type = event.target.value;
    renderTable();
  });
  els.adminStatusFilter.addEventListener('change', (event) => {
    state.status = event.target.value;
    renderTable();
  });
  els.logoutButton.addEventListener('click', () => {
    localStorage.removeItem('admin_token');
    state.token = null;
    showAuthView();
  });
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
}

async function handleAdminLogin(event) {
  event.preventDefault();

  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    const isAdmin = data.employer && (data.employer.role === 'admin' || data.employer.isAdmin === true || data.employer.email === 'admin@opportunityhub.test');
    if (!isAdmin) {
      throw new Error('Admin access required.');
    }

    state.token = data.token;
    localStorage.setItem('admin_token', data.token);
    showAdminView();
    fetchApplications();
  } catch (error) {
    showToast(error.message || 'Unable to sign in.', true);
  }
}

async function fetchApplications() {
  try {
    const response = await fetch(`${API_BASE}/applications`, {
      headers: { Authorization: `Bearer ${state.token}` },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Unable to load applications');
    }

    state.applications = Array.isArray(data) ? data : [];
    renderTable();
    updateStats();
  } catch (error) {
    showToast(error.message || 'Unable to load applications.', true);
  }
}

function renderTable() {
  const filtered = state.applications.filter((application) => {
    const matchesType = state.type === 'all' || (application.opportunityType || (application.jobTitle ? 'job' : 'other')) === state.type;
    const matchesStatus = state.status === 'all' || (application.status || 'applied') === state.status;
    const term = state.search;
    const matchesSearch = !term || [
      application.name,
      application.email,
      application.jobTitle,
      application.opportunityTitle,
      application.company,
    ].some((value) => (value || '').toLowerCase().includes(term));

    return matchesType && matchesStatus && matchesSearch;
  });

  if (!filtered.length) {
    els.tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">No applications match the current filters.</td>
      </tr>
    `;
    return;
  }

  els.tableBody.innerHTML = filtered.map((application) => {
    const status = application.status || 'applied';
    const type = application.opportunityType || 'job';

    return `
      <tr>
        <td>
          <strong>${escapeHtml(application.name || 'Applicant')}</strong><br />
          <span style="color: var(--muted);">${escapeHtml(application.email || 'No email')}</span>
        </td>
        <td><span class="opp-type-badge">${escapeHtml(type)}</span></td>
        <td>
          <strong>${escapeHtml(application.jobTitle || application.opportunityTitle || 'Opportunity')}</strong>
        </td>
        <td>${escapeHtml(application.company || 'Unknown company')}</td>
        <td>
          <select class="status-select" data-id="${application.id}" aria-label="Update application status">
            <option value="applied" ${status === 'applied' ? 'selected' : ''}>Applied</option>
            <option value="reviewed" ${status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
            <option value="interviewing" ${status === 'interviewing' ? 'selected' : ''}>Interviewing</option>
            <option value="offer" ${status === 'offer' ? 'selected' : ''}>Offer</option>
            <option value="rejected" ${status === 'rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </td>
        <td>${formatDate(application.createdAt)}</td>
        <td>
          ${application.phone ? `<div>${escapeHtml(application.phone)}</div>` : '<span style="color: var(--muted);">No phone</span>'}
          ${application.resumeUrl ? `<a href="${application.resumeUrl}" target="_blank" rel="noreferrer">Resume</a>` : ''}
        </td>
        <td>
          <div class="action-buttons">
            <button class="secondary-btn" type="button" data-open="${application.id}">View</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  els.tableBody.querySelectorAll('.status-select').forEach((select) => {
    select.addEventListener('change', async (event) => {
      const id = event.target.dataset.id;
      const nextStatus = event.target.value;
      await updateApplicationStatus(id, nextStatus);
    });
  });

  els.tableBody.querySelectorAll('[data-open]').forEach((button) => {
    button.addEventListener('click', () => {
      const app = state.applications.find((item) => String(item.id) === button.getAttribute('data-open'));
      if (!app) return;
      openApplicationDetails(app);
    });
  });
}

function openApplicationDetails(application) {
  const details = [
    `Candidate: ${application.name || 'Applicant'}`,
    `Email: ${application.email || 'Not provided'}`,
    `Phone: ${application.phone || 'Not provided'}`,
    `Opportunity type: ${application.opportunityType || 'job'}`,
    `Role: ${application.jobTitle || application.opportunityTitle || 'Opportunity'}`,
    `Company: ${application.company || 'Unknown company'}`,
    `Portfolio: ${application.portfolioUrl || 'Not provided'}`,
    `Cover letter: ${application.coverLetter || 'Not provided'}`,
  ].join('\n');

  alert(details);
}

async function updateApplicationStatus(applicationId, status) {
  try {
    const response = await fetch(`${API_BASE}/applications/${applicationId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Unable to update status');
    }

    const index = state.applications.findIndex((item) => String(item.id) === String(applicationId));
    if (index !== -1) {
      state.applications[index].status = status;
    }
    renderTable();
    updateStats();
    showToast('Application status updated.', false);
  } catch (error) {
    showToast(error.message || 'Unable to update status.', true);
  }
}

function updateStats() {
  const total = state.applications.length;
  const applied = state.applications.filter((app) => (app.status || 'applied') === 'applied').length;
  const interviewing = state.applications.filter((app) => (app.status || 'applied') === 'interviewing').length;
  const offer = state.applications.filter((app) => (app.status || 'applied') === 'offer').length;

  els.totalStat.textContent = total;
  els.appliedStat.textContent = applied;
  els.interviewingStat.textContent = interviewing;
  els.offerStat.textContent = offer;
}

function showAdminView() {
  els.authView.style.display = 'none';
  els.adminView.style.display = 'block';
}

function showAuthView() {
  els.adminView.style.display = 'none';
  els.authView.style.display = 'block';
}

function showToast(message, isError = false) {
  const existing = document.getElementById('toast-message');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toast-message';
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.right = '20px';
  toast.style.bottom = '20px';
  toast.style.zIndex = '9999';
  toast.style.background = isError ? '#ef4444' : '#10b981';
  toast.style.color = '#fff';
  toast.style.padding = '0.9rem 1.2rem';
  toast.style.borderRadius = '12px';
  toast.style.boxShadow = '0 20px 45px rgba(15, 23, 42, 0.16)';
  toast.style.fontWeight = '600';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
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

init();
