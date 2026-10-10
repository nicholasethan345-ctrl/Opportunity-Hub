const detailsRoot = document.getElementById("detail-root");
const params = new URLSearchParams(window.location.search);
const opportunityId = Number(params.get("id"));
const opportunities = window.opportunityData || [];
const job = opportunities.find((item) => item.id === opportunityId);

function renderJobDetails() {
  if (!job) {
    detailsRoot.innerHTML = `
      <div class="details-hero">
        <a class="detail-back" href="index.html">← Back to opportunities</a>
        <h1 class="detail-title">Opportunity not found</h1>
      </div>
    `;
    return;
  }

  const responsibilityList = job.responsibilities.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const requirementList = job.requirements.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const tagHtml = job.tags.map((tag) => `<span class="opp-tag">${escapeHtml(tag)}</span>`).join("");

  detailsRoot.innerHTML = `
    <div class="details-hero">
      <a class="detail-back" href="index.html">← Back to opportunities</a>
      <div class="opp-badges">
        ${job.featured ? '<span class="opp-badge featured">Featured</span>' : ""}
        ${job.remote ? '<span class="opp-badge remote">Remote</span>' : ""}
      </div>
      <h1 class="detail-title">${escapeHtml(job.title)}</h1>
      <div class="detail-company-row">
        <span>${escapeHtml(job.company)}</span>
        <span>${escapeHtml(job.location)}</span>
        <span>${escapeHtml(job.type)}</span>
      </div>
      <div class="opp-tags" style="margin-top:1rem;">${tagHtml}</div>
    </div>

    <div class="detail-body">
      <div class="detail-main">
        <section class="detail-section">
          <h3>About the role</h3>
          <p>${escapeHtml(job.description)}</p>
        </section>

        <section class="detail-section">
          <h3>Responsibilities</h3>
          <ul>${responsibilityList}</ul>
        </section>

        <section class="detail-section">
          <h3>Requirements</h3>
          <ul>${requirementList}</ul>
        </section>
      </div>

      <aside class="detail-sidebar">
        <div class="detail-panel">
          <span class="small-label">Compensation</span>
          <strong>${escapeHtml(job.salary)}</strong>
          <span>${escapeHtml(job.type)}</span>
        </div>

        <div class="detail-panel">
          <span class="small-label">Location</span>
          <strong>${escapeHtml(job.location)}</strong>
          <span>${job.remote ? "Remote-friendly" : "On-site role"}</span>
        </div>

        <div class="detail-panel">
          <span class="small-label">Time posted</span>
          <strong>${job.postedDays} days ago</strong>
          <span>Updated for active hiring</span>
        </div>

        <div class="detail-button-row">
          <button id="apply-now-button" class="primary-btn" type="button">Apply now</button>
          <button class="secondary-btn" type="button">Save role</button>
        </div>
      </aside>
    </div>
  `;

  bindApplicationControls();
}

function bindApplicationControls() {
  const applyButton = document.getElementById("apply-now-button");
  const modal = document.getElementById("application-modal");
  const closeButton = document.getElementById("application-modal-close");
  const cancelButton = document.getElementById("application-cancel");
  const form = document.getElementById("application-form");

  if (applyButton) {
    applyButton.addEventListener("click", () => {
      const title = document.getElementById("application-modal-title");
      const typeField = document.getElementById("application-opportunity-type");
      if (title) {
        title.textContent = `Apply for ${job.title}`;
      }
      if (typeField) {
        typeField.value = job.type && job.type.toLowerCase().includes('intern') ? 'internship' : 'job';
      }
      modal.classList.add("active");
      modal.setAttribute("aria-hidden", "false");
    });
  }

  if (closeButton) {
    closeButton.addEventListener("click", closeApplicationModal);
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", closeApplicationModal);
  }

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeApplicationModal();
      }
    });
  }

  if (form) {
    form.addEventListener("submit", handleApplicationSubmit);
  }
}

function closeApplicationModal() {
  const modal = document.getElementById("application-modal");
  const form = document.getElementById("application-form");

  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  }

  if (form) {
    form.reset();
  }
}

async function handleApplicationSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const opportunityType = document.getElementById("application-opportunity-type").value;

  const payload = {
    jobId: job.id,
    jobTitle: job.title,
    opportunityId: job.id,
    opportunityTitle: job.title,
    opportunityType,
    company: job.company,
    name: document.getElementById("application-name").value.trim(),
    email: document.getElementById("application-email").value.trim(),
    phone: document.getElementById("application-phone").value.trim(),
    resumeUrl: document.getElementById("application-resume").value.trim(),
    portfolioUrl: document.getElementById("application-portfolio").value.trim(),
    coverLetter: document.getElementById("application-cover-letter").value.trim(),
  };

  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  try {
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Unable to submit application.");
    }

    closeApplicationModal();
    window.location.href = "application-success.html";
  } catch (error) {
    showApplicationToast(error.message || "Unable to submit application.", true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit application";
  }
}

function showApplicationToast(message, isError = false) {
  const existing = document.getElementById("application-toast");
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement("div");
  toast.id = "application-toast";
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.right = "20px";
  toast.style.bottom = "20px";
  toast.style.zIndex = "2000";
  toast.style.padding = "0.9rem 1.1rem";
  toast.style.borderRadius = "12px";
  toast.style.color = "#fff";
  toast.style.background = isError ? "#ef4444" : "#10b981";
  toast.style.boxShadow = "0 20px 45px rgba(15, 23, 42, 0.16)";
  toast.style.fontWeight = "600";

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function loadTheme() {
  const storedTheme = localStorage.getItem("opportunity-hub-theme") || "light";
  document.body.dataset.theme = storedTheme;
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.textContent = storedTheme === "dark" ? "☀️ Light" : "🌙 Dark";
  }
}

function toggleTheme() {
  const currentTheme = document.body.dataset.theme;
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  document.body.dataset.theme = nextTheme;
  localStorage.setItem("opportunity-hub-theme", nextTheme);
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.textContent = nextTheme === "dark" ? "☀️ Light" : "🌙 Dark";
  }
}

const themeToggle = document.getElementById("theme-toggle");
if (themeToggle) {
  themeToggle.addEventListener("click", toggleTheme);
}

loadTheme();
renderJobDetails();
