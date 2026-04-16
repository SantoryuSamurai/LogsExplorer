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

let activeTab = "EXPLORER"; // Global state

// Tab Switch Listener
// document.querySelectorAll('#logTabs button').forEach(button => {
//   button.addEventListener('shown.bs.tab', async (e) => {
//     activeTab = e.target.getAttribute('data-type');
//     currentPage = 1;
//     await renderCurrentPage();
//   });
// });

document.querySelectorAll('#logTabs button').forEach((button) => {
  button.addEventListener('shown.bs.tab',async (e) => {
    // 1. Update global state
    activeTab = e.target.getAttribute('data-type');
    
    // 2. Reset pagination to page 1
    currentPage = 1;
    
    // 3. Clear the table and reset pager so it doesn't show old data from previous tab
    // This provides a clean slate until "Submit" is clicked
    initLogsTable([], activeTab); 
    updateEntriesText(0, 0, 0);
    renderPager(1, 0, goToPage);
    updateSummaryUI( { successCount: 0, errorCount: 0, uniqueTransactionCount: 0 });
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
    
    // 4. (Optional) Reset the hasSubmittedFilters flag if you want 
    // to force a fresh click for every tab switch
    // hasSubmittedFilters = false; 
    
    console.log(`Tab switched to: ${activeTab}. Waiting for Submit click...`);
  });
});

