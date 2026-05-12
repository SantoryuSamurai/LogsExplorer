let cachedApps = null;
let cachedInterfaces = {}; 

function createEmptyFilters() {
  return {
    applicationCode: "",
    interfaceCodes: [],
    fromDateTime: "",
    toDateTime: "",
    searchBy: "",
    searchValue: "",
    caseType: "",
  };
}

// Use it for initialization
let appliedFilters = createEmptyFilters();

let trendChart = null;
let activeTrendInterface = "";

let currentPage = 1;
let pageSize = 10;
let hasSubmittedFilters = false;

let appSelect, ifaceSelect, searchTypeSelect;
let activeTab = "EXPLORER";

const API_DATETIME_FORMAT = "Y-m-d\\TH:i:S";
const DISPLAY_DATETIME_FORMAT = "d-m-Y H:i";
let dateFromPicker = null;
let dateToPicker = null;
let chartDateFromPicker = null;
let chartDateToPicker = null;
let isApplyingRecentRange = false;

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatApiDateTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate(),
  )}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(
    date.getSeconds(),
  )}`;
}

function formatDisplayDateTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";

  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()} ${pad2(
    date.getHours(),
  )}:${pad2(date.getMinutes())}`;
}

function parseDateTimeValue(value) {
  if (!value) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const isoMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (isoMatch) {
    const [, y, m, d, h, min, s = "0"] = isoMatch;
    const parsed = new Date(+y, +m - 1, +d, +h, +min, +s);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const displayMatch = raw.match(
    /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (displayMatch) {
    const [, d, m, y, h, min, s = "0"] = displayMatch;
    const parsed = new Date(+y, +m - 1, +d, +h, +min, +s);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function setDateTimeField(picker, inputId, value, triggerChange = false) {
  if (picker?.setDate) {
    picker.setDate(value || null, triggerChange);
    return;
  }

  const input = document.getElementById(inputId);
  if (!input) return;

  if (!value) {
    input.value = "";
    return;
  }

  const parsed = value instanceof Date ? value : parseDateTimeValue(value);
  input.value = parsed ? formatDisplayDateTime(parsed) : String(value);
}

function getDateTimeFieldValue(picker, inputId) {
  if (picker?.input?.value) return picker.input.value;
  return document.getElementById(inputId)?.value || "";
}

function clearDateTimeField(picker, inputId) {
  if (picker?.clear) {
    picker.clear();
    return;
  }

  const input = document.getElementById(inputId);
  if (input) input.value = "";
}

function syncMainDateBounds() {
  const fromValue = getDateTimeFieldValue(dateFromPicker, "dateFrom");
  const toValue = getDateTimeFieldValue(dateToPicker, "dateTo");
  const fromDate = parseDateTimeValue(fromValue);
  const toDate = parseDateTimeValue(toValue);

  if (dateFromPicker?.set) {
    dateFromPicker.set("maxDate", toDate || null);
  }
  if (dateToPicker?.set) {
    dateToPicker.set("minDate", fromDate || null);
  }
}

function syncChartDateBounds() {
  const fromValue = getDateTimeFieldValue(chartDateFromPicker, "chartDateFrom");
  const toValue = getDateTimeFieldValue(chartDateToPicker, "chartDateTo");
  const fromDate = parseDateTimeValue(fromValue);
  const toDate = parseDateTimeValue(toValue);

  if (chartDateFromPicker?.set) {
    chartDateFromPicker.set("maxDate", toDate || null);
  }
  if (chartDateToPicker?.set) {
    chartDateToPicker.set("minDate", fromDate || null);
  }
}

function initializeDatePickers() {
  const recentRange = document.getElementById("recentRange");
  const hasFlatpickr = typeof window.flatpickr === "function";

  const baseOptions = {
    enableTime: true,
    time_24hr: true,
    minuteIncrement: 1,
    allowInput: true,
    altInput: true,
    altFormat: DISPLAY_DATETIME_FORMAT,
    dateFormat: API_DATETIME_FORMAT,
    altInputClass: "form-control date-input flatpickr-alt-input",
    disableMobile: true,
  };

  if (hasFlatpickr) {
    const mainOptions = {
      ...baseOptions,
      onChange: () => {
        if (!isApplyingRecentRange && recentRange) {
          recentRange.value = "";
        }
        syncMainDateBounds();
      },
    };

    dateFromPicker = window.flatpickr("#dateFrom", mainOptions);
    dateToPicker = window.flatpickr("#dateTo", {
      ...baseOptions,
      onChange: () => {
        if (!isApplyingRecentRange && recentRange) {
          recentRange.value = "";
        }
        syncMainDateBounds();
      },
    });

    chartDateFromPicker = window.flatpickr("#chartDateFrom", {
      ...baseOptions,
      onChange: () => {
        syncChartDateBounds();
      },
    });
    chartDateToPicker = window.flatpickr("#chartDateTo", {
      ...baseOptions,
      onChange: () => {
        syncChartDateBounds();
      },
    });
  } else {
    ["dateFrom", "dateTo", "chartDateFrom", "chartDateTo"].forEach((id) => {
      const input = document.getElementById(id);
      if (input) {
        input.setAttribute("type", "text");
        input.setAttribute("placeholder", "dd-mm-yyyy hh:mm");
        input.setAttribute("inputmode", "numeric");
      }
    });

    ["dateFrom", "dateTo"].forEach((id) => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener("change", () => {
          if (!isApplyingRecentRange && recentRange) {
            recentRange.value = "";
          }
          syncMainDateBounds();
        });
      }
    });

    ["chartDateFrom", "chartDateTo"].forEach((id) => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener("change", () => {
          syncChartDateBounds();
        });
      }
    });
  }

  syncMainDateBounds();
  syncChartDateBounds();
}


