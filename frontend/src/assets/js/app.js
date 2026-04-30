let appliedFilters = {
  applicationCode: "",
  interfaceCodes: [],
  fromDateTime: "",
  toDateTime: "",
  searchBy: "",
  searchValue: "",
  caseType: "",
};

let trendChart = null;
let activeTrendInterface = "";

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
    fromDateTime: document.getElementById("dateFrom")?.value || "",
    toDateTime: document.getElementById("dateTo")?.value || "",
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
  if (filters.searchBy === "LOGGED_MESSAGE") {
    if (!filters.applicationCode) {
      alert("Application Code is required for Logged Message search.");
      return false;
    }

    if (!filters.fromDateTime || !filters.toDateTime) {
      alert(
        "Both From Date and To Date are required for Logged Message search.",
      );
      return false;
    }
  }

  return true;
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
  const apps = await fetchApplicationCodes();
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
  const interfaces = await fetchInterfaceCodes(applicationCode);

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
  const pad = (n) => String(n).padStart(2, "0");
  const format = (d) =>
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

  await Promise.all([loadApplications(), loadInterfaces()]);

  initLogsTable([], activeTab);
  ensurePageSizeControl();
  syncTableViewClass(activeTab);
  resetTableState();

  appSelect.on("change", async (value) => {
    const currentInterfaces = ifaceSelect?.getValue?.() || [];
    await loadInterfaces(value, currentInterfaces);
  });

  document.getElementById("submitBtn").addEventListener("click", async (e) => {
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

  document.getElementById("recentRange").addEventListener("change", () => {
    applyRecentRange();
  });

  document.getElementById("dateFrom").addEventListener("change", () => {
    document.getElementById("recentRange").value = "";
  });

  document.getElementById("dateTo").addEventListener("change", () => {
    document.getElementById("recentRange").value = "";
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
    if (!document.getElementById("chartDateFrom").value) {
      const d = new Date();
      d.setHours(d.getHours() - 6);
      document.getElementById("chartDateFrom").value = d
        .toISOString()
        .slice(0, 16);
      document.getElementById("chartDateTo").value = new Date()
        .toISOString()
        .slice(0, 16);
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
    const from = document.getElementById("chartDateFrom").value;
    const to = document.getElementById("chartDateTo").value;
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
