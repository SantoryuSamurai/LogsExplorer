let logsTable = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatLoggingStage(stage) {
  if (stage === null || stage === undefined) return "-";
  if (typeof stage === "object") {
    return escapeHtml(stage.text ?? JSON.stringify(stage));
  }
  return escapeHtml(stage);
}

function clickableTruncate(text) {
  if (!text) return '<span class="text-muted">-</span>';
  const escaped = escapeHtml(text);
  return `<div class="truncate-cell" title="Click to view full message">${escaped}</div>`;
}

function renderRows(data) {
  if (!Array.isArray(data)) return [];

  return data.map(item => {
    const stage = formatLoggingStage(item.loggingStage);
    const isError = stage.trim().toUpperCase() === "ERROR";
    const badgeClass = isError ? "badge-pill-danger" : "badge-pill-success";
    const badgeRow = isError ? "row-error-highlight" : "badge-pill-success";

    return [
      `<span class="seq-id">${escapeHtml(item.sequenceId)}</span>`,
      `<span class="application-code-cell">${escapeHtml(item.applicationCode)}</span>`,
      `<span class="interface-code-cell">${escapeHtml(item.interfaceCode)}</span>`,
      `<div class="txn-id-wrap text-start">${escapeHtml(item.transactionId)}</div>`,
      `<div class="logging-stage-cell">
        <span class="badge-pill-custom ${badgeClass} ${badgeRow}">${stage}</span>
      </div>`,
      `<span class="target-service-cell">${escapeHtml(item.targetService)}</span>`,
      `<span class="log-time-cell">${escapeHtml(item.logTime)}</span>`,
      `<div class="log-msg-cell">${clickableTruncate(item.loggedMessage)}</div>`
    ];
  });
}

function renderDurationRows(data) {
  if (!Array.isArray(data)) return [];

  return data.map(item => {
    const status = item.status || "UNKNOWN";
    const isSuccess = status.toUpperCase() === "SUCCESS";
    const statusClass = isSuccess ? "badge-pill-success" : "badge-pill-danger";

    const durationSeconds =
      item.durationMillis === null || item.durationMillis === undefined
        ? "-"
        : (item.durationMillis / 1000).toLocaleString();

    return [
      `<span class="application-code-cell">${escapeHtml(item.applicationCode || "-")}</span>`,
      `<span class="interface-code-cell">${escapeHtml(item.interfaceCode || "-")}</span>`,
      `<span class="txn-id-wrap">${escapeHtml(item.transactionId || "-")}</span>`,
      `<div class="logging-stage-cell"><span class="badge-pill-custom ${statusClass}">${escapeHtml(status)}</span></div>`,
      `<span class="log-time-cell">${escapeHtml(
        item.firstLogTime ? String(item.firstLogTime).replace("T", " ") : "-"
      )}</span>`,
      `<span class="log-time-cell">${escapeHtml(
        item.lastLogTime ? String(item.lastLogTime).replace("T", " ") : "-"
      )}</span>`,
      `<span class="seq-id">${escapeHtml(durationSeconds)}</span>`
    ];
  });
}

function renderStatsRows(data) {
  if (!Array.isArray(data)) return [];

  const toSeconds = (ms) => {
  if (ms === null || ms === undefined) return "-";
  return (ms / 1000).toFixed(2);
};

  return data.map(item => [
    `<span class="interface-code-cell">${escapeHtml(item.interfaceCode || "-")}</span>`,
    `<span class="seq-id">${escapeHtml(item.usageCount ?? 0)}</span>`,
    `<span class="seq-id">${escapeHtml(toSeconds(item.minDurationMillis))}</span>`,
    `<span class="seq-id">${escapeHtml(toSeconds(item.maxDurationMillis))}</span>`,
    `<span class="seq-id">${escapeHtml(toSeconds(item.avgDurationMillis))}</span>`
  ]);
}

function initLogsTable(data, mode = "EXPLORER") {
  if (logsTable) {
    logsTable.destroy();
    document.querySelector("#logsTable").innerHTML = "<thead></thead><tbody></tbody>";
  }

  let columns = [];
  let tableData = [];
  let columnDefs = [];

  if (mode === "EXPLORER") {
    columns = [
      { title: "SEQUENCE_ID" },
      { title: "APPLICATION_CODE" },
      { title: "INTERFACE_CODE" },
      { title: "TRANSACTION_ID" },
      { title: "LOGGING_STAGE" },
      { title: "TARGET_SERVICE" },
      { title: "LOGTIME" },
      { title: "LOGGED_MESSAGE" }
    ];
    tableData = renderRows(data);
    columnDefs = [
      { targets: "_all", className: "dt-center" },
      { targets: [3, 7], className: "dt-left" }
    ];
  } else if (mode === "DURATION") {
    columns = [
      { title: "Application_CODE" },
      { title: "INTERFACE_CODE" },
      { title: "TRANSACTION_ID" },
      { title: "STATUS" },
      { title: "START_LOGTIME" },
      { title: "END_LOGTIME" },
      { title: "DURATION (s)" }
    ];
    tableData = renderDurationRows(data);
    columnDefs = [
      { targets: "_all", className: "dt-center" },
      { targets: [2], className: "dt-left" }
    ];
  } else if (mode === "MINMAX") {
    columns = [
      { title: "INTERFACE_CODE" },
      { title: "USAGE_COUNT" },
      { title: "MIN_DURATION (s)" },
      { title: "MAX_DURATION (s)" },
      { title: "AVG_DURATION (s)" }
    ];
    tableData = renderStatsRows(data);
    columnDefs = [
  {
    targets: "_all",
    className: "dt-head-center dt-body-center"
  }
];
  }

  logsTable = new DataTable("#logsTable", {
    data: tableData,
    columns: columns,
    paging: false,
    searching: false,
    info: false,
    ordering: false,
    responsive: false,
    autoWidth: false,
    scrollX: true,
    columnDefs: columnDefs,
    createdRow: function(row, data, dataIndex) {
      if (mode === "EXPLORER") {
        if (data[4].includes("badge-pill-danger")) {
          row.classList.add('row-error-bg');
        }
      } else {
        if (data[3].includes("badge-pill-danger")) {
          row.classList.add('row-error-bg');
        }
      }
    }
  });

  return logsTable;
}

