let appliedFilters = {
  applicationCode: "",
  interfaceCode: "",
  fromDateTime: "",
  toDateTime: "",
  searchBy: "",
  searchValue: "",
  caseType: ""
};


let currentPage = 1;
let pageSize = 10;
let hasSubmittedFilters = false;

let appSelect, ifaceSelect, searchTypeSelect;
let activeTab = "EXPLORER";

function syncTableViewClass(mode) {
  const tableWrap = document.querySelector(".table-wrap");
  if (!tableWrap) return;

  tableWrap.classList.toggle("duration-view", mode === "DURATION");
  tableWrap.classList.toggle("minmax-view", mode === "MINMAX");
}

document.querySelectorAll("#logTabs button").forEach((button) => {
  button.addEventListener("shown.bs.tab", async (e) => {
    // document.getElementById("summaryDisplay").style.display = "none";
    setSummaryVisible(false);

    activeTab = e.target.getAttribute("data-type");
    currentPage = 1;

    syncTableViewClass(activeTab);

    initLogsTable([], activeTab);
    updateEntriesText(0, 0, 0);
    renderPager(1, 0, goToPage);
    updateSummaryUI({ successCount: 0, errorCount: 0, uniqueTransactionCount: 0 });

    clearFilters();
    appliedFilters = {
      applicationCode: "",
      interfaceCode: "",
      fromDateTime: "",
      toDateTime: "",
      searchBy: "",
      searchValue: "",
      caseType: ""
    };
    hasSubmittedFilters = false;

    await loadInterfaces();

    console.log(`Tab switched to: ${activeTab}. Waiting for Submit click...`);
  });
});

function toggleTableLoader(show) {
  const loader = document.getElementById("tableLoader");
  if (loader) {
    loader.style.display = show ? "flex" : "none";
  }
}

function getSearchTypeValue() {
  return searchTypeSelect?.getValue?.() || "transactionId";
}

function setSearchTypeValue(value) {
  if (searchTypeSelect) {
    searchTypeSelect.setValue(value, true);
    return;
  }

  const fallback = document.getElementById("searchType");
  if (fallback) fallback.value = value;
}

function styleSearchTypeSelect(instance) {
  if (!instance) return;

  const wrapper = instance.wrapper;
  if (wrapper) {
    wrapper.style.width = "160px";
    wrapper.style.minWidth = "165px";
    wrapper.style.flex = "0 0 140px";
  }

  const control = wrapper?.querySelector?.(".ts-control");
  if (control) {
    control.style.borderTopRightRadius = "0";
    control.style.borderBottomRightRadius = "0";
  }
}

function normalizeDateTime(value) {
  if (!value) return "";
  return value.length === 16 ? `${value}:00` : value;
}

function getFilterValues() {
  const searchType = getSearchTypeValue();
  const searchKeyword = document.getElementById("searchKeyword")?.value?.trim() || "";

  let searchBy = "";
  if (searchKeyword) {
    if (searchType === "transactionId") {
      searchBy = "TRANSACTION_ID";
    } else if (searchType === "loggedMessage") {
      searchBy = "LOGGED_MESSAGE";
    }
  }

  return {
    applicationCode: (appSelect?.getValue?.() || "").trim(),
    interfaceCode: (ifaceSelect?.getValue?.() || "").trim(),
    fromDateTime: document.getElementById("dateFrom")?.value || "",
    toDateTime: document.getElementById("dateTo")?.value || "",
    searchBy,
    searchValue: searchKeyword
  };
}

function hasRequiredFilters(filters) {
  return Boolean(
    (filters.applicationCode || "").trim() ||
    (filters.interfaceCode || "").trim() ||
    (filters.fromDateTime || "").trim() ||
    (filters.toDateTime || "").trim() ||
    (filters.searchValue || "").trim()
  );
}

function validateSearchFilters(filters) {
  if (filters.searchBy === "LOGGED_MESSAGE") {
    if (!filters.applicationCode) {
      alert("Application Code is required for Logged Message search.");
      return false;
    }

    if (!filters.fromDateTime || !filters.toDateTime) {
      alert("Both From Date and To Date are required for Logged Message search.");
      return false;
    }
  }

  return true;
}

