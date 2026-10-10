// ==========================================
// Opportunity Hub - Application Script
// ==========================================

const appState = {
  opportunities: [],
  filteredOpportunities: [],
  savedOpportunities: new Set(),
  filters: {
    search: "",
    category: "All",
    location: "All",
    type: "All",
  },
};

const elements = {
  searchInput: document.getElementById("search-input"),
  categoryFilter: document.getElementById("category-filter"),
  locationFilter: document.getElementById("location-filter"),
  typeFilter: document.getElementById("type-filter"),
  opportunityList: document.getElementById("opportunity-list"),
  resultsCount: document.getElementById("results-count"),
  liveOpenings: document.getElementById("live-openings"),
  remoteOpenings: document.getElementById("remote-openings"),
};

const mockOpportunities = [
  {
    id: 1,
    title: "Product Designer",
    company: "TechStart Inc",
    location: "San Francisco, CA",
    type: "Full-time",
    category: "Design",
    description: "Join our design team to shape the future of our product platform.",
    remote: true,
    featured: true,
    postedDays: 2,
    salary: "$120k - $150k",
  },
  {
    id: 2,
    title: "Frontend Engineer",
    company: "CloudBase",
    location: "Remote",
    type: "Full-time",
    category: "Engineering",
    description: "Build scalable web applications with modern JavaScript frameworks.",
    remote: true,
    featured: false,
    postedDays: 5,
    salary: "$130k - $170k",
  },
  {
    id: 3,
    title: "Data Science Intern",
    company: "AI Innovations",
    location: "New York, NY",
    type: "Internship",
    category: "Data",
    description: "Work with cutting-edge machine learning models in a collaborative environment.",
    remote: false,
    featured: false,
    postedDays: 1,
    salary: "$25/hr",
  },
  {
    id: 4,
    title: "Marketing Manager",
    company: "Growth Labs",
    location: "Austin, TX",
    type: "Full-time",
    category: "Marketing",
    description: "Lead our go-to-market strategy for new product launches.",
    remote: true,
    featured: false,
    postedDays: 3,
    salary: "$100k - $130k",
  },
  {
    id: 5,
    title: "Backend Developer",
    company: "DataFlow Systems",
    location: "Seattle, WA",
    type: "Full-time",
    category: "Engineering",
    description: "Design and maintain microservices that power our data pipeline.",
    remote: true,
    featured: true,
    postedDays: 4,
    salary: "$140k - $180k",
  },
  {
    id: 6,
    title: "Content Strategist",
    company: "Creator Hub",
    location: "Los Angeles, CA",
    type: "Part-time",
    category: "Marketing",
    description: "Develop content strategy and create engaging materials.",
    remote: true,
    featured: false,
    postedDays: 6,
    salary: "$35/hr",
  },
  {
    id: 7,
    title: "UX Researcher",
    company: "DesignCo",
    location: "Boston, MA",
    type: "Full-time",
    category: "Design",
    description: "Conduct user research to inform product decisions.",
    remote: false,
    featured: false,
    postedDays: 2,
    salary: "$110k - $140k",
  },
  {
    id: 8,
    title: "DevOps Engineer",
    company: "CloudScale",
    location: "Remote",
    type: "Full-time",
    category: "Engineering",
    description: "Manage infrastructure and deployment pipelines.",
    remote: true,
    featured: false,
    postedDays: 7,
    salary: "$150k - $190k",
  },
  {
    id: 9,
    title: "Product Manager",
    company: "InnovateTech",
    location: "Chicago, IL",
    type: "Full-time",
    category: "Product",
    description: "Drive product vision and strategy for our flagship platform.",
    remote: false,
    featured: true,
    postedDays: 1,
    salary: "$130k - $160k",
  },
  {
    id: 10,
    title: "Graphic Designer",
    company: "Creative Studio",
    location: "Remote",
    type: "Contract",
    category: "Design",
    description: "Create visual assets for web and marketing campaigns.",
    remote: true,
    featured: false,
    postedDays: 3,
    salary: "$50/hr",
  },
  {
    id: 11,
    title: "AI/ML Engineer",
    company: "Neural Systems",
    location: "Palo Alto, CA",
    type: "Full-time",
    category: "Engineering",
    description: "Develop machine learning models for real-world applications.",
    remote: false,
    featured: true,
    postedDays: 5,
    salary: "$160k - $210k",
  },
  {
    id: 12,
    title: "Community Manager",
    company: "Social Connect",
    location: "Remote",
    type: "Full-time",
    category: "Marketing",
    description: "Build and engage our growing community of users.",
    remote: true,
    featured: false,
    postedDays: 4,
    salary: "$80k - $110k",
  },
];

function init() {
  appState.opportunities = mockOpportunities;
  appState.filteredOpportunities = mockOpportunities;
  loadSavedOpportunities();
  populateFilters();
  renderOpportunities();
  attachEventListeners();
  updateStats();
}

function attachEventListeners() {
  elements.searchInput.addEventListener("input", handleSearch);
  elements.categoryFilter.addEventListener("change", handleFilterChange);
  elements.locationFilter.addEventListener("change", handleFilterChange);
  elements.typeFilter.addEventListener("change", handleFilterChange);
}

function handleSearch(e) {
  appState.filters.search = e.target.value.toLowerCase();
  applyFilters();
}

function handleFilterChange(e) {
  const { id, value } = e.target;
  if (id === "category-filter") appState.filters.category = value;
  if (id === "location-filter") appState.filters.location = value;
  if (id === "type-filter") appState.filters.type = value;
  applyFilters();
}

