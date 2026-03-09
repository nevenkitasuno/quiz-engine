package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type QuizMetadata struct {
	File        string `json:"file"`
	Name        string `json:"name"`
	RawDate     string `json:"rawDate"`
	ISODate     string `json:"isoDate"`
	DisplayDate string `json:"displayDate"`
}

type Manifest struct {
	Quizzes []QuizMetadata `json:"quizzes"`
}

func main() {
	rootDir, err := findRootDir()
	if err != nil {
		exitWithError(err)
	}

	quizDir := filepath.Join(rootDir, "quizzes")
	outputFile := filepath.Join(rootDir, "data", "quizzes.json")

	entries, err := os.ReadDir(quizDir)
	if err != nil {
		exitWithError(err)
	}

	quizzes := make([]QuizMetadata, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".txt" {
			continue
		}

		quizPath := filepath.Join(quizDir, entry.Name())
		quiz, err := parseQuizMetadata(quizPath, entry.Name())
		if err != nil {
			exitWithError(err)
		}

		quizzes = append(quizzes, quiz)
	}

	sort.Slice(quizzes, func(i, j int) bool {
		if quizzes[i].ISODate != quizzes[j].ISODate {
			return quizzes[i].ISODate > quizzes[j].ISODate
		}
		if !strings.EqualFold(quizzes[i].Name, quizzes[j].Name) {
			return strings.ToLower(quizzes[i].Name) > strings.ToLower(quizzes[j].Name)
		}
		return quizzes[i].File > quizzes[j].File
	})

	data, err := json.MarshalIndent(Manifest{Quizzes: quizzes}, "", "  ")
	if err != nil {
		exitWithError(err)
	}

	if err := os.WriteFile(outputFile, append(data, '\n'), 0o644); err != nil {
		exitWithError(err)
	}

	fmt.Printf("Wrote %d quizzes to %s\n", len(quizzes), outputFile)
}

func findRootDir() (string, error) {
	workingDir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	scriptDir := filepath.Join(workingDir, "scripts")
	if _, err := os.Stat(scriptDir); err == nil {
		return workingDir, nil
	}

	return filepath.Dir(workingDir), nil
}

func parseQuizMetadata(path string, filename string) (QuizMetadata, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return QuizMetadata{}, err
	}

	lines := strings.Split(strings.ReplaceAll(string(content), "\r", ""), "\n")
	if len(lines) < 2 {
		return QuizMetadata{}, fmt.Errorf("%s: missing quiz name or date", filename)
	}

	name := strings.TrimSpace(lines[0])
	rawDate := strings.TrimSpace(lines[1])
	if name == "" || rawDate == "" {
		return QuizMetadata{}, fmt.Errorf("%s: missing quiz name or date", filename)
	}

	parts := strings.Split(rawDate, ".")
	if len(parts) != 3 {
		return QuizMetadata{}, fmt.Errorf("%s: invalid date format, expected yyyy.mm.dd", filename)
	}

	for _, part := range parts {
		if part == "" || !isDigitsOnly(part) {
			return QuizMetadata{}, fmt.Errorf("%s: invalid date format, expected yyyy.mm.dd", filename)
		}
	}

	isoDate := strings.Join(parts, "-")
	return QuizMetadata{
		File:        filename,
		Name:        name,
		RawDate:     rawDate,
		ISODate:     isoDate,
		DisplayDate: isoDate,
	}, nil
}

func isDigitsOnly(value string) bool {
	for _, char := range value {
		if char < '0' || char > '9' {
			return false
		}
	}
	return true
}

func exitWithError(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
