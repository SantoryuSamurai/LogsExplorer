// assets/js/api.js

const mockLogs = [
  {
    sequenceId: "#1101",
    interfaceCode: "DepositRetrieval",
    applicationCode: "BankingApp",
    transactionId: "TXN900001",
    loggingStage: { type: "success", text: "TRANSACTION_COMPLETED" },
    targetService: "ACCOUNT_SERVICE",
    logTime: "05/04/2026 10:12:11",
    createdBy: "admin",
    modifiedDate: "05/04/2026 10:15:01"
  },
  {
    sequenceId: "#1102",
    interfaceCode: "TransactionFetch",
    applicationCode: "CustomerPortal",
    transactionId: "TXN900002",
    loggingStage: { type: "success", text: "REQUEST_SERVED" },
    targetService: "TRANSACTION_SERVICE",
    logTime: "05/04/2026 11:05:44",
    createdBy: "system",
    modifiedDate: "05/04/2026 11:06:10"
  },
  {
    sequenceId: "#1103",
    interfaceCode: "AccountInquiry",
    applicationCode: "PaymentsHub",
    transactionId: "TXN900003",
    loggingStage: { type: "danger", text: "FAILED" },
    targetService: "INQUIRY_SERVICE",
    logTime: "05/04/2026 11:45:20",
    createdBy: "operator",
    modifiedDate: "05/04/2026 11:46:02"
  },
  {
    sequenceId: "#1104",
    interfaceCode: "DepositRetrieval",
    applicationCode: "DepositBank",
    transactionId: "TXN900004",
    loggingStage: { type: "warning", text: "Timeout from upstream service" },
    targetService: "ACCOUNT_SERVICE",
    logTime: "04/04/2026 15:22:11",
    createdBy: "admin",
    modifiedDate: "04/04/2026 15:25:30"
  },
  {
    sequenceId: "#1105",
    interfaceCode: "TransactionFetch",
    applicationCode: "CustomerPortal",
    transactionId: "TXN900005",
    loggingStage: { type: "success", text: "REQUEST_SERVED" },
    targetService: "TRANSACTION_SERVICE",
    logTime: "04/04/2026 16:40:55",
    createdBy: "system",
    modifiedDate: "04/04/2026 16:42:10"
  },
  {
    sequenceId: "#1106",
    interfaceCode: "AccountInquiry",
    applicationCode: "PaymentsHub",
    transactionId: "TXN900006",
    loggingStage: { type: "warning", text: "Partial data received" },
    targetService: "INQUIRY_SERVICE",
    logTime: "03/04/2026 09:10:21",
    createdBy: "operator",
    modifiedDate: "03/04/2026 09:12:45"
  },
  {
    sequenceId: "#1107",
    interfaceCode: "DepositRetrieval",
    applicationCode: "BankingApp",
    transactionId: "TXN900007",
    loggingStage: { type: "success", text: "TRANSACTION_COMPLETED" },
    targetService: "ACCOUNT_SERVICE",
    logTime: "03/04/2026 12:05:33",
    createdBy: "admin",
    modifiedDate: "03/04/2026 12:07:02"
  },
  {
    sequenceId: "#1108",
    interfaceCode: "TransactionFetch",
    applicationCode: "CustomerPortal",
    transactionId: "TXN900008",
    loggingStage: { type: "danger", text: "FAILED" },
    targetService: "TRANSACTION_SERVICE",
    logTime: "02/04/2026 18:20:18",
    createdBy: "system",
    modifiedDate: "02/04/2026 18:21:10"
  },
  {
    sequenceId: "#1109",
    interfaceCode: "AccountInquiry",
    applicationCode: "PaymentsHub",
    transactionId: "TXN900009",
    loggingStage: { type: "success", text: "REQUEST_SERVED" },
    targetService: "BankingApp",
    logTime: "02/04/2026 14:55:02",
    createdBy: "operator",
    modifiedDate: "02/04/2026 14:56:33"
  },
  {
    sequenceId: "#1110",
    interfaceCode: "DepositRetrieval",
    applicationCode: "DepositBank",
    transactionId: "TXN900010",
    loggingStage: { type: "warning", text: "Retry initiated" },
    targetService: "BankingApp",
    logTime: "01/04/2026 10:45:45",
    createdBy: "admin",
    modifiedDate: "01/04/2026 10:47:12"
  },
  {
    sequenceId: "#1111",
    interfaceCode: "TransactionFetch",
    applicationCode: "CustomerPortal",
    transactionId: "TXN900011",
    loggingStage: { type: "success", text: "REQUEST_SERVED" },
    targetService: "TRANSACTION_SERVICE",
    logTime: "01/04/2026 13:30:25",
    createdBy: "system",
    modifiedDate: "01/04/2026 13:32:01"
  },
  {
    sequenceId: "#1112",
    interfaceCode: "AccountInquiry",
    applicationCode: "PaymentsHub",
    transactionId: "TXN900012",
    loggingStage: { type: "danger", text: "FAILED" },
    targetService: "INQUIRY_SERVICE",
    logTime: "31/03/2026 17:05:59",
    createdBy: "operator",
    modifiedDate: "31/03/2026 17:06:40"
  },
  {
    sequenceId: "#1113",
    interfaceCode: "DepositRetrieval",
    applicationCode: "BankingApp",
    transactionId: "TXN900013",
    loggingStage: { type: "success", text: "TRANSACTION_COMPLETED" },
    targetService: "ACCOUNT_SERVICE",
    logTime: "30/03/2026 09:22:11",
    createdBy: "admin",
    modifiedDate: "30/03/2026 09:24:01"
  },
  {
    sequenceId: "#1114",
    interfaceCode: "TransactionFetch",
    applicationCode: "CustomerPortal",
    transactionId: "TXN900014",
    loggingStage: { type: "warning", text: "Slow response" },
    targetService: "TRANSACTION_SERVICE",
    logTime: "30/03/2026 11:50:45",
    createdBy: "system",
    modifiedDate: "30/03/2026 11:52:30"
  }
];

