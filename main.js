const state = {
  folders: [],
  filteredFolders: [],
};

const elements = {
  searchInput: document.querySelector("#search-input"),
  resetFilters: document.querySelector("#reset-filters"),
  tableBody: document.querySelector("#folder-table-body"),
  resultsSummary: document.querySelector("#results-summary"),
  emptyState: document.querySelector("#empty-state"),
};

async function loadManifest() {
  const response = await fetch("./data/quizzes.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(window.I18n.t("manifestLoadError"));
  }

  const manifest = await response.json();
  state.folders = manifest.folders ?? [];
  applyFilters();
}

function applyFilters() {
  const searchTerm = elements.searchInput.value.trim().toLowerCase();
  state.filteredFolders = state.folders.filter((folder) =>
    folder.name.toLowerCase().includes(searchTerm),
  );
  renderTable();
}

function renderTable() {
  const totalItems = state.filteredFolders.length;
  document.title = window.I18n.t("indexTitle");

  elements.tableBody.innerHTML = state.filteredFolders
    .map(
      (folder) => `
        <tr>
          <td>
            <a class="quiz-link" href="./folder.html?folder=${encodeURIComponent(folder.id)}">
              ${escapeHtml(folder.name)}
            </a>
          </td>
          <td>${folder.quizzes.length}</td>
        </tr>
      `,
    )
    .join("");

  elements.emptyState.hidden = totalItems !== 0;
  elements.resultsSummary.textContent = window.I18n.t("folderFound", { count: totalItems });
}

function resetFilters() {
  elements.searchInput.value = "";
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
elements.resetFilters.addEventListener("click", resetFilters);
window.addEventListener("languagechange", applyFilters);

loadManifest().catch((error) => {
  elements.resultsSummary.textContent = error.message;
  elements.emptyState.hidden = false;
  elements.emptyState.textContent = window.I18n.t("manifestLoadError");
});