function refreshTable(data, mode = "EXPLORER") {
  if (!logsTable) return;

  logsTable.clear();

  if (mode === "EXPLORER") {
    logsTable.rows.add(renderRows(data));
  } else if (mode === "DURATION") {
    logsTable.rows.add(renderDurationRows(data));
  } else if (mode === "MINMAX") {
    logsTable.rows.add(renderStatsRows(data));
  }

  logsTable.draw();
}

function updateEntriesText(start, end, total = end) {
  const el = document.getElementById("entriesText");
  if (!el) return;

  if (!start && !end && !total) {
    el.textContent = "Showing 0-0 of 0 entries";
  } else {
    el.textContent = `Showing ${start}-${end} of ${total} entries`;
  }
}

function renderPager(currentPage, totalPages, onPageChange) {
  const pager = document.getElementById("pager");
  if (!pager) return;

  pager.innerHTML = "";

  if (!totalPages || totalPages < 1) return;

  const createBtn = (label, page, disabled = false, active = false) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = label;
    btn.disabled = disabled;

    if (active) btn.classList.add("active");

    if (!disabled) {
      btn.addEventListener("click", () => onPageChange(page));
      btn.style.cursor = "pointer";
    } else if (active) {
      btn.style.cursor = "default";
    } else {
      btn.style.cursor = "not-allowed";
    }

    pager.appendChild(btn);
  };

  const createEllipsis = () => {
    const span = document.createElement("span");
    span.className = "pager-ellipsis";
    span.textContent = "...";
    pager.appendChild(span);
  };

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  createBtn('<i class="bi bi-chevron-left"></i>', currentPage - 1, !hasPrev, false);

  if (totalPages <= 4) {
    for (let page = 1; page <= totalPages; page++) {
      const isCurrent = page === currentPage;
      createBtn(String(page), page, isCurrent, isCurrent);
    }
  } else {
    createBtn("1", 1, currentPage === 1, currentPage === 1);

    if (currentPage > 3) {
      createEllipsis();
    }

    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    for (let page = startPage; page <= endPage; page++) {
      if (page !== 1 && page !== totalPages) {
        const isCurrent = page === currentPage;
        createBtn(String(page), page, isCurrent, isCurrent);
      }
    }

    if (currentPage < totalPages - 2) {
      createEllipsis();
    }

    createBtn(String(totalPages), totalPages, currentPage === totalPages, currentPage === totalPages);
  }

  createBtn('<i class="bi bi-chevron-right"></i>', currentPage + 1, !hasNext, false);
}

document.addEventListener("DOMContentLoaded", () => {
  const detailModalEl = document.getElementById("detailModal");
  const modalContent = document.getElementById("modalContent");
  const copyBtn = document.getElementById("copyBtn");

  if (!detailModalEl || !modalContent || !copyBtn) return;

  const detailModal = new bootstrap.Modal(detailModalEl);

  document.addEventListener("click", e => {
    const target = e.target.closest(".truncate-cell");
    if (!target) return;

    const rawData = target.textContent.trim();
    const formattedData = formatLoggedData(rawData);

    modalContent.textContent = formattedData;
    detailModal.show();
  });

  copyBtn.addEventListener("click", async () => {
    const text = modalContent.textContent || "";

    try {
      await navigator.clipboard.writeText(text);
      const originalHtml = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
      copyBtn.classList.replace("btn-primary", "btn-success");

      setTimeout(() => {
        copyBtn.innerHTML = originalHtml;
        copyBtn.classList.replace("btn-success", "btn-primary");
      }, 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  });
});

/**
 * Detects and formats JSON or XML strings for pretty-printing.
 */
function formatLoggedData(rawText) {
  const text = rawText.trim();

  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      /* Not valid JSON, move to next check */
    }
  }

  if (text.startsWith("<")) {
    try {
      return formatXml(text);
    } catch (e) {
      /* Not valid XML, return as plain text */
    }
  }

  return text;
}

/**
 * Simple XML Beautifier using Regex
 */
function formatXml(xml) {
  let formatted = "";
  let indent = "";
  const tab = "  ";

  xml.split(/>\s*</).forEach(node => {
    if (node.match(/^\/\w/)) {
      indent = indent.substring(tab.length);
    }

    formatted += indent + "<" + node + ">\r\n";

    if (node.match(/^<?\w[^>]*[^\/]$/) && !node.startsWith("?")) {
      indent += tab;
    }
  });

  return formatted.substring(1, formatted.length - 3);
}