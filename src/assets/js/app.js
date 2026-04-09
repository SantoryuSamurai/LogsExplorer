// assets/js/app.js

let appliedFilters = {
  applicationName: "",
  interfaceName: "",
  dateFrom: "",
  dateTo: "",
  search: ""
};

let currentFilteredLogs = [];
let currentPage = 1;
let pageSize = 10;

// Tom Select instances for programmatic control
let appSelect, ifaceSelect;

/**
 * Retrieves current filter values from the UI
 */
function getFilterValues() {
  return {
    // Get values from Tom Select instances
    applicationName: appSelect ? appSelect.getValue().trim() : "",
    interfaceName: ifaceSelect ? ifaceSelect.getValue().trim() : "",
    dateFrom: document.getElementById("dateFrom").value,
    dateTo: document.getElementById("dateTo").value,
    search: document.getElementById("globalSearch").value.trim()
  };
}

/**
 * Helper to update Tom Select options dynamically
 * Fixed: Removed adding placeholder as a selectable option to prevent redundancy.
 */
function updateSearchableSelect(instance, items) {
  if (!instance) return;

  // Clear existing options
  instance.clearOptions();
  
  // Add actual data items from the API
  items.forEach(item => {
    instance.addOption({ value: item, text: item });
  });
  
  // Refresh the UI and reset to empty state (which shows the placeholder)
  instance.refreshOptions(false);
  instance.setValue(""); 
}

async function loadApplications() {
  const apps = await fetchApplicationCodes(); // From api.js
  updateSearchableSelect(appSelect, apps);
}

async function loadInterfaces(applicationName = "") {
  const interfaces = await fetchInterfaceCodes(applicationName); // From api.js
  updateSearchableSelect(ifaceSelect, interfaces);
}

function clearFilters() {
  document.getElementById("filterForm").reset();
  
  // Reset Tom Select components to show their placeholders
  if (appSelect) appSelect.setValue("");
  if (ifaceSelect) ifaceSelect.setValue("");
  
  document.getElementById("dateFrom").value = "";
  document.getElementById("dateTo").value = "";
  document.getElementById("recentRange").value = "";
  document.getElementById("globalSearch").value = "";
}

// ... (Paging and Table logic remains the same as your previous working version)

function applyRecentRange() {
  const mins = parseInt(document.getElementById("recentRange").value, 10);
  if (!mins) return;

  const end = new Date();
  const start = new Date(end.getTime() - mins * 60000);

  const pad = n => String(n).padStart(2, "0");
  const format = d =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  document.getElementById("dateFrom").value = format(start);
  document.getElementById("dateTo").value = format(end);
}

function ensurePageSizeControl() {
  const tableBottom = document.querySelector(".table-bottom");
  if (!tableBottom || document.getElementById("pageSizeControl")) return;

  const control = document.createElement("div");
  control.className = "page-size-control";
  control.id = "pageSizeControl";
  control.innerHTML = `
    <label class="page-size-label" for="pageSizeSelect">Rows per page</label>
    <select id="pageSizeSelect" class="form-select form-select-sm page-size-select">
      <option value="10">10</option>
      <option value="25">25</option>
      <option value="50">50</option>
      <option value="100">100</option>
    </select>
  `;

  tableBottom.prepend(control);

  const select = document.getElementById("pageSizeSelect");
  select.value = String(pageSize);

  select.addEventListener("change", (e) => {
    pageSize = parseInt(e.target.value, 10) || 10;
    currentPage = 1;
    renderCurrentPage();
  });
}

function getTotalPages() {
  return currentFilteredLogs.length > 0
    ? Math.ceil(currentFilteredLogs.length / pageSize)
    : 0;
}

function goToPage(page) {
  currentPage = page;
  renderCurrentPage();
}

function renderCurrentPage() {
  const total = currentFilteredLogs.length;
  const totalPages = getTotalPages();

  if (totalPages > 0) {
    currentPage = Math.min(Math.max(currentPage, 1), totalPages);
  } else {
    currentPage = 1;
  }

  const startIndex = total > 0 ? (currentPage - 1) * pageSize : 0;
  const endIndex = total > 0 ? Math.min(startIndex + pageSize, total) : 0;
  const pageData = total > 0 ? currentFilteredLogs.slice(startIndex, endIndex) : [];

  refreshTable(pageData); // From table.js

  if (total > 0) {
    updateEntriesText(startIndex + 1, endIndex, total); // From table.js
  } else {
    updateEntriesText(0, 0, 0);
  }

  renderPager(currentPage, totalPages, goToPage); // From table.js
}

function refreshLogs() {
  currentFilteredLogs = getFilteredLogs(appliedFilters); // From api.js
  currentPage = 1;
  renderCurrentPage();
}

function applyFiltersFromUI() {
  appliedFilters = getFilterValues();
  refreshLogs();
}

function applyLiveSearch() {
  appliedFilters.search = document.getElementById("globalSearch").value.trim();
  refreshLogs();
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Initialize Tom Select with specific placeholders
  appSelect = new TomSelect("#applicationName", {
    create: false,
    placeholder: "Select Applications...",
    allowEmptyOption: true,
    sortField: { field: "text", direction: "asc" }
  });

  ifaceSelect = new TomSelect("#interfaceName", {
    create: false,
    placeholder: "Select Interfaces...",
    allowEmptyOption: true,
    sortField: { field: "text", direction: "asc" }
  });

  // 2. Initial Data Load
  await Promise.all([loadApplications(), loadInterfaces()]);

  // 3. Initialize Logs Table
  initLogsTable([]); 
  ensurePageSizeControl();
  refreshLogs();

  // --- Event Listeners ---

  appSelect.on('change', async (value) => {
        await loadInterfaces(value);
    });

  document.getElementById("submitBtn").addEventListener("click", (e) => {
    e.preventDefault();
    // applyFiltersFromUI();
    appliedFilters = {
            applicationName: appSelect.getValue(),
            interfaceName: ifaceSelect.getValue(),
            dateFrom: document.getElementById("dateFrom").value,
            dateTo: document.getElementById("dateTo").value,
            search: document.getElementById("globalSearch").value.trim()
        };
  });

  document.getElementById("globalSearch").addEventListener("input", () => {
    applyLiveSearch();
  });

  document.getElementById("clearBtn").addEventListener("click", () => {
    clearFilters();
    appliedFilters = {
      applicationName: "",
      interfaceName: "",
      dateFrom: "",
      dateTo: "",
      search: ""
    };
    currentPage = 1;
    loadInterfaces();
    refreshLogs();
  });

  document.getElementById("recentRange").addEventListener("change", () => {
    applyRecentRange();
  });

  // Update interface dropdown when application changes
  appSelect.on('change', (value) => {
    loadInterfaces(value);
  });

  document.getElementById("dateFrom").addEventListener("change", () => {
    document.getElementById("recentRange").value = "";
  });

  document.getElementById("dateTo").addEventListener("change", () => {
    document.getElementById("recentRange").value = "";
  });
});