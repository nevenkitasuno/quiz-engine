const quizTitle = document.querySelector("#quiz-title");
const quizDate = document.querySelector("#quiz-date");
const quizError = document.querySelector("#quiz-error");
const quizForm = document.querySelector("#quiz-form");
const quizQuestions = document.querySelector("#quiz-questions");
const quizResults = document.querySelector("#quiz-results");
let currentQuiz = null;
let lastResult = null;

async function loadQuiz() {
  const params = new URLSearchParams(window.location.search);
  const file = params.get("file");

  if (!file) {
    throw new Error(window.I18n.t("missingQuizFileParameter"));
  }

  if (file.includes("..")) {
    throw new Error(window.I18n.t("invalidQuizPath"));
  }

  const response = await fetch(`./quizzes/${file}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(window.I18n.t("loadSelectedQuizError"));
  }

  return parseQuiz(await response.text());
}

function parseQuiz(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  const name = lines[0]?.trim();
  const rawDate = lines[1]?.trim();

  if (!name || !rawDate) {
    throw new Error(window.I18n.t("quizMissingNameOrDate"));
  }

  const questions = [];
  let index = 2;

  while (index < lines.length) {
    while (index < lines.length && lines[index].trim() === "") {
      index += 1;
    }

    if (index >= lines.length) {
      break;
    }

    const prompt = lines[index].trim();
    index += 1;

    const answers = [];
    while (index < lines.length && lines[index].trim() !== "") {
      const line = lines[index];
      if (!line.startsWith("+") && !line.startsWith("-")) {
        throw new Error(window.I18n.t("invalidAnswerLine", { line }));
      }

      answers.push({
        text: line.slice(1).trim(),
        isCorrect: line.startsWith("+"),
      });
      index += 1;
    }

    if (answers.length === 0) {
      throw new Error(window.I18n.t("questionHasNoAnswers", { question: prompt }));
    }

    questions.push({ prompt, answers });
  }

  if (questions.length === 0) {
    throw new Error(window.I18n.t("quizContainsNoQuestions"));
  }

  return {
    name,
    rawDate,
    displayDate: rawDate.replaceAll(".", "-"),
    questions,
  };
}

function renderQuiz(quiz) {
  currentQuiz = quiz;
  document.title = window.I18n.t("quizPageTitle", { name: quiz.name });
  quizTitle.textContent = quiz.name;
  quizDate.textContent = window.I18n.t("datePrefix", { date: quiz.displayDate });

  quizQuestions.innerHTML = quiz.questions
    .map(
      (question, questionIndex) => `
        <article class="question-card" data-question-index="${questionIndex}">
          <h2>${questionIndex + 1}. ${escapeHtml(question.prompt)}</h2>
          <div class="answer-list">
            ${question.answers
              .map(
                (answer, answerIndex) => `
                  <label class="answer-option">
                    <input
                      type="checkbox"
                      name="question-${questionIndex}"
                      value="${answerIndex}"
                    />
                    <span>${escapeHtml(answer.text)}</span>
                  </label>
                `,
              )
              .join("")}
          </div>
          <p class="question-status" hidden></p>
        </article>
      `,
    )
    .join("");

  quizForm.hidden = false;
  quizForm.addEventListener("submit", (event) => handleSubmit(event, quiz), { once: true });
}

function handleSubmit(event, quiz) {
  event.preventDefault();

  let correctCount = 0;

  quiz.questions.forEach((question, questionIndex) => {
    const card = quizQuestions.querySelector(`[data-question-index="${questionIndex}"]`);
    const status = card.querySelector(".question-status");
    const checkboxes = [...card.querySelectorAll('input[type="checkbox"]')];
    const selectedIndexes = checkboxes
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => Number.parseInt(checkbox.value, 10))
      .sort((left, right) => left - right);
    const correctIndexes = question.answers
      .map((answer, answerIndex) => (answer.isCorrect ? answerIndex : -1))
      .filter((value) => value !== -1);

    const isCorrect =
      selectedIndexes.length === correctIndexes.length &&
      selectedIndexes.every((value, index) => value === correctIndexes[index]);

    checkboxes.forEach((checkbox, answerIndex) => {
      const option = checkbox.closest(".answer-option");
      if (question.answers[answerIndex].isCorrect) {
        option.classList.add("correct");
      } else if (checkbox.checked) {
        option.classList.add("wrong");
      }

      checkbox.disabled = true;
    });

    status.hidden = false;
    status.textContent = isCorrect ? window.I18n.t("correct") : window.I18n.t("wrong");
    status.classList.toggle("correct", isCorrect);
    status.classList.toggle("wrong", !isCorrect);

    if (isCorrect) {
      correctCount += 1;
    }
  });

  const totalQuestions = quiz.questions.length;
  lastResult = { correctCount, totalQuestions };
  quizResults.hidden = false;
  renderResults();
}

function renderResults() {
  if (!lastResult) {
    return;
  }

  quizResults.innerHTML = `
    <h2>${escapeHtml(window.I18n.t("resultTitle"))}</h2>
    <p>${escapeHtml(
      window.I18n.t("resultSummary", {
        count: lastResult.correctCount,
        total: lastResult.totalQuestions,
      }),
    )}</p>
  `;
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
window.addEventListener("languagechange", () => {
  if (currentQuiz) {
    document.title = window.I18n.t("quizPageTitle", { name: currentQuiz.name });
    quizDate.textContent = window.I18n.t("datePrefix", { date: currentQuiz.displayDate });
  }

  quizQuestions.querySelectorAll(".question-status").forEach((status) => {
    if (status.hidden) {
      return;
    }

    status.textContent = status.classList.contains("correct")
      ? window.I18n.t("correct")
      : window.I18n.t("wrong");
  });

  renderResults();
});

loadQuiz()
  .then(renderQuiz)
  .catch((error) => {
    quizTitle.textContent = window.I18n.t("quizUnavailable");
    quizDate.textContent = "";
    quizError.hidden = false;
    quizError.textContent = error.message;
  });
