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
	Path        string `json:"path"`
	Name        string `json:"name"`
	RawDate     string `json:"rawDate"`
	ISODate     string `json:"isoDate"`
	DisplayDate string `json:"displayDate"`
}

type Manifest struct {
	Folders []FolderMetadata `json:"folders"`
}

type FolderMetadata struct {
	ID      string         `json:"id"`
	Name    string         `json:"name"`
	Quizzes []QuizMetadata `json:"quizzes"`
}

func main() {
	rootDir, err := findRootDir()
	if err != nil {
		exitWithError(err)
	}

	quizDir := filepath.Join(rootDir, "quizzes")
	outputFile := filepath.Join(rootDir, "data", "quizzes.json")

	folders, err := scanFolders(quizDir)
	if err != nil {
		exitWithError(err)
	}

	data, err := json.MarshalIndent(Manifest{Folders: folders}, "", "  ")
	if err != nil {
		exitWithError(err)
	}

	if err := os.WriteFile(outputFile, append(data, '\n'), 0o644); err != nil {
		exitWithError(err)
	}

	totalQuizzes := 0
	for _, folder := range folders {
		totalQuizzes += len(folder.Quizzes)
	}

	fmt.Printf("Wrote %d folders and %d quizzes to %s\n", len(folders), totalQuizzes, outputFile)
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

func scanFolders(quizDir string) ([]FolderMetadata, error) {
	entries, err := os.ReadDir(quizDir)
	if err != nil {
		return nil, err
	}

	folders := make([]FolderMetadata, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		folderPath := filepath.Join(quizDir, entry.Name())
		quizEntries, err := os.ReadDir(folderPath)
		if err != nil {
			return nil, err
		}

		quizzes := make([]QuizMetadata, 0, len(quizEntries))
		for _, quizEntry := range quizEntries {
			if quizEntry.IsDir() || filepath.Ext(quizEntry.Name()) != ".txt" {
				continue
			}

			relativePath := filepath.ToSlash(filepath.Join(entry.Name(), quizEntry.Name()))
			quizPath := filepath.Join(folderPath, quizEntry.Name())
			quiz, err := parseQuizMetadata(quizPath, entry.Name(), quizEntry.Name(), relativePath)
			if err != nil {
				return nil, err
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
			return quizzes[i].Path > quizzes[j].Path
		})

		folders = append(folders, FolderMetadata{
			ID:      entry.Name(),
			Name:    entry.Name(),
			Quizzes: quizzes,
		})
	}

	sort.Slice(folders, func(i, j int) bool {
		return strings.ToLower(folders[i].Name) < strings.ToLower(folders[j].Name)
	})

	return folders, nil
}

func parseQuizMetadata(path string, folderName string, filename string, relativePath string) (QuizMetadata, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return QuizMetadata{}, err
	}

	lines := strings.Split(strings.ReplaceAll(string(content), "\r", ""), "\n")
	if len(lines) < 2 {
		return QuizMetadata{}, fmt.Errorf("%s/%s: missing quiz name or date", folderName, filename)
	}

	name := strings.TrimSpace(lines[0])
	rawDate := strings.TrimSpace(lines[1])
	if name == "" || rawDate == "" {
		return QuizMetadata{}, fmt.Errorf("%s/%s: missing quiz name or date", folderName, filename)
	}

	parts := strings.Split(rawDate, ".")
	if len(parts) != 3 {
		return QuizMetadata{}, fmt.Errorf("%s/%s: invalid date format, expected yyyy.mm.dd", folderName, filename)
	}

	for _, part := range parts {
		if part == "" || !isDigitsOnly(part) {
			return QuizMetadata{}, fmt.Errorf("%s/%s: invalid date format, expected yyyy.mm.dd", folderName, filename)
		}
	}

	isoDate := strings.Join(parts, "-")
	return QuizMetadata{
		File:        filename,
		Path:        relativePath,
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