function toggleTableLoader(show) {
  const loader = document.getElementById("tableLoader");
  if (loader) {
    // We use 'flex' instead of 'block' to keep the loader icon centered
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
    wrapper.style.maxWidth = "180px";
    wrapper.style.flex = "0 0 140px";
  }

  const control = wrapper?.querySelector?.(".ts-control");
  if (control) {
    control.style.borderTopRightRadius = "0";
    control.style.borderBottomRightRadius = "0";
    control.style.width = "100%";
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
  refreshTable([]);
  updateEntriesText(0, 0, 0);
  renderPager(1, 0, goToPage);
}

function normalizeDateTime(value) {
  if (!value) return "";
  return value.length === 16 ? `${value}:00` : value;
}

/**
 * Updates the Success/Error counts next to the Submit button
 */
function updateSummaryUI(summary) {
  const successEl = document.getElementById("successCount");
  const errorEl = document.getElementById("errorCount");
  const uniqueEl = document.getElementById("uniqueCount");
  console.log(summary);
  if (successEl && errorEl && uniqueEl) {
    successEl.textContent = summary?.successCount ?? 0;
    errorEl.textContent = summary?.errorCount ?? 0;
    uniqueEl.textContent = summary?.uniqueTransactionCount ?? 0;
  }
}

// async function renderCurrentPage() {
//   toggleTableLoader(true);
//   try{
//     const response = await fetchLogs(appliedFilters, currentPage, pageSize, activeTab);
    
//     // Duration API returns content directly at root, Explorer uses response.page.content
//     const data = activeTab === "EXPLORER" ? response.page.content : response.content;
//     const totalElements = activeTab === "EXPLORER" ? response.page.totalElements : response.totalElements;

//     initLogsTable(data, activeTab);
    
//     // Update summary only for Explorer
//     if (activeTab === "EXPLORER") {
//        updateSummaryUI(response.summary);
//     }
    
//     if (response.skipped) {
//       refreshTable([]);
//       updateEntriesText(0, 0, 0);
//       renderPager(0, 0, () => {});
//       return;
//     }
    
//     // Use the nested 'page' property from your new response structure
//     const logsPage = response.page || { content: [], totalElements: 0, totalPages: 0 };
//     const summary = response.summary || { successCount: 0, errorCount: 0 ,uniqueCount:0};
    
//     updateSummaryUI(summary);
//     refreshTable(logsPage.content);
    
//     const start = (currentPage - 1) * pageSize + 1;
//     const end = Math.min(currentPage * pageSize, logsPage.totalElements);
//     updateEntriesText(start, end, logsPage.totalElements);
    
//     renderPager(currentPage, logsPage.totalPages, async page => {
//       currentPage = page;
//       await renderCurrentPage();
//     });
//   }catch(e){
//     alert(e);
//     console.error(e);
//   }finally{
//     toggleTableLoader(false);
//   }
// }

// async function renderCurrentPage() {
//   toggleTableLoader(true);
  
//   try {
//     const response = await fetchLogs(appliedFilters, currentPage, pageSize, activeTab);

//     // 1. Handle "Skipped" or empty states early
//     if (response.skipped || (!response.page && !response.content)) {
//       initLogsTable([], activeTab); // Initialize empty table
//       updateEntriesText(0, 0, 0);
//       renderPager(0, 0, () => {});
//       if (activeTab === "EXPLORER") updateSummaryUI({ successCount: 0, errorCount: 0, uniqueCount: 0 });
//       return;
//     }

//     // 2. Extract Data based on Active Tab
//     // Explorer uses response.page structure; Duration uses root content structure
//     const isExplorer = activeTab === "EXPLORER";
//     const data = isExplorer ? response.page.content : response.content;
//     const totalElements = isExplorer ? response.page.totalElements : response.totalElements;
//     const totalPages = isExplorer ? response.page.totalPages : response.totalPages;

//     // 3. Initialize DataTables with specific mode
//     initLogsTable(data, activeTab);

//     // 4. Update UI Components
//     if (isExplorer) {
//       const summary = response.summary || { successCount: 0, errorCount: 0, uniqueCount: 0 };
//       updateSummaryUI(summary);
//     }

//     // 5. Update Pagination text (Common for both)
//     const start = totalElements === 0 ? 0 : (currentPage - 1) * pageSize + 1;
//     const end = Math.min(currentPage * pageSize, totalElements);
//     updateEntriesText(start, end, totalElements);

//     // 6. Render Pager (Common for both)
//     renderPager(currentPage, totalPages, async (page) => {
//       currentPage = page;
//       await renderCurrentPage();
//     });

//   } catch (e) {
//     console.error("Render Error:", e);
//     // Optional: show a user-friendly message in the table instead of an alert
//     document.querySelector("#tableBody").innerHTML = `<tr><td colspan="10" class="text-center text-danger">Failed to load data.</td></tr>`;
//   } finally {
//     toggleTableLoader(false);
//   }
// }

// async function renderCurrentPage() {
//   toggleTableLoader(true);
  
//   try {
//     const response = await fetchLogs(appliedFilters, currentPage, pageSize, activeTab);

//     // 1. Handle "Skipped" or empty states
//     // Adding fallbacks to ensure response objects exist
//     if (response.skipped || (!response.page && !response.content && !Array.isArray(response))) {
//       initLogsTable([], activeTab);
//       updateEntriesText(0, 0, 0);
//       renderPager(0, 0, () => {});
//       return;
//     }

//     const isExplorer = activeTab === "EXPLORER";
    
//     // FIX: Add || [] to prevent .map() errors if the API returns null or unexpected structure
//     const data = isExplorer ? (response.page?.content || []) : (response.content || response || []);
//     const totalElements = isExplorer ? (response.page?.totalElements || 0) : (response.totalElements || 0);
//     const totalPages = isExplorer ? (response.page?.totalPages || 0) : (response.totalPages || 0);

//     // 3. Initialize Table
//     initLogsTable(data, activeTab);

//     // 4. Update Summary
//     if (isExplorer) {
//       updateSummaryUI(response.summary || { successCount: 0, errorCount: 0, uniqueTransactionCount: 0 });
//     }

//     // 5. Update Pagination
//     const start = totalElements === 0 ? 0 : (currentPage - 1) * pageSize + 1;
//     const end = Math.min(currentPage * pageSize, totalElements);
//     updateEntriesText(start, end, totalElements);

//     renderPager(currentPage, totalPages, async (page) => {
//       currentPage = page;
//       await renderCurrentPage();
//     });

//   } catch (e) {
//     console.error("Render Error:", e);
//     // FIX: Updated selector to match the ID we added in Step 1
//     const tbody = document.getElementById("logsTableBody");
//     if (tbody) {
//       tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Failed to load data: ${e.message}</td></tr>`;
//     }
//   } finally {
//     toggleTableLoader(false);
//   }
// }

// async function renderCurrentPage() {
//   toggleTableLoader(true);
  
//   try {
//     // 1. Fetch data passing the current activeTab mode
//     const response = await fetchLogs(appliedFilters, currentPage, pageSize, activeTab);

//     // 2. Handle empty/skipped state
//     if (!response || response.skipped) {
//       initLogsTable([], activeTab);
//       updateEntriesText(0, 0, 0);
//       renderPager(0, 0, () => {});
//       return;
//     }

//     const isExplorer = (activeTab === "EXPLORER");
//     let tableData = [];
//     let totalElements = 0;
//     let totalPages = 0;

//     // 3. Extract data based on response structure
//     if (isExplorer) {
//       // Explorer structure: response.page.content
//       const pageObj = response.page || {};
//       tableData = pageObj.content || [];
//       totalElements = pageObj.totalElements || 0;
//       totalPages = pageObj.totalPages || 0;
      
//       // Update counts for Explorer only
//       updateSummaryUI(response.summary || { successCount: 0, errorCount: 0, uniqueTransactionCount: 0 });
//     } else {
//       // Duration structure: response.content (from your JSON snippet)
//       tableData = response.content || [];
//       totalElements = response.totalElements || 0;
//       totalPages = response.totalPages || 0;
//     }

//     // 4. Render Table
//     initLogsTable(tableData, activeTab);

//     // 5. Update Pagination
//     const start = totalElements === 0 ? 0 : (currentPage - 1) * pageSize + 1;
//     const end = Math.min(currentPage * pageSize, totalElements);
//     updateEntriesText(start, end, totalElements);

//     renderPager(currentPage, totalPages, async (page) => {
//       currentPage = page;
//       await renderCurrentPage();
//     });

//   } catch (e) {
//     console.error("Render Error:", e);
//     const tbody = document.querySelector("#logsTable tbody");
//     if (tbody) {
//       tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger p-4">
//         <i class="bi bi-exclamation-triangle"></i> Failed to load data: ${e.message}
//       </td></tr>`;
//     }
//   } finally {
//     toggleTableLoader(false);
//   }
// }

async function renderCurrentPage() {
  toggleTableLoader(true);
  
  try {
    // Pass activeTab to fetchLogs
    const response = await fetchLogs(appliedFilters, currentPage, pageSize, activeTab);

    if (!response || response.skipped) {
      initLogsTable([], activeTab);
      updateEntriesText(0, 0, 0);
      renderPager(0, 0, () => {});
      return;
    }

    const isExplorer = (activeTab === "EXPLORER");
    let tableData = [];
    let totalElements = 0;
    let totalPages = 0;

    if (isExplorer) {
      // Structure: response.page.content
      const pageObj = response.page || {};
      tableData = pageObj.content || [];
      totalElements = pageObj.totalElements || 0;
      totalPages = pageObj.totalPages || 0;
      updateSummaryUI(response?.summary || { successCount: 0, errorCount: 0, uniqueTransactionCount: 0 });
    } else {
      // Duration structure based on your JSON: root content
      tableData = response.content || [];
      totalElements = response.totalElements || 0;
      totalPages = response.totalPages || 0;
      updateSummaryUI(response?.summary || { successCount: 0, errorCount: 0, uniqueTransactionCount: 0 });
    }

    // Initialize the DataTable
    initLogsTable(tableData, activeTab);

    // Update Pagination UI
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

  initLogsTable([]);
  ensurePageSizeControl();
  resetTableState();

  appSelect.on("change", async value => {
    const currentInterface = ifaceSelect?.getValue?.() || "";
    await loadInterfaces(value, currentInterface);
  });

  document.getElementById("submitBtn").addEventListener("click", async e => {
    e.preventDefault();

    const filters = getFilterValues();
    console.log("Submit filters:", filters);

    // if (!hasRequiredFilters(filters)) {
    //   alert("Please select a filter before trying.");
    //   hasSubmittedFilters = false;
    //   appliedFilters = {
    //     applicationCode: "",
    //     interfaceCode: "",
    //     fromDateTime: "",
    //     toDateTime: "",
    //     searchBy: "",
    //     searchValue: ""
    //   };
    //   resetTableState();
    //   return;
    // }

    if (!validateSearchFilters(filters)) {
      return;
    }

    appliedFilters = { ...filters,caseType: "" };
    hasSubmittedFilters = true;
    currentPage = 1;
    await renderCurrentPage();
  });

  document.getElementById("clearBtn").addEventListener("click", async () => {
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
    document.getElementById("successCount").textContent = "0";
  document.getElementById("errorCount").textContent = "0";
  document.getElementById("uniqueCount").textContent = "0";
  
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
  const successPill = document.getElementById("successCount")?.closest('.stat-pill');
  const errorPill = document.getElementById("errorCount")?.closest('.stat-pill');

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
  
  // Update state with the specific caseType
  appliedFilters = { 
    ...currentFilters, 
    caseType: type 
  };
  
  currentPage = 1;
  await renderCurrentPage();
}