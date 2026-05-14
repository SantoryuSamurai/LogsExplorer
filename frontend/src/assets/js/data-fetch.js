const API_BASE_URL = "http://localhost:8080/api/logs";

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
    (filters.searchValue || "").trim(),
  );
}

function normalizeDateTime(value) {
  if (!value) return "";

  const parsed =
    typeof window !== "undefined" && window.parseDateTimeValue
      ? window.parseDateTimeValue(value)
      : parseDateTimeValue(value);

  if (parsed) return formatApiDateTime(parsed);

  const raw = String(value).trim();
  if (!raw) return "";

  return raw.length === 16 ? `${raw}:00` : raw;
}

function buildLogsUrl(filters = {}, page = 1, size = 10, mode = "EXPLORER") {
  let endpoint = "";

  if (mode === "DURATION") {
    endpoint = "/durations";
  } else if (mode === "MINMAX") {
    endpoint = "/interface-stats";
  }

  const params = new URLSearchParams();

  if (filters.applicationCode) {
    params.set("applicationCode", filters.applicationCode.trim());
  }

  if (Array.isArray(filters.interfaceCodes) && filters.interfaceCodes.length) {
    filters.interfaceCodes.forEach((code) => {
      if (code) {
        params.append("interfaceCodes", code.trim());
      }
    });
  }

  if (filters.fromDateTime) {
    params.set("fromDateTime", normalizeDateTime(filters.fromDateTime));
  }

  if (filters.toDateTime) {
    params.set("toDateTime", normalizeDateTime(filters.toDateTime));
  }

  // if (filters.caseType) {
  //   params.set("caseType", filters.caseType); // 'success' or 'error'
  // }
  if (mode === "EXPLORER") {
    if (filters.searchBy && filters.searchValue) {
      params.set("searchBy", filters.searchBy);
      params.set("searchValue", filters.searchValue);
    }

    if (filters.caseType) {
      params.set("caseType", filters.caseType);
    }
  }

  params.set("page", page);
  params.set("size", size);

  return `${API_BASE_URL}${endpoint}?${params.toString()}`;
}

async function fetchLogs(filters = {}, page = 1, size = 10, mode = "EXPLORER") {
  const url = buildLogsUrl(filters, page, size, mode);
  // console.log("Logs API URL:", url);

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
      skipped: false,
    };
  }
}

async function fetchChartData(interfaceCode, from, to, bucket) {
  if (!interfaceCode || !from || !to) return [];

  const params = new URLSearchParams();

  params.append("interfaceCodes", interfaceCode); // ✅ FIX

  params.append("fromDateTime", normalizeDateTime(from));
  params.append("toDateTime", normalizeDateTime(to));
  params.append("bucket", bucket);

  const url = `${API_BASE_URL}/interface-duration-buckets?${params.toString()}`;
  // console.log("Chart API URL:", url);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch chart data");

    const result = await response.json();

    return result;
    // Transform backend → chart format
    // return result.map((item) => ({
    //   time: `${item.bucketStart.replace("T", " ")} → ${item.bucketEnd.replace("T", " ")}`,
    //   avgDuration: item.avgDurationMillis,
    // }));
  } catch (e) {
    console.error("Chart fetch error:", e);
    return [];
  }
}

// Add this function to data-fetch.js
async function exportToExcel(filters = {}) {
  // Date validation: Compulsory
  if (!filters.fromDateTime || !filters.toDateTime) {
    alert("Date range (From and To) is compulsory for export.");
    return;
  }

  const params = new URLSearchParams();

  // Compulsory dates
  params.append("fromDateTime", normalizeDateTime(filters.fromDateTime));
  params.append("toDateTime", normalizeDateTime(filters.toDateTime));

  // Optional filters
  if (filters.applicationCode) {
    params.set("applicationCode", filters.applicationCode);
  }

  if (filters.interfaceCodes && filters.interfaceCodes.length > 0) {
    params.set("interfaceCodes", filters.interfaceCodes.join(","));
  }

  // Future-proofing: transactionId (searchBy/searchValue)
  if (filters.searchBy === "transactionId" && filters.searchValue) {
    params.set("transactionId", filters.searchValue);
  }

  const url = `${API_BASE_URL}/export?${params.toString()}`;

  // Trigger download
  window.location.href = url;
}

// Add this to data-fetch.js
async function fetchSummary(filters = {}) {
  try {
    const params = new URLSearchParams();

    if (filters.applicationCode)
      params.set("applicationCode", filters.applicationCode);
    if (filters.interfaceCodes && filters.interfaceCodes.length > 0) {
      params.set("interfaceCodes", filters.interfaceCodes.join(","));
    }
    if (filters.fromDateTime)
      params.set("fromDateTime", normalizeDateTime(filters.fromDateTime));
    if (filters.toDateTime)
      params.set("toDateTime", normalizeDateTime(filters.toDateTime));

    if (filters.searchValue) {
      params.set("searchBy", filters.searchBy);
      params.set("searchValue", filters.searchValue);
      if (filters.caseType) params.set("caseType", filters.caseType);
    }

    const response = await fetch(
      `${API_BASE_URL}/summary?${params.toString()}`,
    );
    if (!response.ok) throw new Error("Failed to fetch summary");

    return await response.json();
  } catch (error) {
    console.error("Error fetching summary:", error);
    return { successCount: 0, errorCount: 0, uniqueTransactionCount: 0 };
  }
}
