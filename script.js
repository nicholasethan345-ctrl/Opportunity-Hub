const appState = {
  opportunities: window.opportunityData || [],
  filteredOpportunities: [],
  savedOpportunities: new Set(),
  filters: {
    search: "",
    category: "All",
    location: "All",
    type: "All",
    salary: "All",
    remoteOnly: false,
  },
};

const elements = {
  searchInput: document.getElementById("search-input"),
  categoryFilter: document.getElementById("category-filter"),
  locationFilter: document.getElementById("location-filter"),
  typeFilter: document.getElementById("type-filter"),
  salaryFilter: document.getElementById("salary-filter"),
  remoteOnly: document.getElementById("remote-only"),
  opportunityList: document.getElementById("opportunity-list"),
  resultsCount: document.getElementById("results-count"),
  liveOpenings: document.getElementById("live-openings"),
  remoteOpenings: document.getElementById("remote-openings"),
  themeToggle: document.getElementById("theme-toggle"),
  newsletterForm: document.getElementById("newsletter-form"),
  contactForm: document.getElementById("contact-form"),
  contactStatus: document.getElementById("contact-status"),
};

function init() {
  appState.filteredOpportunities = [...appState.opportunities];
  loadSavedOpportunities();
  loadTheme();
  populateFilters();
  renderOpportunities();
  updateStats();
  attachEventListeners();
}

function attachEventListeners() {
  if (elements.searchInput) {
    elements.searchInput.addEventListener("input", handleSearch);
  }

  if (elements.categoryFilter) {
    elements.categoryFilter.addEventListener("change", handleFilterChange);
  }

  if (elements.locationFilter) {
    elements.locationFilter.addEventListener("change", handleFilterChange);
  }

  if (elements.typeFilter) {
    elements.typeFilter.addEventListener("change", handleFilterChange);
  }

  if (elements.salaryFilter) {
    elements.salaryFilter.addEventListener("change", handleFilterChange);
  }

  if (elements.remoteOnly) {
    elements.remoteOnly.addEventListener("change", handleFilterChange);
  }

  if (elements.themeToggle) {
    elements.themeToggle.addEventListener("click", toggleTheme);
  }

  if (elements.newsletterForm) {
    elements.newsletterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const button = elements.newsletterForm.querySelector("button");
      button.textContent = "Subscribed";
      button.disabled = true;
      showNotification("You’re subscribed to Opportunity Hub updates.", "success");
    });
  }

  if (elements.contactForm) {
    elements.contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const form = event.currentTarget;
      const formData = new FormData(form);
      const payload = {
        name: formData.get("name")?.toString().trim(),
        email: formData.get("email")?.toString().trim(),
        company: formData.get("company")?.toString().trim(),
        reason: formData.get("reason")?.toString().trim() || "General enquiry",
        message: formData.get("message")?.toString().trim(),
      };

      if (!payload.name || !payload.email || !payload.message) {
        setContactStatus("Please fill in your name, email, and message.", true);
        return;
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(payload.email)) {
        setContactStatus("Please enter a valid email address.", true);
        return;
      }

      const submitButton = form.querySelector("button[type='submit']");
      const originalText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
      setContactStatus("");

      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to send message.");
        }

        form.reset();
        setContactStatus(result.message || "Your message has been sent.", false);
      } catch (error) {
        setContactStatus(error.message || "Something went wrong. Please try again.", true);
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    });
  }
}

function setContactStatus(message, isError = false) {
  if (!elements.contactStatus) return;
  elements.contactStatus.textContent = message;
  elements.contactStatus.classList.toggle("error", isError);
}

function handleSearch(event) {
  appState.filters.search = event.target.value.toLowerCase();
  applyFilters();
}

function handleFilterChange(event) {
  const { id, value, checked } = event.target;

  if (id === "category-filter") appState.filters.category = value;
  if (id === "location-filter") appState.filters.location = value;
  if (id === "type-filter") appState.filters.type = value;
  if (id === "salary-filter") appState.filters.salary = value;
  if (id === "remote-only") appState.filters.remoteOnly = checked;

  applyFilters();
}

function populateFilters() {
  const categories = [...new Set(appState.opportunities.map((opp) => opp.category))].sort();
  const locations = [...new Set(appState.opportunities.map((opp) => opp.location))].sort();
  const types = [...new Set(appState.opportunities.map((opp) => opp.type))].sort();

  populateSelect(elements.categoryFilter, categories);
  populateSelect(elements.locationFilter, locations);
  populateSelect(elements.typeFilter, types);
}

function populateSelect(selectElement, options) {
  if (!selectElement) return;

  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    selectElement.appendChild(opt);
  });
}