function updateSearchableSelect(instance, items, preserveValue = "", defaultLabel = "All") {
  if (!instance) return;

  instance.clearOptions();
  instance.addOption({ value: "", text: defaultLabel });

  items.forEach(item => {
    instance.addOption({ value: item, text: item });
  });

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
  const sortedApps = Array.isArray(apps) ? [...apps].sort((a, b) => a.localeCompare(b)) : [];
  updateSearchableSelect(appSelect, sortedApps, currentValue, "All Applications");
}

async function loadInterfaces(applicationCode = "", preserveSelectedInterface = "") {
  const interfaces = await fetchInterfaceCodes(applicationCode);
  const sortedInterfaces = Array.isArray(interfaces) ? [...interfaces].sort((a, b) => a.localeCompare(b)) : [];
  updateSearchableSelect(ifaceSelect, sortedInterfaces, preserveSelectedInterface, "All Interfaces");
}

function clearFilters() {
  document.getElementById("filterForm")?.reset();
  appSelect?.setValue("", true);
  ifaceSelect?.setValue("", true);
  setSearchTypeValue("transactionId");

  const dateFrom = document.getElementById("dateFrom");
  const dateTo = document.getElementById("dateTo");
  const recentRange = document.getElementById("recentRange");
  const globalSearch = document.getElementById("globalSearch");
  const searchKeyword = document.getElementById("searchKeyword");

  if (dateFrom) dateFrom.value = "";
  if (dateTo) dateTo.value = "";
  if (recentRange) recentRange.value = "";
  if (globalSearch) globalSearch.value = "";
  if (searchKeyword) searchKeyword.value = "";
}

function applyRecentRange() {
  const mins = parseInt(document.getElementById("recentRange")?.value, 10);
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
    <label for="pageSizeSelect" class="page-size-label">Rows per page</label>
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
  select.addEventListener("change", async e => {
    pageSize = parseInt(e.target.value, 10) || 10;
    currentPage = 1;

    if (!hasSubmittedFilters || !hasRequiredFilters(appliedFilters)) {
      resetTableState();
      return;
    }

    await renderCurrentPage();
  });
}

function resetTableState() {
  currentPage = 1;
  refreshTable([], activeTab);
  updateEntriesText(0, 0, 0);
  renderPager(1, 0, goToPage);
}

function updateSummaryUI(summary) {
  const successEl = document.getElementById("successCount");
  const errorEl = document.getElementById("errorCount");
  const uniqueEl = document.getElementById("uniqueCount");

  if (successEl && errorEl && uniqueEl) {
    successEl.textContent = summary?.successCount ?? 0;
    errorEl.textContent = summary?.errorCount ?? 0;
    uniqueEl.textContent = summary?.uniqueTransactionCount ?? 0;
  }
}

function setSummaryVisible(visible) {
  const el = document.getElementById("summaryDisplay");
  if (!el) return;

  el.classList.toggle("hidden-summary", !visible);
}

