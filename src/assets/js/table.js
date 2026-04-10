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

function renderRows(data) {
  return data.map(item => ([
    escapeHtml(item.sequenceId),
    escapeHtml(item.interfaceCode),
    escapeHtml(item.applicationCode),
    escapeHtml(item.transactionId),
    formatLoggingStage(item.loggingStage),
    escapeHtml(item.targetService),
    escapeHtml(item.logTime),
    escapeHtml(item.loggedMessage)
  ]));
}

function initLogsTable(initialData = []) {
  if (logsTable) {
    logsTable.destroy();
    document.querySelector("#logsTable").innerHTML = "<thead></thead><tbody></tbody>";
  }

  logsTable = new DataTable("#logsTable", {
    data: renderRows(initialData),
    columns: [
      { title: "SEQUENCE_ID" },
      { title: "INTERFACE_CODE" },
      { title: "APPLICATION_CODE" },
      { title: "TRANSACTION_ID" },
      { title: "LOGGING_STAGE" },
      { title: "TARGET_SERVICE" },
      { title: "LOGTIME" },
      { title: "LOGGED_MESSAGE" }
    ],
    paging: false,
    searching: false,
    info: false,
    ordering: false,
    responsive: true,
    autoWidth: false
  });

  return logsTable;
}

function refreshTable(data) {
  if (!logsTable) return;
  logsTable.clear();
  logsTable.rows.add(renderRows(data));
  logsTable.draw();
}

function updateEntriesText(start, end, total) {
  const el = document.getElementById("entriesText");
  if (!el) return;

  if (!total || !start || !end) {
    el.textContent = "Showing 0-0 of 0 entries";
  } else {
    el.textContent = `Showing ${start}-${end} of ${total} entries`;
  }
}

function renderPager(currentPage, totalPages, onPageChange) {
  const pager = document.getElementById("pager");
  if (!pager) return;

  pager.innerHTML = "";

  const createBtn = (label, page, disabled = false, active = false) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.disabled = disabled;

    if (active) {
      btn.classList.add("active");
    }

    if (!disabled) {
      btn.addEventListener("click", () => onPageChange(page));
    }

    pager.appendChild(btn);
  };

  createBtn("Prev", currentPage - 1, currentPage <= 1, false);
  createBtn(String(currentPage), currentPage, true, true);
  createBtn("Next", currentPage + 1, totalPages === 0 || currentPage >= totalPages, false);
}