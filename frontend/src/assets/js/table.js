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
  return data.map(item => [
    escapeHtml(item.sequenceId),
    escapeHtml(item.interfaceCode),
    escapeHtml(item.applicationCode),
    escapeHtml(item.transactionId),
    formatLoggingStage(item.loggingStage),
    escapeHtml(item.targetService),
    escapeHtml(item.logTime),
    clickableTruncate(item.loggedMessage)
  ]);
}

function initLogsTable(initialData) {
  if (logsTable) logsTable.destroy();

  document.querySelector("#logsTable").innerHTML = "<thead></thead><tbody></tbody>";

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
    responsive: false,
    autoWidth: false,
    scrollX: false
  });

  return logsTable;
}

function refreshTable(data) {
  if (!logsTable) return;
  logsTable.clear();
  logsTable.rows.add(renderRows(data));
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
    btn.textContent = label;
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

  createBtn("Prev", currentPage - 1, !hasPrev, false);

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

  createBtn("Next", currentPage + 1, !hasNext, false);
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

    modalContent.textContent = target.textContent.trim();
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