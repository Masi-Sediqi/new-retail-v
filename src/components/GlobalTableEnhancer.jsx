import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./GlobalTableEnhancer.css";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function getDataRows(table) {
  const tbody = table.tBodies?.[0];
  if (!tbody) return [];

  return Array.from(tbody.rows).filter((row) => {
    const cells = Array.from(row.cells || []);
    if (!cells.length) return false;
    return !cells.some((cell) => Number(cell.colSpan || 1) > 1);
  });
}

function shouldSkipTable(table) {
  return table.closest("form") ||
    table.closest(".receipt-page") ||
    table.closest(".invoice-report-paper") ||
    table.matches("[data-table-enhancer='off']");
}

function findGlobalPagination(table) {
  return table.nextElementSibling?.classList?.contains("global-table-pagination")
    ? table.nextElementSibling
    : null;
}

function hasBuiltInPagination(table) {
  let container = table.parentElement;

  for (let depth = 0; depth < 3 && container; depth += 1) {
    if (container.querySelector(".table-pagination")) return true;
    container = container.parentElement;
  }

  return false;
}

function ensureScrollWrapper(table) {
  if (table.parentElement?.classList?.contains("global-table-scroll")) {
    return;
  }

  if (
    table.closest(".dashboard-table-wrap") ||
    table.closest(".search-results-table-wrap")
  ) {
    return;
  }

  const parent = table.parentElement;
  if (!parent) return;

  const wrapper = document.createElement("div");
  wrapper.className = "global-table-scroll";
  parent.insertBefore(wrapper, table);
  wrapper.appendChild(table);
}

function cleanupEnhancedTable(table) {
  findGlobalPagination(table)?.remove();
  table.dataset.enhancedTable = "false";
  table.__globalTableEnhancer = null;
  getDataRows(table).forEach((row) => {
    row.hidden = false;
  });
}

function removeLegacyFilterRows(table) {
  table.querySelectorAll(".table-column-filter-row").forEach((row) => row.remove());
}

function enhanceTable(table) {
  if (shouldSkipTable(table)) return;

  removeLegacyFilterRows(table);

  if (hasBuiltInPagination(table)) {
    cleanupEnhancedTable(table);
    return;
  }

  ensureScrollWrapper(table);

  if (table.dataset.enhancedTable === "true") {
    table.__globalTableEnhancer?.refresh();
    return;
  }
  if (findGlobalPagination(table)) return;

  let rows = getDataRows(table);
  if (rows.length === 0) return;

  table.dataset.enhancedTable = "true";
  table.classList.add("enhanced-data-table");

  let page = 1;
  let pageSize = 20;

  const pagination = document.createElement("div");
  pagination.className = "global-table-pagination";

  const summary = document.createElement("span");
  const controls = document.createElement("div");
  const pageSizeLabel = document.createElement("label");
  const pageSizeSelect = document.createElement("select");
  const previous = document.createElement("button");
  const current = document.createElement("strong");
  const next = document.createElement("button");

  pageSizeLabel.textContent = "Rows per page";
  pageSizeSelect.setAttribute("aria-label", "Rows per page");
  PAGE_SIZE_OPTIONS.forEach((size) => {
    const option = document.createElement("option");
    option.value = String(size);
    option.textContent = String(size);
    pageSizeSelect.appendChild(option);
  });
  pageSizeSelect.value = String(pageSize);

  previous.type = "button";
  previous.textContent = "Previous";
  next.type = "button";
  next.textContent = "Next";

  pageSizeSelect.addEventListener("change", () => {
    pageSize = Number(pageSizeSelect.value) || 20;
    page = 1;
    render();
  });

  previous.addEventListener("click", () => {
    page = Math.max(1, page - 1);
    render();
  });

  next.addEventListener("click", () => {
    page += 1;
    render();
  });

  controls.append(pageSizeLabel, pageSizeSelect, previous, current, next);
  pagination.append(summary, controls);
  table.insertAdjacentElement("afterend", pagination);

  function render() {
    rows = getDataRows(table);
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    page = Math.min(page, totalPages);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const visibleSet = new Set(rows.slice(start, end));

    rows.forEach((row) => {
      row.hidden = !visibleSet.has(row);
    });

    const first = rows.length ? start + 1 : 0;
    const last = Math.min(end, rows.length);
    summary.textContent = `Showing ${first} to ${last} of ${rows.length} records`;
    current.textContent = `Page ${page} of ${totalPages}`;
    previous.disabled = page <= 1;
    next.disabled = page >= totalPages;
    pagination.hidden = rows.length <= Math.min(...PAGE_SIZE_OPTIONS);
  }

  table.__globalTableEnhancer = { refresh: render };
  render();
}

function enhanceAllTables() {
  document.querySelectorAll("table").forEach(enhanceTable);
}

function GlobalTableEnhancer() {
  const location = useLocation();

  useEffect(() => {
    const run = () => window.requestAnimationFrame(enhanceAllTables);
    run();

    const observer = new MutationObserver(() => run());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [location.pathname]);

  return null;
}

export default GlobalTableEnhancer;
