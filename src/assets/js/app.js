let appliedFilters = {
  applicationCode: "",
  interfaceCode: "",
  fromDateTime: "",
  toDateTime: ""
};

let currentPage = 1;
let pageSize = 10;
let totalPages = 0;
let totalElements = 0;
let hasSubmittedFilters = false;

let appSelect, ifaceSelect;

function getFilterValues() {
  return {
    applicationCode: (appSelect?.getValue?.() || "").trim(),
    interfaceCode: (ifaceSelect?.getValue?.() || "").trim(),
    fromDateTime: document.getElementById("dateFrom")?.value || "",
    toDateTime: document.getElementById("dateTo")?.value || ""
  };
}

function hasRequiredFilters(filters) {
  return Boolean(
    (filters.applicationCode || "").trim() ||
    (filters.interfaceCode || "").trim() ||
    (filters.fromDateTime || "").trim() ||
    (filters.toDateTime || "").trim()
  );
}

function updateSearchableSelect(instance, items, preserveValue = "") {
  if (!instance) return;

  instance.clearOptions();
  items.forEach(item => instance.addOption({ value: item, text: item }));
  instance.refreshOptions(false);

  if (preserveValue && items.includes(preserveValue)) {
    instance.setValue(preserveValue, true);
  } else {
    instance.setValue("", true);
  }
}

async function loadApplications() {
  const currentValue = appSelect?.getValue?.() || "";
  const apps = await fetchApplicationCodes();
  updateSearchableSelect(appSelect, apps, currentValue);
}

async function loadInterfaces(applicationCode = "", preserveSelectedInterface = "") {
  const interfaces = await fetchInterfaceCodes(applicationCode);
  updateSearchableSelect(ifaceSelect, interfaces, preserveSelectedInterface);
}

function clearFilters() {
  document.getElementById("filterForm")?.reset();
  appSelect?.setValue("", true);
  ifaceSelect?.setValue("", true);

  const dateFrom = document.getElementById("dateFrom");
  const dateTo = document.getElementById("dateTo");
  const recentRange = document.getElementById("recentRange");
  const globalSearch = document.getElementById("globalSearch");

  if (dateFrom) dateFrom.value = "";
  if (dateTo) dateTo.value = "";
  if (recentRange) recentRange.value = "";
  if (globalSearch) globalSearch.value = "";
}

function applyRecentRange() {
  const mins = parseInt(document.getElementById("recentRange")?.value, 10);
  if (!mins) return;

  const end = new Date();
  const start = new Date(end.getTime() - mins * 60000);
  const pad = n => String(n).padStart(2, "0");
  const format = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

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
    <select id="pageSizeSelect" class="form-select page-size-select">
      <option value="10">10</option>
      <option value="25">25</option>
      <option value="50">50</option>
      <option value="100">100</option>
    </select>
  `;

  tableBottom.prepend(control);

  const select = document.getElementById("pageSizeSelect");
  select.value = String(pageSize);
  select.addEventListener("change", async (e) => {
    pageSize = parseInt(e.target.value, 10) || 10;
    currentPage = 1;
    if (hasSubmittedFilters) {
      await refreshLogs();
    }
  });
}

function normalizeLogsResponse(response) {
  const content = Array.isArray(response?.content)
    ? response.content
    : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response)
        ? response
        : [];

  const pageNumber = Number(response?.number ?? response?.page ?? response?.pageNumber ?? 0);
  const totalPagesValue = Number(response?.totalPages ?? response?.pageCount ?? 0);
  const totalElementsValue = Number(response?.totalElements ?? response?.totalCount ?? content.length ?? 0);

  return {
    content,
    pageNumber,
    totalPages: totalPagesValue,
    totalElements: totalElementsValue
  };
}

function resetTableState() {
  currentPage = 1;
  totalPages = 0;
  totalElements = 0;
  refreshTable([]);
  updateEntriesText(0, 0, 0);
  renderPager(1, 0, goToPage);
}

async function renderCurrentPage() {
  if (!hasSubmittedFilters) {
    resetTableState();
    return;
  }

  const response = await fetchLogs(appliedFilters, currentPage, pageSize);
  const normalized = normalizeLogsResponse(response);

  currentPage = normalized.pageNumber + 1;
  totalPages = normalized.totalPages;
  totalElements = normalized.totalElements;

  refreshTable(normalized.content);

  if (normalized.content.length > 0 && totalElements > 0) {
    const startIndex = (normalized.pageNumber * pageSize) + 1;
    const endIndex = startIndex + normalized.content.length - 1;
    updateEntriesText(startIndex, endIndex, totalElements);
  } else {
    updateEntriesText(0, 0, 0);
  }

  renderPager(currentPage, totalPages, goToPage);
}

async function goToPage(page) {
  if (!hasSubmittedFilters) return;
  if (page < 1) return;
  if (totalPages > 0 && page > totalPages) return;

  currentPage = page;
  await renderCurrentPage();
}

async function refreshLogs() {
  await renderCurrentPage();
}

document.addEventListener("DOMContentLoaded", async () => {
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

  await Promise.all([loadApplications(), loadInterfaces()]);

  initLogsTable([]);
  ensurePageSizeControl();
  resetTableState();

  appSelect.on("change", async (value) => {
    const currentInterface = ifaceSelect?.getValue?.() || "";
    await loadInterfaces(value, currentInterface);
  });

  document.getElementById("submitBtn").addEventListener("click", async (e) => {
    e.preventDefault();

    const filters = getFilterValues();
    if (!hasRequiredFilters(filters)) {
      alert("Please select at least one filter before submitting.");
      hasSubmittedFilters = false;
      resetTableState();
      return;
    }

    appliedFilters = filters;
    hasSubmittedFilters = true;
    currentPage = 1;
    await refreshLogs();
  });

  document.getElementById("clearBtn").addEventListener("click", async () => {
    clearFilters();
    appliedFilters = {
      applicationCode: "",
      interfaceCode: "",
      fromDateTime: "",
      toDateTime: ""
    };
    hasSubmittedFilters = false;
    await loadInterfaces();
    resetTableState();
  });

  document.getElementById("recentRange").addEventListener("change", () => {
    applyRecentRange();
  });

  document.getElementById("dateFrom").addEventListener("change", () => {
    document.getElementById("recentRange").value = "";
  });

  document.getElementById("dateTo").addEventListener("change", () => {
    document.getElementById("recentRange").value = "";
  });
});