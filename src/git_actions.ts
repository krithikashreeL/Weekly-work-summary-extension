import { readdir } from "fs/promises";
import type { Dirent } from "fs";
import path from "path";
import { promisify } from "util";
import { exec as execCallback } from "child_process";

const exec = promisify(execCallback);
const ONE_WEEK_AGO = "1 week ago";
const MAX_SCAN_DEPTH = 8;
const GIT_CONCURRENCY = 6;
const WINDOWS_DRIVE_A = 67; // C
const WINDOWS_DRIVE_Z = 90; // Z

const SKIP_DIRS = new Set([
    ".git",
    "node_modules",
    ".next",
    "dist",
    "build",
    ".cache",
    ".venv",
    "__pycache__",
    "target",
    "vendor"
]);

const SKIP_DIRS_BY_PLATFORM: Record<string, string[]> = {
    win32: ["Windows", "Program Files", "Program Files (x86)", "ProgramData", "$Recycle.Bin", "System Volume Information"],
    linux: ["proc", "sys", "dev", "run", "tmp", "snap"],
    darwin: ["System", "Library", "Applications", "private"]
};

type CommitsByDate = Record<string, string>;
type RepoCommits = Record<string, CommitsByDate>;

function escapeForDoubleQuotes(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function appendCommit(commitsByDate: CommitsByDate, date: string, message: string): void {
    if(commitsByDate[date]) {
        commitsByDate[date] = `${commitsByDate[date]} | ${message}`;
        return;
    }
    commitsByDate[date] = message;
}

function parseCommitLines(rawOutput: string): CommitsByDate {
    const commitsByDate: CommitsByDate = {};
    const lines = rawOutput.split("\n").map((line) => line.trim()).filter(Boolean);

    for(const line of lines) {
        const [date, ...messageParts] = line.split("|");
        const dateKey = date?.trim();
        const message = messageParts.join("|").trim();
        if(!dateKey || !message) {
            continue;
        }
        appendCommit(commitsByDate, dateKey, message);
    }

    return commitsByDate;
}

function mergeRepoCommits(target: RepoCommits, source: RepoCommits): void {
    for(const [repoName, commitsByDate] of Object.entries(source)) {
        if(!target[repoName]) {
            target[repoName] = {};
        }
        for(const [date, message] of Object.entries(commitsByDate)) {
            appendCommit(target[repoName], date, message);
        }
    }
}

function shouldSkipDirectory(name: string): boolean {
    if(SKIP_DIRS.has(name)) {
        return true;
    }
    const platformSkips = SKIP_DIRS_BY_PLATFORM[process.platform] ?? [];
    return platformSkips.includes(name);
}

async function findGitRepos(scanRoot: string): Promise<string[]> {
    const repos: string[] = [];
    const stack: Array<{ dir: string; depth: number }> = [{ dir: scanRoot, depth: 0 }];

    while(stack.length > 0) {
        const current = stack.pop();
        if(!current) {
            continue;
        }
        if(current.depth > MAX_SCAN_DEPTH) {
            continue;
        }

        let entries: Dirent[];
        try {
            entries = await readdir(current.dir, { withFileTypes: true, encoding: "utf8" });
        } catch {
            continue;
        }

        if(entries.some((entry) => entry.isDirectory() && entry.name === ".git")) {
            repos.push(current.dir);
            continue;
        }

        for(const entry of entries) {
            if(!entry.isDirectory() || entry.isSymbolicLink() || shouldSkipDirectory(entry.name)) {
                continue;
            }
            stack.push({ dir: path.join(current.dir, entry.name), depth: current.depth + 1 });
        }
    }

    return repos;
}

async function getRepoCommitsFromPastWeek(repoPath: string): Promise<CommitsByDate> {
    const gitLog = await exec(
        `git -C "${escapeForDoubleQuotes(repoPath)}" log --all --since="${ONE_WEEK_AGO}" --date=short --pretty=format:"%ad|%s"`
    );
    return parseCommitLines(gitLog.stdout?.toString() ?? "");
}

async function collectRepoCommits(repoPaths: string[]): Promise<RepoCommits> {
    const results: RepoCommits = {};
    let index = 0;

    async function worker() {
        while(index < repoPaths.length) {
            const currentIndex = index;
            index += 1;
            const repoPath = repoPaths[currentIndex];

            try {
                const commitsByDate = await getRepoCommitsFromPastWeek(repoPath);
                if(Object.keys(commitsByDate).length > 0) {
                    results[path.basename(repoPath)] = commitsByDate;
                }
            } catch (error: any) {
                const stderr = error?.stderr?.toString?.() ?? "";
                if(!stderr.includes("does not have any commits yet")) {
                    console.error(`Failed reading repo ${repoPath}: ${stderr || error.message}`);
                }
            }
        }
    }

    const workers = Array.from({ length: Math.min(GIT_CONCURRENCY, repoPaths.length) }, () => worker());
    await Promise.all(workers);
    return results;
}

export async function getAllReposUserWorkedOn(scanRoot = process.cwd()): Promise<RepoCommits> {
    const repoPaths = await findGitRepos(scanRoot);
    return collectRepoCommits(repoPaths);
}

async function pathExists(dirPath: string): Promise<boolean> {
    try {
        await readdir(dirPath);
        return true;
    } catch {
        return false;
    }
}

async function getScanRootsForCurrentPlatform(): Promise<string[]> {
    if(process.platform === "win32") {
        const roots: string[] = [];
        for(let code = WINDOWS_DRIVE_A; code <= WINDOWS_DRIVE_Z; code++) {
            const drive = `${String.fromCharCode(code)}:\\`;
            if(await pathExists(drive)) {
                roots.push(drive);
            }
        }
        return roots;
    }

    const unixCandidates = process.platform === "darwin"
        ? ["/", "/Volumes"]
        : ["/", "/mnt", "/media"];
    const availableRoots: string[] = [];

    for(const root of unixCandidates) {
        if(await pathExists(root)) {
            availableRoots.push(root);
        }
    }
    return availableRoots.length > 0 ? availableRoots : ["/"];
}

export async function main() {
    const scanRootArg = process.argv[2];
    if(scanRootArg) {
        const scanRoot = path.resolve(scanRootArg);
        console.log(`Scanning for repos in: ${scanRoot}`);
        const repos = await getAllReposUserWorkedOn(scanRoot);
        console.log(JSON.stringify(repos, null, 2));
        return;
    }

    const roots = await getScanRootsForCurrentPlatform();
    console.log(`Scanning for repos in roots: ${roots.join(", ")}`);

    const allRepoCommits: RepoCommits = {};
    for(const root of roots) {
        const commits = await getAllReposUserWorkedOn(root);
        mergeRepoCommits(allRepoCommits, commits);
    }
    console.log(JSON.stringify(allRepoCommits, null, 2));
    return allRepoCommits;
}

void main();