function populateFilters() {
  const categories = [...new Set(appState.opportunities.map((opp) => opp.category))];
  const locations = [...new Set(appState.opportunities.map((opp) => opp.location))];
  const types = [...new Set(appState.opportunities.map((opp) => opp.type))];

  populateSelect(elements.categoryFilter, categories);
  populateSelect(elements.locationFilter, locations);
  populateSelect(elements.typeFilter, types);
}

function populateSelect(selectElement, options) {
  options.sort().forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    selectElement.appendChild(opt);
  });
}

function applyFilters() {
  const { search, category, location, type } = appState.filters;

  appState.filteredOpportunities = appState.opportunities.filter((opp) => {
    const matchesSearch =
      search === "" ||
      opp.title.toLowerCase().includes(search) ||
      opp.company.toLowerCase().includes(search) ||
      opp.description.toLowerCase().includes(search);

    const matchesCategory = category === "All" || opp.category === category;
    const matchesLocation = location === "All" || opp.location === location;
    const matchesType = type === "All" || opp.type === type;

    return matchesSearch && matchesCategory && matchesLocation && matchesType;
  });

  renderOpportunities();
}

function renderOpportunities() {
  const { filteredOpportunities } = appState;

  if (filteredOpportunities.length === 0) {
    elements.opportunityList.innerHTML = `
      <div class="empty-state">
        <h3>No opportunities found</h3>
        <p>Try adjusting your filters or search terms to find more opportunities.</p>
      </div>
    `;
    elements.resultsCount.textContent = "0 openings";
    return;
  }

  elements.opportunityList.innerHTML = filteredOpportunities
    .map((opp) => createOpportunityCard(opp))
    .join("");

  attachCardEventListeners();
  elements.resultsCount.textContent = `${filteredOpportunities.length} opening${filteredOpportunities.length !== 1 ? "s" : ""}`;
}

function createOpportunityCard(opp) {
  const isSaved = appState.savedOpportunities.has(opp.id);
  const remoteBadge = opp.remote ? '<span class="opp-badge remote">Remote</span>' : "";
  const featuredBadge = opp.featured ? '<span class="opp-badge featured">Featured</span>' : "";

  return `
    <article class="opportunity-card" data-id="${opp.id}">
      <div class="opp-header">
        ${featuredBadge}
        ${remoteBadge}
        <h4 class="opp-title">${escapeHtml(opp.title)}</h4>
        <p class="opp-company">${escapeHtml(opp.company)}</p>
      </div>
      <div class="opp-meta">
        <span>📍 ${escapeHtml(opp.location)}</span>
        <span>💼 ${escapeHtml(opp.type)}</span>
        <span>⏱️ ${opp.postedDays}d ago</span>
      </div>
      <div class="opp-description">${escapeHtml(opp.description)}</div>
      <div class="opp-footer">
        <span style="font-weight: 600; color: var(--primary-color);">${escapeHtml(opp.salary)}</span>
        <div style="display: flex; gap: 1rem; align-items: center;">
          <button class="opp-cta" data-id="${opp.id}">Apply Now</button>
          <button class="opp-save ${isSaved ? "saved" : ""}" data-id="${opp.id}" aria-label="Save opportunity">
            ${isSaved ? "❤️" : "🤍"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function attachCardEventListeners() {
  document.querySelectorAll(".opp-cta").forEach((btn) => {
    btn.addEventListener("click", handleApply);
  });

  document.querySelectorAll(".opp-save").forEach((btn) => {
    btn.addEventListener("click", handleSave);
  });
}

function handleApply(e) {
  const id = Number(e.target.dataset.id);
  const opportunity = appState.opportunities.find((opp) => opp.id === id);
  if (opportunity) {
    showNotification(`Applied to ${opportunity.title}!`, "success");
  }
}

function handleSave(e) {
  const id = Number(e.target.dataset.id);
  const opportunity = appState.opportunities.find((opp) => opp.id === id);
  if (!opportunity) return;

  if (appState.savedOpportunities.has(id)) {
    appState.savedOpportunities.delete(id);
    e.target.textContent = "🤍";
    e.target.classList.remove("saved");
    showNotification(`Removed ${opportunity.title}`, "info");
  } else {
    appState.savedOpportunities.add(id);
    e.target.textContent = "❤️";
    e.target.classList.add("saved");
    showNotification(`Saved ${opportunity.title}!`, "success");
  }

  saveSavedOpportunities();
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.style.position = "fixed";
  notification.style.bottom = "20px";
  notification.style.right = "20px";
  notification.style.padding = "16px 24px";
  notification.style.backgroundColor = type === "success" ? "var(--success-color)" : "var(--primary-color)";
  notification.style.color = "white";
  notification.style.borderRadius = "var(--border-radius-md)";
  notification.style.boxShadow = "var(--shadow-lg)";
  notification.style.zIndex = "1000";
  notification.style.fontWeight = "500";
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function updateStats() {
  elements.liveOpenings.textContent = appState.opportunities.length;
  elements.remoteOpenings.textContent = appState.opportunities.filter((opp) => opp.remote).length;
}

function saveSavedOpportunities() {
  localStorage.setItem("savedOpportunities", JSON.stringify(Array.from(appState.savedOpportunities)));
}

function loadSavedOpportunities() {
  const saved = localStorage.getItem("savedOpportunities");
  if (saved) {
    appState.savedOpportunities = new Set(JSON.parse(saved));
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", () => {
  init();

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = { appState, mockOpportunities };
}
