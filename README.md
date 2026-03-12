# Static Quiz Website

This project is a lightweight static website built with vanilla HTML, CSS, and JavaScript.

The main page lists quiz folders. Opening a folder shows that folder's quizzes with search, date range filters, date sorting, and pagination.

## Quiz format

Put quiz files into folder subdirectories inside [`quizzes/`](/Users/nevenkitasuno/my-crate/unencr/published/it/quiz-engine/quizzes), for example `quizzes/math/math-test.txt`.

```txt
Quiz name
2022.04.18

Question text
- wrong answer
+ right answer

Matching question
- left item :: right item
- another left :: another right
```

Multiple `+` answers are allowed for questions with more than one correct choice.
Matching questions use `- left :: right` lines.

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