async function renderCurrentPage() {
  toggleTableLoader(true);

  try {
    syncTableViewClass(activeTab);

    const response = await fetchLogs(appliedFilters, currentPage, pageSize, activeTab);

    if (!response || response.skipped) {
      initLogsTable([], activeTab);
      updateEntriesText(0, 0, 0);
      renderPager(0, 0, () => {});
      updateSummaryUI({ successCount: 0, errorCount: 0, uniqueTransactionCount: 0 });
      return;
    }

    const isExplorer = activeTab === "EXPLORER";
    const isDuration = activeTab === "DURATION";
    const isMinMax = activeTab === "MINMAX";

    let tableData = [];
    let totalElements = 0;
    let totalPages = 0;

    if (isExplorer) {
      const pageObj = response.page || {};
      tableData = pageObj.content || [];
      totalElements = pageObj.totalElements || 0;
      totalPages = pageObj.totalPages || 0;
      updateSummaryUI(response?.summary || { successCount: 0, errorCount: 0, uniqueTransactionCount: 0 });
    } else {
      tableData = response.content || [];
      totalElements = response.totalElements || 0;
      totalPages = response.totalPages || 0;

      if (isDuration) {
        updateSummaryUI(response?.summary || { successCount: 0, errorCount: 0, uniqueTransactionCount: 0 });
      } else if (isMinMax) {
        updateSummaryUI({ successCount: 0, errorCount: 0, uniqueTransactionCount: 0 });
      }
    }

    initLogsTable(tableData, activeTab);

    const showSummary = activeTab === "EXPLORER" || activeTab === "DURATION";

          if (showSummary) {
            setSummaryVisible(true);
            updateSummaryUI(
              response?.summary || {
                successCount: 0,
                errorCount: 0,
                uniqueTransactionCount: 0
              }
            );
          } else {
            setSummaryVisible(false);
          }

    const start = totalElements === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalElements);
    updateEntriesText(start, end, totalElements);

    renderPager(currentPage, totalPages, async (page) => {
      currentPage = page;
      await renderCurrentPage();
    });
  } catch (e) {
    console.error("Render Error:", e);
    const tbody = document.querySelector("#logsTable tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error: ${e.message}</td></tr>`;
    }
  } finally {
    toggleTableLoader(false);
  }
}

async function goToPage(page) {
  if (!hasSubmittedFilters || !hasRequiredFilters(appliedFilters)) return;
  if (page < 1) return;

  currentPage = page;
  await renderCurrentPage();
}

document.addEventListener("DOMContentLoaded", async () => {
  setSummaryVisible(false); 
  appSelect = new TomSelect("#applicationName", {
    create: false,
    placeholder: "All Applications",
    allowEmptyOption: true
  });

  ifaceSelect = new TomSelect("#interfaceName", {
    create: false,
    placeholder: "All Interfaces",
    allowEmptyOption: true
  });

  searchTypeSelect = new TomSelect("#searchType", {
    create: false,
    allowEmptyOption: false,
    controlInput: null
  });

  styleSearchTypeSelect(searchTypeSelect);
  window.addEventListener("resize", () => styleSearchTypeSelect(searchTypeSelect));

  await Promise.all([loadApplications(), loadInterfaces()]);

  initLogsTable([], activeTab);
  ensurePageSizeControl();
  syncTableViewClass(activeTab);
  resetTableState();

  appSelect.on("change", async value => {
    const currentInterface = ifaceSelect?.getValue?.() || "";
    await loadInterfaces(value, currentInterface);
  });

  document.getElementById("submitBtn").addEventListener("click", async e => {
    e.preventDefault();

    const filters = getFilterValues();
    console.log("Submit filters:", filters);

    if (!validateSearchFilters(filters)) {
      return;
    }

    appliedFilters = { ...filters, caseType: "" };
    hasSubmittedFilters = true;
    currentPage = 1;
    await renderCurrentPage();
  });

  document.getElementById("clearBtn").addEventListener("click", async () => {
    clearFilters();

    // document.getElementById("summaryDisplay").style.display = "none";
    appliedFilters = {
      applicationCode: "",
      interfaceCode: "",
      fromDateTime: "",
      toDateTime: "",
      searchBy: "",
      searchValue: "",
      caseType: ""
    };
    hasSubmittedFilters = false;

    await loadInterfaces();

    document.getElementById("successCount").textContent = "0";
    document.getElementById("errorCount").textContent = "0";
    document.getElementById("uniqueCount").textContent = "0";

    setSummaryVisible(false);

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

  const successPill = document.getElementById("successCount")?.closest(".stat-pill");
  const errorPill = document.getElementById("errorCount")?.closest(".stat-pill");

  if (successPill) {
    successPill.style.cursor = "pointer";
    successPill.addEventListener("click", () => triggerCaseFilter("success"));
  }

  if (errorPill) {
    errorPill.style.cursor = "pointer";
    errorPill.addEventListener("click", () => triggerCaseFilter("error"));
  }
});

async function triggerCaseFilter(type) {
  const currentFilters = getFilterValues();

  appliedFilters = {
    ...currentFilters,
    caseType: type
  };

  currentPage = 1;
  await renderCurrentPage();
}