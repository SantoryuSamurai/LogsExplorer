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
  return `<div class="truncate-cell" title="Click to expand">${escaped}</div>`;
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
    clickableTruncate(item.loggedMessage),
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
    responsive: false, // Set to false to allow our custom horizontal scroll
    autoWidth: false,   // Disable automatic column width calculation
    scrollX: false      // We handle scrolling via the Bootstrap .table-responsive wrapper
  });

  return logsTable;
}

function refreshTable(data) {
  if (!logsTable) return;
  logsTable.clear();
  logsTable.rows.add(renderRows(data));
  logsTable.draw();
}



document.addEventListener("DOMContentLoaded", () => {
  const detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
  const modalContent = document.getElementById('modalContent');
  const copyBtn = document.getElementById('copyBtn');

  // Handle cell click
  document.querySelector('#logsTable tbody').addEventListener('click', (e) => {
    const target = e.target.closest('.truncate-cell');
    if (target) {
      modalContent.textContent = target.textContent;
      detailModal.show();
    }
  });
  copyBtn.addEventListener('click', () => {
    const text = modalContent.textContent;
    navigator.clipboard.writeText(text).then(() => {
      const originalHtml = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
      copyBtn.classList.replace('btn-primary', 'btn-success');
      
      setTimeout(() => {
        copyBtn.innerHTML = originalHtml;
        copyBtn.classList.replace('btn-success', 'btn-primary');
      }, 2000);
    });
  });
});


function updateEntriesText(start, end) {
  const el = document.getElementById("entriesText");
  if (!el) return;

  if (!start || !end) {
    el.textContent = "Showing 0-0 entries";
  } else {
    el.textContent = `Showing ${start}-${end} entries`;
  }
}

function renderPager(currentPage, hasPrev, hasNext, onPageChange) {
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
      btn.style.cursor = "pointer";
    } else {
      btn.style.cursor = "not-allowed";
    }

    pager.appendChild(btn);
  };

  createBtn("Prev", currentPage - 1, !hasPrev, false);
  createBtn(String(currentPage), currentPage, true, true);
  createBtn("Next", currentPage + 1, !hasNext, false);
}