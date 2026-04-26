import * as vscode from "vscode";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type Commit = {
  hash: string;
  authorName: string;
  date: string;
  subject: string;
  files: string[];
};

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(
    "weeklyWorkSummary.generate",
    async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage(
          "Open a folder with a Git repository first."
        );
        return;
      }

      try {
        const commits = await loadWeeklyCommits(workspaceFolder.uri.fsPath);
        if (commits.length === 0) {
          vscode.window.showInformationMessage(
            "No commits found this week in the current repository."
          );
          return;
        }

        const summary = summarizeCommits(commits);
        const doc = await vscode.workspace.openTextDocument({
          content: summary,
          language: "markdown"
        });
        await vscode.window.showTextDocument(doc, { preview: false });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        vscode.window.showErrorMessage(
          `Could not build weekly summary from git log: ${message}`
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  // no-op
}

async function loadWeeklyCommits(cwd: string): Promise<Commit[]> {
  const gitLogOutput = await runGitCommand(
    [
      "log",
      "--since=last monday",
      "--pretty=format:%H%x1f%an%x1f%ad%x1f%s%x1e",
      "--date=short"
    ],
    cwd
  );

  const entries = gitLogOutput
    .split("\x1e")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const commits: Commit[] = [];

  for (const entry of entries) {
    const [hash, authorName, date, subject] = entry.split("\x1f");
    if (!hash || !authorName || !date || !subject) {
      continue;
    }

    const filesOutput = await runGitCommand(
      ["show", "--pretty=format:", "--name-only", hash],
      cwd
    );

    const files = filesOutput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    commits.push({ hash, authorName, date, subject, files });
  }

  return commits;
}

async function runGitCommand(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return stdout.trim();
}

function summarizeCommits(commits: Commit[]): string {
  const firstCommit = commits[commits.length - 1];
  const lastCommit = commits[0];
  const totalCommits = commits.length;
  const filesTouched = new Map<string, number>();
  const areasTouched = new Map<string, number>();

  for (const commit of commits) {
    for (const file of commit.files) {
      filesTouched.set(file, (filesTouched.get(file) ?? 0) + 1);
      const area = file.includes("/") ? file.split("/")[0] : "(root)";
      areasTouched.set(area, (areasTouched.get(area) ?? 0) + 1);
    }
  }

  const topFiles = [...filesTouched.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([file, count]) => `- ${file} (${count} commit${count > 1 ? "s" : ""})`)
    .join("\n");

  const topAreas = [...areasTouched.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([area, count]) => `${area} (${count})`)
    .join(", ");

  const recentSubjects = commits
    .slice(0, 8)
    .map((c) => `- ${c.subject}`)
    .join("\n");

  return [
    "# Weekly Work Summary",
    "",
    `You made **${totalCommits} commit${totalCommits > 1 ? "s" : ""}** between **${firstCommit.date}** and **${lastCommit.date}**.`,
    `Most touched areas: ${topAreas || "No file path data available."}`,
    "",
    "## What You Worked On",
    "Based on commit messages and touched files, this week focused on:",
    topAreas
      ? `- Changes concentrated in ${topAreas}.`
      : "- A mix of changes without a clear dominant area.",
    `- Total files touched: ${filesTouched.size}.`,
    "",
    "## Most Frequently Updated Files",
    topFiles || "- No files detected from commit history.",
    "",
    "## Recent Commit Highlights",
    recentSubjects || "- No commit subjects available."
  ].join("\n");
}