function syncTableViewClass(mode) {
  const tableWrap = document.querySelector(".table-wrap");
  if (!tableWrap) return;

  tableWrap.classList.toggle("duration-view", mode === "DURATION");
  tableWrap.classList.toggle("minmax-view", mode === "MINMAX");
}

function isValidDateRange(from, to) {
  const fromDate = parseDateTimeValue(from);
  const toDate = parseDateTimeValue(to);

  if (fromDate && toDate && fromDate > toDate) {
    alert("From Date cannot be later than To Date.");
    return false;
  }
  return true;
}

document.querySelectorAll("#logTabs button").forEach((button) => {
  button.addEventListener("shown.bs.tab", async (e) => {
    // document.getElementById("summaryDisplay").style.display = "none";
    setSummaryVisible(false);

    activeTab = e.target.getAttribute("data-type");
    currentPage = 1;

    const exportContainer = document.getElementById("exportContainer");
    if (activeTab === "EXPLORER") {
      exportContainer.style.display = "flex";
    } else {
      exportContainer.style.display = "none";
    }

    syncTableViewClass(activeTab);

    initLogsTable([], activeTab);
    updateEntriesText(0, 0, 0);
    renderPager(1, 0, goToPage);
    updateSummaryUI({
      successCount: 0,
      errorCount: 0,
      uniqueTransactionCount: 0,
    });

    clearFilters();

    appliedFilters = createEmptyFilters();

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

function getFilterValues() {
  const searchType = getSearchTypeValue();
  const searchKeyword =
    document.getElementById("searchKeyword")?.value?.trim() || "";

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
    interfaceCodes: (() => {
      const value = ifaceSelect?.getValue?.();
      if (!value) return [];
      return Array.isArray(value)
        ? value.map((v) => v.trim()).filter(Boolean)
        : [value.trim()];
    })(),
    fromDateTime: getDateTimeFieldValue(dateFromPicker, "dateFrom"),
    toDateTime: getDateTimeFieldValue(dateToPicker, "dateTo"),
    searchBy,
    searchValue: searchKeyword,
  };
}

function hasRequiredFilters(filters) {
  return Boolean(
    (filters.applicationCode || "").trim() ||
    (filters.interfaceCodes || []).length > 0 ||
    (filters.fromDateTime || "").trim() ||
    (filters.toDateTime || "").trim() ||
    (filters.searchValue || "").trim(),
  );
}

function validateSearchFilters(filters) {
  const from = (filters.fromDateTime || "").trim();
  const to = (filters.toDateTime || "").trim();

  if (filters.searchBy === "LOGGED_MESSAGE") {
    if (!filters.applicationCode) {
      alert("Application Code is required for Logged Message search.");
      return false;
    }

    if (!from || !to) {
      alert(
        "Both From Date and To Date are required for Logged Message search.",
      );
      return false;
    }
  }

  return isValidDateRange(from, to);
}

function updateSearchableSelect(
  instance,
  items,
  preserveValues = [],
  defaultLabel = "All",
) {
  if (!instance) return;

  const values = Array.isArray(preserveValues)
    ? preserveValues
    : preserveValues
      ? [preserveValues]
      : [];

  instance.clearOptions();
  instance.addOption({ value: "", text: defaultLabel });

  items.forEach((item) => {
    instance.addOption({ value: item, text: item });
  });

  instance.refreshOptions(false);

  const valid = values.filter((v) => items.includes(v));

  if (valid.length > 0) {
    instance.setValue(valid, true);
  } else {
    instance.setValue([], true);
  }
}

async function loadApplications() {
  const currentValue = appSelect?.getValue?.() || "";

  let apps;
  if (cachedApps) {
    apps = cachedApps;
  } else {
    apps = await fetchApplicationCodes();
    cachedApps = apps; 
  }

  const sortedApps = Array.isArray(apps)
    ? [...apps].sort((a, b) => a.localeCompare(b))
    : [];

  updateSearchableSelect(
    appSelect,
    sortedApps,
    currentValue,
    "All Applications",
  );
}

async function loadInterfaces(applicationCode = "", preserveValues = []) {
  const cacheKey = applicationCode || "ALL";

  let interfaces;
  if (cachedInterfaces[cacheKey]) {
    interfaces = cachedInterfaces[cacheKey];
  } else {
    interfaces = await fetchInterfaceCodes(applicationCode);
    cachedInterfaces[cacheKey] = interfaces; // Save to cache
  }

  const sorted = Array.isArray(interfaces)
    ? [...interfaces].sort((a, b) => a.localeCompare(b))
    : [];

  updateSearchableSelect(ifaceSelect, sorted, preserveValues, "All Interfaces");
}

function clearFilters() {
  document.getElementById("filterForm")?.reset();
  appSelect?.setValue("", true);
  ifaceSelect?.setValue([], true);
  setSearchTypeValue("transactionId");

  const recentRange = document.getElementById("recentRange");
  const globalSearch = document.getElementById("globalSearch");
  const searchKeyword = document.getElementById("searchKeyword");

  clearDateTimeField(dateFromPicker, "dateFrom");
  clearDateTimeField(dateToPicker, "dateTo");
  syncMainDateBounds();

  if (recentRange) recentRange.value = "";
  if (globalSearch) globalSearch.value = "";
  if (searchKeyword) searchKeyword.value = "";
}

function applyRecentRange() {
  const recentRange = document.getElementById("recentRange");
  const mins = parseInt(recentRange?.value, 10);
  if (!mins) return;

  const end = new Date();
  const start = new Date(end.getTime() - mins * 60000);

  isApplyingRecentRange = true;
  setDateTimeField(dateFromPicker, "dateFrom", start, false);
  setDateTimeField(dateToPicker, "dateTo", end, false);
  isApplyingRecentRange = false;

  syncMainDateBounds();
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
  select.addEventListener("change", async (e) => {
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

    const response = await fetchLogs(
      appliedFilters,
      currentPage,
      pageSize,
      activeTab,
    );

    if (!response || response.skipped) {
      initLogsTable([], activeTab);
      updateEntriesText(0, 0, 0);
      renderPager(0, 0, () => {});
      updateSummaryUI({
        successCount: 0,
        errorCount: 0,
        uniqueTransactionCount: 0,
      });
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
      updateSummaryUI(
        response?.summary || {
          successCount: 0,
          errorCount: 0,
          uniqueTransactionCount: 0,
        },
      );
    } else {
      tableData = response.content || [];
      totalElements = response.totalElements || 0;
      totalPages = response.totalPages || 0;

      if (isDuration) {
        updateSummaryUI(
          response?.summary || {
            successCount: 0,
            errorCount: 0,
            uniqueTransactionCount: 0,
          },
        );
      } else if (isMinMax) {
        updateSummaryUI({
          successCount: 0,
          errorCount: 0,
          uniqueTransactionCount: 0,
        });
      }
    }

    initLogsTable(tableData, activeTab);

    const showSummary =
      activeTab === "EXPLORER" && appliedFilters.searchBy !== "LOGGED_MESSAGE";

    if (showSummary) {
      setSummaryVisible(true);
      updateSummaryUI(
        response?.summary || {
          successCount: 0,
          errorCount: 0,
          uniqueTransactionCount: 0,
        },
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
      tbody.innerHTML = "";
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 8;
      td.className = "text-center text-danger";
      td.textContent = `Error: ${e.message}`;
      tr.appendChild(td);
      tbody.appendChild(tr);
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
    allowEmptyOption: true,
  });

  ifaceSelect = new TomSelect("#interfaceName", {
    create: false,
    placeholder: "All Interfaces",
    allowEmptyOption: true,
    maxItems: null, // 🔥 allow multiple
    closeAfterSelect: false, // keep dropdown open
    plugins: ["remove_button"], // show X on chips
  });

  searchTypeSelect = new TomSelect("#searchType", {
    create: false,
    allowEmptyOption: false,
    controlInput: null,
  });

  styleSearchTypeSelect(searchTypeSelect);
  window.addEventListener("resize", () =>
    styleSearchTypeSelect(searchTypeSelect),
  );

  initializeDatePickers();

  document.getElementById("recentRange")?.addEventListener("change", applyRecentRange);

  await Promise.all([loadApplications(), loadInterfaces()]);

  initLogsTable([], activeTab);
  ensurePageSizeControl();
  syncTableViewClass(activeTab);
  resetTableState();

  appSelect.on("change", async (value) => {
    const currentInterfaces = ifaceSelect?.getValue?.() || [];
    await loadInterfaces(value, currentInterfaces);
  });

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const filters = getFilterValues();
    // console.log("Submit filters:", filters);

    if (!validateSearchFilters(filters)) {
      return;
    }

    appliedFilters = { ...filters, caseType: "" };
    hasSubmittedFilters = true;
    currentPage = 1;
    try {
      submitBtn.disabled = true;
      await renderCurrentPage();
    } catch (e) {
      console.log(e);
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.getElementById("clearBtn").addEventListener("click", async () => {
    clearFilters();

    // document.getElementById("summaryDisplay").style.display = "none";
    appliedFilters = {
      applicationCode: "",
      interfaceCodes: [],
      fromDateTime: "",
      toDateTime: "",
      searchBy: "",
      searchValue: "",
      caseType: "",
    };
    hasSubmittedFilters = false;

    await loadInterfaces();

    document.getElementById("successCount").textContent = "0";
    document.getElementById("errorCount").textContent = "0";
    document.getElementById("uniqueCount").textContent = "0";

    setSummaryVisible(false);

    resetTableState();
  });


  const successPill = document
    .getElementById("successCount")
    ?.closest(".stat-pill");
  const errorPill = document
    .getElementById("errorCount")
    ?.closest(".stat-pill");

  if (successPill) {
    successPill.style.cursor = "pointer";
    successPill.addEventListener("click", () => triggerCaseFilter("success"));
  }

  if (errorPill) {
    errorPill.style.cursor = "pointer";
    errorPill.addEventListener("click", () => triggerCaseFilter("error"));
  }

  // Listen for clicks on Interface names in the MINMAX table
  document.addEventListener("click", async (e) => {
    const link = e.target.closest(".interface-trend-link");
    if (!link) return;

    activeTrendInterface = link.getAttribute("data-interface");
    document.getElementById("chartInterfaceTitle").textContent =
      activeTrendInterface;

    // Set default dates in modal if empty
    const chartFromValue = getDateTimeFieldValue(chartDateFromPicker, "chartDateFrom");
    const chartToValue = getDateTimeFieldValue(chartDateToPicker, "chartDateTo");

    if (!chartFromValue || !chartToValue) {
      const end = new Date();
      const start = new Date(end.getTime() - 6 * 60 * 60 * 1000);
      setDateTimeField(chartDateFromPicker, "chartDateFrom", start, false);
      setDateTimeField(chartDateToPicker, "chartDateTo", end, false);
      syncChartDateBounds();
    }

    const modal = new bootstrap.Modal(document.getElementById("chartModal"));
    modal.show();

    // Initial Load
    refreshTrendChart();
  });

  // Handle "Update Trend" button
  document
    .getElementById("updateChartBtn")
    .addEventListener("click", refreshTrendChart);

  async function refreshTrendChart() {
    const from = getDateTimeFieldValue(chartDateFromPicker, "chartDateFrom");
    const to = getDateTimeFieldValue(chartDateToPicker, "chartDateTo");

    if (!isValidDateRange(from, to)) {
      return; // Stop execution if dates are invalid
    }
    const interval = document.getElementById("chartInterval").value;

    const messageEl = document.getElementById("chartStateMessage");
    const titleEl = document.getElementById("chartStateTitle");
    const subEl = document.getElementById("chartStateSub");
    const canvas = document.getElementById("interfaceChart");

    if (!messageEl || !canvas) return;

    const showState = (title, subText = "", iconClass = "") => {
      if (titleEl) titleEl.textContent = title;
      if (subEl) subEl.textContent = subText;

      messageEl.style.display = "flex";

      const iconEl = messageEl.querySelector("i");
      if (iconEl && iconClass) {
        iconEl.className = iconClass;
      }

      canvas.style.display = "none";
    };

    showState("Loading chart...", "");

    let bucket;
    if (interval === "10min") bucket = "10mins";
    else if (interval === "1hr") bucket = "1hr";
    else if (interval === "2hr") bucket = "2hr";

    try {
      const data = await fetchChartData(activeTrendInterface, from, to, bucket);

      if (!data || data.length === 0) {
        if (trendChart) {
          trendChart.destroy();
          trendChart = null;
        }

        showState(
          "No data available",
          "Try adjusting the time range",
          "bi bi-graph-down fs-1",
        );
        return;
      }

      messageEl.style.display = "none";
      canvas.style.display = "block";

      renderTrendChart(data, activeTrendInterface);
    } catch (e) {
      console.error(e);

      if (trendChart) {
        trendChart.destroy();
        trendChart = null;
      }

      showState(
        "Failed to load chart",
        "Please try again",
        "bi bi-exclamation-triangle fs-1",
      );
    }
  }

  function renderTrendChart(data, activeTrendInterface) {
    const ctx = document.getElementById("interfaceChart").getContext("2d");

    if (trendChart) {
      trendChart.destroy();
    }

    // Map the new API fields →
    const labels = data?.buckets?.map(
      (d) => `${d.bucketStart} → ${d.bucketEnd}`,
    );
    const avgData = data?.buckets?.map((d) => d.avgDurationMillis);
    const globalMode = data?.modeDurationMillis || 0;
    const modeData = new Array(labels.length).fill(globalMode);
    const intervalData = data?.buckets?.map((d) => d.modeDurationMillis);

    trendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: activeTrendInterface,
            data: avgData,
            borderColor: "#4f7cff",
            backgroundColor: "rgba(79, 124, 255, 0.1)",
            borderWidth: 2,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#4f7cff",
            pointBorderColor: "#4f7cff",
            pointBorderWidth: 1,
          },
          {
            label: `Mode (${globalMode} ms)`,
            data: modeData,
            borderColor: "#2ecc71", // Green for Mode
            borderWidth: 2,
            // borderDash: [10, 5], // Makes the straight line dashed
            fill: false,
            pointRadius: 0, // Hide points for the mode line
            pointHitRadius: 0, // Disable hover for the mode line
            stepped: false,
          },
          {
            label: `Interval Mode ms`,
            data: intervalData,
            borderColor: "#cc8d2e", // Orange for Mode
            borderWidth: 2,
            // borderDash: [10, 5], // Makes the straight line dashed
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#cc8d2e",
            pointBorderColor: "#cc8d2e",
            pointBorderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            mode: "index",
            // intersect: false,
            callbacks: {
              // This adds the Transaction Count to the hover tooltip
              afterBody: function (context) {
                const index = context[0].dataIndex;
                const txCount = data?.buckets[index]?.transactionCount;
                return `Transactions: ${txCount}`;
              },
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  label += context.parsed.y + " ms";
                }
                return label;
              },
            },
          },
          legend: { position: "top" },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Avg Duration (ms)" },
          },
          x: {
            ticks: {
              autoSkip: true,
              maxRotation: 45,
              minRotation: 45,
              callback: function (value, index) {
                const label = this.getLabelForValue(value);
                // Formats "2026-03-03T13:40:00" to "03-03 13:40"
                return label ? label.slice(5, 16).replace("T", " ") : label;
              },
            },
            title: { display: true, text: "Time" },
          },
        },
      },
    });
  }

  const exportBtn = document.getElementById("exportExcelBtn");

  exportBtn.addEventListener("click", async () => {
    // We use the currently applied filters
    await exportToExcel(appliedFilters);
  });
});

async function triggerCaseFilter(type) {
  const currentFilters = getFilterValues();

  appliedFilters = {
    ...currentFilters,
    caseType: type,
  };

  currentPage = 1;
  await renderCurrentPage();
}
