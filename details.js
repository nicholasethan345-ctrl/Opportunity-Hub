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
          <button class="primary-btn" type="button">Apply now</button>
          <button class="secondary-btn" type="button">Save role</button>
        </div>
      </aside>
    </div>
  `;
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
  themeToggle.textContent = storedTheme === "dark" ? "☀️ Light" : "🌙 Dark";
}

function toggleTheme() {
  const currentTheme = document.body.dataset.theme;
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  document.body.dataset.theme = nextTheme;
  localStorage.setItem("opportunity-hub-theme", nextTheme);
  const themeToggle = document.getElementById("theme-toggle");
  themeToggle.textContent = nextTheme === "dark" ? "☀️ Light" : "🌙 Dark";
}

document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
loadTheme();
renderJobDetails();
