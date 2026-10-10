const opportunities = [
  {
    title: "Product Marketing Intern",
    company: "Northstar Labs",
    category: "Marketing",
    location: "Remote",
    type: "Internship",
    salary: "$20/hr",
    urgency: "2 days left",
    description: "Help shape product messaging, launch campaigns, and customer insights for a fast-moving B2B SaaS team."
  },
  {
    title: "Frontend Engineer",
    company: "Aster Works",
    category: "Engineering",
    location: "New York, NY",
    type: "Full-time",
    salary: "$120k",
    urgency: "New",
    description: "Build polished web experiences and improve conversion flows for a climate-tech platform serving global customers."
  },
  {
    title: "UX Research Fellow",
    company: "Civic Loop",
    category: "Design",
    location: "Hybrid",
    type: "Contract",
    salary: "$45/hr",
    urgency: "Urgent",
    description: "Interview users, synthesize insights, and help design civic tools that increase public access to essential services."
  },
  {
    title: "Operations Analyst",
    company: "Harbor Supply",
    category: "Operations",
    location: "Chicago, IL",
    type: "Full-time",
    salary: "$90k",
    urgency: "This week",
    description: "Improve internal workflows, reporting, and process automation across procurement and logistics operations."
  },
  {
    title: "Data Analyst",
    company: "Nova Insight",
    category: "Data",
    location: "Remote",
    type: "Full-time",
    salary: "$105k",
    urgency: "New",
    description: "Turn product and user behavior data into dashboards and recommendations that inform roadmap decisions."
  },
  {
    title: "Community Partnerships Lead",
    company: "BrightPath",
    category: "Community",
    location: "Austin, TX",
    type: "Full-time",
    salary: "$95k",
    urgency: "1 week left",
    description: "Build strategic partnerships with schools, nonprofits, and community organizations to expand educational access."
  }
];

const state = {
  search: "",
  category: "All",
  location: "All",
  type: "All"
};

const opportunityList = document.getElementById("opportunity-list");
const resultsCount = document.getElementById("results-count");
const liveOpenings = document.getElementById("live-openings");
const remoteOpenings = document.getElementById("remote-openings");
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");
const locationFilter = document.getElementById("location-filter");
const typeFilter = document.getElementById("type-filter");

function buildFilterOptions() {
  const categories = [...new Set(opportunities.map((job) => job.category))].sort();
  const locations = [...new Set(opportunities.map((job) => job.location))].sort();
  const types = [...new Set(opportunities.map((job) => job.type))].sort();

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });

  locations.forEach((location) => {
    const option = document.createElement("option");
    option.value = location;
    option.textContent = location;
    locationFilter.appendChild(option);
  });

  types.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    typeFilter.appendChild(option);
  });
}

function getFilteredJobs() {
  return opportunities.filter((job) => {
    const matchesSearch =
      !state.search ||
      [job.title, job.company, job.category, job.location, job.type]
        .join(" ")
        .toLowerCase()
        .includes(state.search.toLowerCase());

    const matchesCategory = state.category === "All" || job.category === state.category;
    const matchesLocation = state.location === "All" || job.location === state.location;
    const matchesType = state.type === "All" || job.type === state.type;

    return matchesSearch && matchesCategory && matchesLocation && matchesType;
  });
}

function renderJobs() {
  const jobs = getFilteredJobs();

  resultsCount.textContent = `${jobs.length} opening${jobs.length === 1 ? "" : "s"}`;

  if (!jobs.length) {
    opportunityList.innerHTML = '<div class="empty-state">No opportunities match your filters. Try broadening your search.</div>';
    return;
  }

  opportunityList.innerHTML = jobs
    .map(
      (job) => `
        <article class="opportunity-card">
          <div class="card-top">
            <span class="company-badge">${job.company}</span>
            <span class="urgency-tag">${job.urgency}</span>
          </div>
          <h4>${job.title}</h4>
          <div class="role-meta">
            <span>${job.category}</span>
            <span>${job.location}</span>
            <span>${job.type}</span>
          </div>
          <p>${job.description}</p>
          <div class="card-footer">
            <span class="salary">${job.salary}</span>
            <button class="apply-btn">Apply now</button>
          </div>
        </article>
      `
    )
    .join("");
}

function updateSummaryCounts() {
  liveOpenings.textContent = opportunities.length;
  remoteOpenings.textContent = opportunities.filter((job) => job.location.toLowerCase().includes("remote")).length;
}

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value.trim();
  renderJobs();
});

categoryFilter.addEventListener("change", (event) => {
  state.category = event.target.value;
  renderJobs();
});

locationFilter.addEventListener("change", (event) => {
  state.location = event.target.value;
  renderJobs();
});

typeFilter.addEventListener("change", (event) => {
  state.type = event.target.value;
  renderJobs();
});

buildFilterOptions();
updateSummaryCounts();
renderJobs();

