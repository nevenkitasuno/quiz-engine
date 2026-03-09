(function () {
  const STORAGE_KEY = "quiz-site-language";
  const DEFAULT_LANGUAGE = "ru";

  function getTranslations() {
    return window.TRANSLATIONS ?? {};
  }

  function getAvailableLanguages() {
    return Object.keys(getTranslations());
  }

  function getLanguage() {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return getAvailableLanguages().includes(saved) ? saved : DEFAULT_LANGUAGE;
  }

  function setLanguage(language) {
    window.localStorage.setItem(STORAGE_KEY, language);
    window.dispatchEvent(new CustomEvent("languagechange", { detail: { language } }));
  }

  function interpolate(template, params = {}) {
    return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ""));
  }

  function getPluralSuffix(language, count) {
    if (language === "ru") {
      const mod10 = count % 10;
      const mod100 = count % 100;
      if (mod10 === 1 && mod100 !== 11) {
        return "_one";
      }
      return "_other";
    }

    return count === 1 ? "_one" : "_other";
  }

  function t(key, params = {}, language = getLanguage()) {
    const translations = getTranslations();
    const dictionary = translations[language] ?? translations[DEFAULT_LANGUAGE] ?? {};
    let value = dictionary[key];

    if (params.count !== undefined && dictionary[`${key}${getPluralSuffix(language, Number(params.count))}`]) {
      value = dictionary[`${key}${getPluralSuffix(language, Number(params.count))}`];
    }

    if (!value) {
      const fallback = translations[DEFAULT_LANGUAGE] ?? {};
      value = fallback[key] ?? key;
    }

    return interpolate(value, params);
  }

  function translateDocument() {
    const language = getLanguage();
    document.documentElement.lang = language;

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n, {}, language);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder, {}, language));
    });

    document.querySelectorAll("[data-i18n-title]").forEach((element) => {
      document.title = t(element.dataset.i18nTitle, {}, language);
    });
  }

  function buildSwitcher() {
    const container = document.querySelector("[data-language-switcher]");
    if (!container) {
      return;
    }

    const language = getLanguage();
    const options = getAvailableLanguages()
      .map((code) => {
        const labelKey = code === "ru" ? "languageRussian" : "languageEnglish";
        const selected = code === language ? " selected" : "";
        return `<option value="${code}"${selected}>${t(labelKey, {}, language)}</option>`;
      })
      .join("");

    container.innerHTML = `
      <label class="language-switcher">
        <span data-i18n="languageLabel">${t("languageLabel", {}, language)}</span>
        <select id="language-select">${options}</select>
      </label>
    `;

    container.querySelector("#language-select").addEventListener("change", (event) => {
      setLanguage(event.target.value);
    });
  }

  function init() {
    buildSwitcher();
    translateDocument();
    window.addEventListener("languagechange", () => {
      buildSwitcher();
      translateDocument();
    });
  }

  window.I18n = {
    getLanguage,
    setLanguage,
    t,
    init,
  };
})();
