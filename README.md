# Static Quiz Website

This project is a lightweight static website built with vanilla HTML, CSS, and JavaScript.

## Quiz format

Put quiz files into [`quizzes/`](/Users/nevenkitasuno/my-crate/unencr/published/it/quiz-engine/quizzes) using this format:

```txt
Quiz name
2022.04.18

Question text
- wrong answer
+ right answer
```

Multiple `+` answers are allowed for questions with more than one correct choice.

## Refresh quiz list

When you add or edit quiz files, regenerate the manifest:

```bash
go run scripts/generate_manifest.go
```

## Run locally

Serve the project directory with any static server. Example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
