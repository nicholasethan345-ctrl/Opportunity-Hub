const API_BASE = '/api';

const state = {
  token: localStorage.getItem('employer_token'),
  employer: JSON.parse(localStorage.getItem('employer_data') || 'null'),
  applicants: [],
  filter: 'all',
  search: '',
};

const els = {
  authView: document.getElementById('auth-view'),
  applicantsView: document.getElementById('applicants-view'),
  applicantLoginForm: document.getElementById('applicant-login-form'),
  searchInput: document.getElementById('search-input'),
  statusFilter: document.getElementById('status-filter'),
  tableBody: document.getElementById('applicants-table-body'),
};

function init() {
  loadTheme();
  setupEvents();

  if (state.token) {
    showApplicantsView();
    fetchApplicants();
  } else {
    showAuthView();
  }
}

function setupEvents() {
  els.applicantLoginForm.addEventListener('submit', handleEmployerLogin);
  els.searchInput.addEventListener('input', (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderTable();
  });
  els.statusFilter.addEventListener('change', (event) => {
    state.filter = event.target.value;
    renderTable();
  });
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
}

async function handleEmployerLogin(event) {
  event.preventDefault();

  const email = document.getElementById('applicant-email').value.trim();
  const password = document.getElementById('applicant-password').value;

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

    state.token = data.token;
    state.employer = data.employer;
    localStorage.setItem('employer_token', data.token);
    localStorage.setItem('employer_data', JSON.stringify(data.employer));

    showApplicantsView();
    fetchApplicants();
  } catch (error) {
    showToast(error.message || 'Unable to sign in.', true);
  }
}

async function fetchApplicants() {
  try {
    const response = await fetch(`${API_BASE}/applications`, {
      headers: { Authorization: `Bearer ${state.token}` },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Unable to load applicants');
    }

    state.applicants = Array.isArray(data) ? data : [];
    renderTable();
  } catch (error) {
    showToast(error.message || 'Unable to load applicants.', true);
  }
}

function renderTable() {
  const filtered = state.applicants.filter((application) => {
    const matchesStatus = state.filter === 'all' || (application.status || 'applied') === state.filter;
    const term = state.search;
    const matchesSearch = !term || [
      application.name,
      application.email,
      application.jobTitle,
      application.company,
    ].some((value) => (value || '').toLowerCase().includes(term));

    return matchesStatus && matchesSearch;
  });

  if (!filtered.length) {
    els.tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">No applicants match your current filter.</td>
      </tr>
    `;
    return;
  }

  els.tableBody.innerHTML = filtered.map((application) => {
    const status = application.status || 'applied';
    const resumeLink = application.resumeUrl
      ? `<a href="${application.resumeUrl}" target="_blank" rel="noreferrer">View</a>`
      : '—';

    return `
      <tr>
        <td>
          <strong>${escapeHtml(application.name)}</strong><br />
          <span style="color: var(--muted);">${escapeHtml(application.email)}</span>
        </td>
        <td>
          <strong>${escapeHtml(application.jobTitle)}</strong><br />
          <span style="color: var(--muted);">${escapeHtml(application.company || 'Unknown company')}</span>
        </td>
        <td>
          <select class="status-select" data-id="${application.id}" aria-label="Update applicant status">
            <option value="applied" ${status === 'applied' ? 'selected' : ''}>Applied</option>
            <option value="reviewed" ${status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
            <option value="interviewing" ${status === 'interviewing' ? 'selected' : ''}>Interviewing</option>
            <option value="offer" ${status === 'offer' ? 'selected' : ''}>Offer</option>
            <option value="rejected" ${status === 'rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </td>
        <td>${formatDate(application.createdAt)}</td>
        <td>${resumeLink}</td>
        <td>
          <button class="secondary-btn" type="button" data-open="${application.id}">View details</button>
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
      const app = state.applicants.find((item) => String(item.id) === button.getAttribute('data-open'));
      if (!app) return;
      openApplicationDetails(app);
    });
  });
}

function openApplicationDetails(application) {
  const details = [
    `Candidate: ${application.name}`,
    `Email: ${application.email}`,
    `Phone: ${application.phone || 'Not provided'}`,
    `Role: ${application.jobTitle}`,
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

    const index = state.applicants.findIndex((item) => String(item.id) === String(applicationId));
    if (index !== -1) {
      state.applicants[index].status = status;
    }
    renderTable();
    showToast('Application status updated.', false);
  } catch (error) {
    showToast(error.message || 'Unable to update status.', true);
  }
}

function showApplicantsView() {
  els.authView.style.display = 'none';
  els.applicantsView.style.display = 'block';
}

function showAuthView() {
  els.applicantsView.style.display = 'none';
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