function applyFilters() {
  const { search, category, location, type, salary, remoteOnly } = appState.filters;

  appState.filteredOpportunities = appState.opportunities.filter((opp) => {
    const matchesSearch =
      !search ||
      opp.title.toLowerCase().includes(search) ||
      opp.company.toLowerCase().includes(search) ||
      opp.description.toLowerCase().includes(search) ||
      opp.tags.some((tag) => tag.toLowerCase().includes(search));

    const matchesCategory = category === "All" || opp.category === category;
    const matchesLocation = location === "All" || opp.location === location;
    const matchesType = type === "All" || opp.type === type;
    const matchesRemote = !remoteOnly || opp.remote;

    const matchesSalary = (() => {
      if (salary === "All") return true;
      if (salary === "Under $100k") return parseInt(opp.salary.replace(/[^\d]/g, ""), 10) < 100000;
      if (salary === "$100k - $150k") return parseInt(opp.salary.split("-")[0].replace(/[^\d]/g, ""), 10) >= 100000;
      if (salary === "$150k+") return parseInt(opp.salary.replace(/[^\d]/g, ""), 10) >= 150000;
      return true;
    })();

    return matchesSearch && matchesCategory && matchesLocation && matchesType && matchesRemote && matchesSalary;
  });

  renderOpportunities();
}

function renderOpportunities() {
  const { filteredOpportunities } = appState;

  if (!filteredOpportunities.length) {
    elements.opportunityList.innerHTML = `
      <div class="empty-state">
        <h3>No opportunities found</h3>
        <p>Try broadening your search or clearing some filters.</p>
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
  const tagHtml = opp.tags.map((tag) => `<span class="opp-tag">${safe(tag)}</span>`).join("");

  return `
    <article class="opportunity-card">
      <div class="opp-header">
        <div class="opp-badges">${featuredBadge}${remoteBadge}</div>
        <h4 class="opp-title">${safe(opp.title)}</h4>
        <p class="opp-company">${safe(opp.company)}</p>
      </div>

      <div class="opp-meta">
        <span>📍 ${safe(opp.location)}</span>
        <span>💼 ${safe(opp.type)}</span>
        <span>⏱️ ${opp.postedDays}d ago</span>
      </div>

      <div class="opp-description">
        <p>${safe(opp.description)}</p>
        <div class="opp-tags">${tagHtml}</div>
      </div>

      <div class="opp-footer">
        <span class="opp-salary">${safe(opp.salary)}</span>
        <div class="opp-actions">
          <button class="opp-cta" data-id="${opp.id}" type="button">View details</button>
          <button class="opp-save ${isSaved ? "saved" : ""}" data-id="${opp.id}" aria-label="Save opportunity" type="button">
            ${isSaved ? "❤️" : "🤍"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function attachCardEventListeners() {
  document.querySelectorAll(".opp-cta").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      window.location.href = `details.html?id=${id}`;
    });
  });

  document.querySelectorAll(".opp-save").forEach((button) => {
    button.addEventListener("click", toggleSavedOpportunity);
  });
}

function toggleSavedOpportunity(event) {
  const id = Number(event.target.dataset.id);
  const op = appState.opportunities.find((opp) => opp.id === id);

  if (!op) return;

  if (appState.savedOpportunities.has(id)) {
    appState.savedOpportunities.delete(id);
    event.target.textContent = "🤍";
    event.target.classList.remove("saved");
    showNotification(`Removed ${op.title} from saved jobs.`, "info");
  } else {
    appState.savedOpportunities.add(id);
    event.target.textContent = "❤️";
    event.target.classList.add("saved");
    showNotification(`Saved ${op.title}!`, "success");
  }

  saveSavedOpportunities();
}

function saveSavedOpportunities() {
  localStorage.setItem("savedOpportunities", JSON.stringify([...appState.savedOpportunities]));
}

function loadSavedOpportunities() {
  const saved = JSON.parse(localStorage.getItem("savedOpportunities") || "[]");
  appState.savedOpportunities = new Set(saved);
}

function updateStats() {
  if (!elements.liveOpenings || !elements.remoteOpenings) return;
  elements.liveOpenings.textContent = appState.opportunities.length;
  elements.remoteOpenings.textContent = appState.opportunities.filter((opp) => opp.remote).length;
}

function toggleTheme() {
  const docBody = document.body;
  const currentTheme = docBody.dataset.theme;
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  docBody.dataset.theme = nextTheme;
  localStorage.setItem("opportunity-hub-theme", nextTheme);
  elements.themeToggle.textContent = nextTheme === "dark" ? "☀️ Light" : "🌙 Dark";
}

function loadTheme() {
  const storedTheme = localStorage.getItem("opportunity-hub-theme") || "light";
  document.body.dataset.theme = storedTheme;
  elements.themeToggle.textContent = storedTheme === "dark" ? "☀️ Light" : "🌙 Dark";
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.style.position = "fixed";
  notification.style.right = "20px";
  notification.style.bottom = "20px";
  notification.style.zIndex = "9999";
  notification.style.background = type === "success" ? "#10b981" : "#2563eb";
  notification.style.color = "#fff";
  notification.style.padding = "0.9rem 1.25rem";
  notification.style.borderRadius = "12px";
  notification.style.boxShadow = "0 20px 45px rgba(15, 23, 42, 0.16)";
  notification.style.fontWeight = "600";
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 2500);
}

function safe(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", init);
