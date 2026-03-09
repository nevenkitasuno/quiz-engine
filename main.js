const PAGE_SIZE = 10;

const state = {
  quizzes: [],
  filteredQuizzes: [],
  currentPage: 1,
};

const elements = {
  searchInput: document.querySelector("#search-input"),
  dateFrom: document.querySelector("#date-from"),
  dateTo: document.querySelector("#date-to"),
  sortOrder: document.querySelector("#sort-order"),
  resetFilters: document.querySelector("#reset-filters"),
  tableBody: document.querySelector("#quiz-table-body"),
  resultsSummary: document.querySelector("#results-summary"),
  emptyState: document.querySelector("#empty-state"),
  prevPage: document.querySelector("#prev-page"),
  nextPage: document.querySelector("#next-page"),
  pageLabel: document.querySelector("#page-label"),
};

async function loadManifest() {
  const response = await fetch("./data/quizzes.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load quiz manifest.");
  }

  const manifest = await response.json();
  state.quizzes = manifest.quizzes ?? [];
  applyFilters();
}

function applyFilters() {
  const searchTerm = elements.searchInput.value.trim().toLowerCase();
  const dateFrom = elements.dateFrom.value;
  const dateTo = elements.dateTo.value;
  const sortOrder = elements.sortOrder.value;

  state.filteredQuizzes = state.quizzes
    .filter((quiz) => quiz.name.toLowerCase().includes(searchTerm))
    .filter((quiz) => !dateFrom || quiz.isoDate >= dateFrom)
    .filter((quiz) => !dateTo || quiz.isoDate <= dateTo)
    .sort((left, right) => {
      const comparison = left.isoDate.localeCompare(right.isoDate);
      return sortOrder === "asc" ? comparison : -comparison;
    });

  state.currentPage = 1;
  renderTable();
}

function renderTable() {
  const totalItems = state.filteredQuizzes.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  state.currentPage = Math.min(state.currentPage, totalPages);

  const start = (state.currentPage - 1) * PAGE_SIZE;
  const items = state.filteredQuizzes.slice(start, start + PAGE_SIZE);

  elements.tableBody.innerHTML = items
    .map(
      (quiz) => `
        <tr>
          <td>${escapeHtml(quiz.displayDate)}</td>
          <td>
            <a class="quiz-link" href="./quiz.html?file=${encodeURIComponent(quiz.file)}">
              ${escapeHtml(quiz.name)}
            </a>
          </td>
        </tr>
      `,
    )
    .join("");

  elements.emptyState.hidden = totalItems !== 0;
  elements.resultsSummary.textContent = `${totalItems} quiz${totalItems === 1 ? "" : "zes"} found`;
  elements.pageLabel.textContent = `Page ${state.currentPage} of ${totalPages}`;
  elements.prevPage.disabled = state.currentPage === 1;
  elements.nextPage.disabled = state.currentPage === totalPages || totalItems === 0;
}

function changePage(direction) {
  const totalPages = Math.max(1, Math.ceil(state.filteredQuizzes.length / PAGE_SIZE));
  const nextPage = state.currentPage + direction;

  if (nextPage < 1 || nextPage > totalPages) {
    return;
  }

  state.currentPage = nextPage;
  renderTable();
}

function resetFilters() {
  elements.searchInput.value = "";
  elements.dateFrom.value = "";
  elements.dateTo.value = "";
  elements.sortOrder.value = "desc";
  applyFilters();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function registerEvents() {
  elements.searchInput.addEventListener("input", applyFilters);
  elements.dateFrom.addEventListener("change", applyFilters);
  elements.dateTo.addEventListener("change", applyFilters);
  elements.sortOrder.addEventListener("change", applyFilters);
  elements.resetFilters.addEventListener("click", resetFilters);
  elements.prevPage.addEventListener("click", () => changePage(-1));
  elements.nextPage.addEventListener("click", () => changePage(1));
}

registerEvents();
loadManifest().catch((error) => {
  elements.resultsSummary.textContent = error.message;
  elements.emptyState.hidden = false;
  elements.emptyState.textContent =
    "Run the manifest generator after adding quiz files, then serve this folder with a local static server.";
});
