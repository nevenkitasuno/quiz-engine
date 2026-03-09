const PAGE_SIZE = 10;

const state = {
  folder: null,
  filteredQuizzes: [],
  currentPage: 1,
};

const elements = {
  folderTitle: document.querySelector("#folder-title"),
  folderError: document.querySelector("#folder-error"),
  folderContent: document.querySelector("#folder-content"),
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

async function loadFolder() {
  const params = new URLSearchParams(window.location.search);
  const folderId = params.get("folder");
  if (!folderId) {
    throw new Error(window.I18n.t("missingFolderParameter"));
  }

  const response = await fetch("./data/quizzes.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(window.I18n.t("manifestLoadError"));
  }

  const manifest = await response.json();
  const folder = (manifest.folders ?? []).find((entry) => entry.id === folderId);
  if (!folder) {
    throw new Error(window.I18n.t("folderNotFound"));
  }

  state.folder = folder;
  document.title = window.I18n.t("folderPageTitle", { name: folder.name });
  elements.folderTitle.textContent = folder.name;
  elements.folderContent.hidden = false;
  applyFilters();
}

function applyFilters() {
  const searchTerm = elements.searchInput.value.trim().toLowerCase();
  const dateFrom = elements.dateFrom.value;
  const dateTo = elements.dateTo.value;
  const sortOrder = elements.sortOrder.value;

  state.filteredQuizzes = state.folder.quizzes
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
  document.title = window.I18n.t("folderPageTitle", { name: state.folder.name });

  const start = (state.currentPage - 1) * PAGE_SIZE;
  const items = state.filteredQuizzes.slice(start, start + PAGE_SIZE);

  elements.tableBody.innerHTML = items
    .map(
      (quiz) => `
        <tr>
          <td>${escapeHtml(quiz.displayDate)}</td>
          <td>
            <a class="quiz-link" href="./quiz.html?file=${encodeURIComponent(quiz.path)}">
              ${escapeHtml(quiz.name)}
            </a>
          </td>
        </tr>
      `,
    )
    .join("");

  elements.emptyState.hidden = totalItems !== 0;
  elements.resultsSummary.textContent = window.I18n.t("quizFound", { count: totalItems });
  elements.pageLabel.textContent = window.I18n.t("pageLabel", {
    current: state.currentPage,
    total: totalPages,
  });
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

window.I18n.init();
elements.searchInput.addEventListener("input", applyFilters);
elements.dateFrom.addEventListener("change", applyFilters);
elements.dateTo.addEventListener("change", applyFilters);
elements.sortOrder.addEventListener("change", applyFilters);
elements.resetFilters.addEventListener("click", resetFilters);
elements.prevPage.addEventListener("click", () => changePage(-1));
elements.nextPage.addEventListener("click", () => changePage(1));
window.addEventListener("languagechange", () => {
  if (state.folder) {
    renderTable();
  }
});

loadFolder().catch((error) => {
  elements.folderTitle.textContent = window.I18n.t("folderUnavailable");
  elements.folderError.hidden = false;
  elements.folderError.textContent = error.message;
});