function getApplications() {
  return ["BankingApp", "DepositBank", "PaymentsHub", "CustomerPortal"];
}

function getInterfaces(applicationName = "") {
  const map = {
    BankingApp: ["DepositRetrieval", "TransactionFetch"],
    DepositBank: ["DepositRetrieval"],
    PaymentsHub: ["AccountInquiry"],
    CustomerPortal: ["TransactionFetch"]
  };

  return applicationName
    ? (map[applicationName] || [])
    : ["DepositRetrieval", "TransactionFetch", "AccountInquiry"];
}

function parseLogTime(logTime) {
  const [datePart, timePart] = String(logTime).split(" ");
  if (!datePart || !timePart) return null;

  const [day, month, year] = datePart.split("/").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);

  if (
    [day, month, year, hour, minute, second].some(value => Number.isNaN(value))
  ) {
    return null;
  }

  return new Date(year, month - 1, day, hour, minute, second);
}

function parseFilterDate(value, boundary = "start") {
  if (!value) return null;

  const raw = String(value).trim();
  const [datePart, timePart] = raw.split("T");
  if (!datePart) return null;

  const [year, month, day] = datePart.split("-").map(Number);
  if ([year, month, day].some(Number.isNaN)) return null;

  if (!timePart) {
    if (boundary === "end") {
      return new Date(year, month - 1, day, 23, 59, 59, 999);
    }
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  const timeParts = timePart.split(":").map(Number);
  const hour = timeParts[0];
  const minute = timeParts[1] ?? 0;
  const second = timeParts[2] ?? (boundary === "end" ? 59 : 0);
  const ms = boundary === "end" ? 999 : 0;

  if ([hour, minute, second].some(Number.isNaN)) return null;

  return new Date(year, month - 1, day, hour, minute, second, ms);
}

function getFilteredLogs(filters = {}) {
  const app = (filters.applicationName || "").trim();
  const iface = (filters.interfaceName || "").trim();
  const search = (filters.search || "").trim().toLowerCase();

  let fromDate = parseFilterDate(filters.dateFrom, "start");
  let toDate = parseFilterDate(filters.dateTo, "end");

  if (fromDate && toDate && fromDate > toDate) {
    [fromDate, toDate] = [toDate, fromDate];
  }

  return mockLogs.filter(row => {
    const matchesApp = !app || row.applicationCode === app;
    const matchesIface = !iface || row.interfaceCode === iface;

    const searchableText = [
      row.sequenceId,
      row.interfaceCode,
      row.applicationCode,
      row.transactionId,
      row.targetService,
      row.logTime,
      row.createdBy,
      row.modifiedDate,
      row.loggingStage?.type,
      row.loggingStage?.text
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !search || searchableText.includes(search);

    const rowDate = parseLogTime(row.logTime);
    const matchesFromDate = !fromDate || (rowDate && rowDate >= fromDate);
    const matchesToDate = !toDate || (rowDate && rowDate <= toDate);

    return matchesApp && matchesIface && matchesSearch && matchesFromDate && matchesToDate;
  });
}