const API_BASE_URL = "http://localhost:8080/api/logs";

async function fetchApplicationCodes() {
  try {
    const response = await fetch(`${API_BASE_URL}/application-codes`);
    if (!response.ok) throw new Error("Failed to fetch applications");
    return await response.json();
  } catch (error) {
    console.error("Error fetching application codes:", error);
    return [];
  }
}

async function fetchInterfaceCodes(appCode = "") {
  try {
    const url = appCode
      ? `${API_BASE_URL}/interface-codes?applicationCode=${encodeURIComponent(appCode)}`
      : `${API_BASE_URL}/interface-codes/all`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch interfaces");
    return await response.json();
  } catch (error) {
    console.error("Error fetching interface codes:", error);
    return [];
  }
}

function hasAppliedFilters(filters = {}) {
  return Boolean(
    (filters.applicationCode || "").trim() ||
    (filters.interfaceCode || "").trim() ||
    (filters.fromDateTime || "").trim() ||
    (filters.toDateTime || "").trim() ||
    (filters.searchValue || "").trim()
  );
}

function normalizeDateTime(value) {
  if (!value) return "";
  // convert: 2026-04-14T10:30 → 2026-04-14T10:30:00
  return value.length === 16 ? `${value}:00` : value;
}

function buildLogsUrl(filters = {}, page = 1, size = 10,mode="EXPLORER") {
  const params = new URLSearchParams();
const endpoint = (mode === "DURATION") ? "/durations" : "";
  if (filters.applicationCode) {
    params.set("applicationCode", filters.applicationCode.trim());
  }

  if (filters.interfaceCode) {
    params.set("interfaceCode", filters.interfaceCode.trim());
  }

  if (filters.fromDateTime) {
    params.set("fromDateTime", normalizeDateTime(filters.fromDateTime));
  }

  if (filters.toDateTime) {
    params.set("toDateTime", normalizeDateTime(filters.toDateTime));
  }

  if (filters.caseType) {
    params.set("caseType", filters.caseType); // 'success' or 'error'
  }
if (mode === "EXPLORER") {
      if (filters.searchBy && filters.searchValue) {
          params.set("searchBy", filters.searchBy);
          params.set("searchValue", filters.searchValue);
      }
      if (filters.caseType) params.set("caseType", filters.caseType);
  }

  params.set("page", page);
  params.set("size", size);

  return `${API_BASE_URL}${endpoint}?${params.toString()}`;
}

async function fetchLogs(filters = {}, page = 1, size = 10,mode="EXPLORER") {
  // if (!hasAppliedFilters(filters)) {
  //   return {
  //     content: [],
  //     totalElements: 0,
  //     totalPages: 0,
  //     number: 0,
  //     size,
  //     skipped: true
  //   };
  // }

  const url = buildLogsUrl(filters, page, size,mode);
  console.log("Logs API URL:", url);

  try {
    const response = await fetch(url);
    const rawText = await response.text();

    if (!response.ok) {
      throw new Error(`Failed to fetch logs (${response.status})`);
    }

    return rawText ? JSON.parse(rawText) : {};
  } catch (error) {
    console.error("Error fetching logs:", error);
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: Math.max(page - 1, 0),
      size,
      skipped: false
    };
  }
}