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
    (filters.toDateTime || "").trim()
  );
}

function buildLogsUrl(filters = {}, page = 1, size = 10) {
  const params = new URLSearchParams();

  if (filters.applicationCode) {
    params.set("applicationCode", filters.applicationCode.trim());
  }
  if (filters.interfaceCode) {
    params.set("interfaceCode", filters.interfaceCode.trim());
  }
  if (filters.fromDateTime) {
    params.set("fromDateTime", filters.fromDateTime);
  }
  if (filters.toDateTime) {
    params.set("toDateTime", filters.toDateTime);
  }

  params.set("page", page);
  params.set("size", size);

  return `${API_BASE_URL}?${params.toString()}`;
}

async function fetchLogs(filters = {}, page = 1, size = 10) {
  if (!hasAppliedFilters(filters)) {
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size,
      skipped: true
    };
  }

  const url = buildLogsUrl(filters, page, size);
  console.log("Logs API URL:", url);

  try {
    const response = await fetch(url);
    const rawText = await response.text();
    console.log("Logs API status:", response.status);
    // console.log("Logs API raw response:", rawText);

    if (!response.ok) {
      throw new Error(`Failed to fetch logs (${response.status})`);
    }

    let parsed;
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
    } catch (parseError) {
      console.error("Failed to parse logs response JSON:", parseError);
      parsed = {};
    }

    return parsed;
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