import path from "path";
import { getWeeklySummary } from "./git_actions";

type CliOptions = {
    root: string;
    lookback: string;
    json: boolean;
};

function printHelp(): void {
    console.log(`Usage: node dist/cli.js [options]

Options:
  --root <path>         Folder to scan for git repos (default: current directory)
  --lookback <value>    Time window such as "1 day", "1 week", "3 months", "1 year"
  --json                Print raw JSON output
  --help                Show this help
`);
}

function parseLookback(value: string): string {
    const normalized = value.trim().toLowerCase();
    const match = normalized.match(/^(\d+)\s*(day|days|week|weeks|month|months|year|years)$/);
    if(!match) {
        throw new Error(`Invalid lookback "${value}". Use values like "1 day", "1 week", "3 months", or "1 year".`);
    }

    const amount = Number(match[1]);
    const unit = match[2];
    if(amount < 1) {
        throw new Error("Lookback amount must be at least 1.");
    }
    return `${amount} ${unit} ago`;
}

function parseArgs(argv: string[]): CliOptions {
    let root = process.cwd();
    let lookback = "1 week ago";
    let json = false;

    for(let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if(arg === "--help" || arg === "-h") {
            printHelp();
            process.exit(0);
        }
        if(arg === "--json") {
            json = true;
            continue;
        }
        if(arg === "--root") {
            const next = argv[i + 1];
            if(!next) {
                throw new Error("Missing value for --root.");
            }
            root = path.resolve(next);
            i += 1;
            continue;
        }
        if(arg === "--lookback") {
            const next = argv[i + 1];
            if(!next) {
                throw new Error("Missing value for --lookback.");
            }
            lookback = parseLookback(next);
            i += 1;
            continue;
        }
        throw new Error(`Unknown argument: ${arg}`);
    }

    return { root, lookback, json };
}

function toMarkdown(summary: Record<string, Record<string, string>>): string {
    const repoNames = Object.keys(summary).sort((a, b) => a.localeCompare(b));
    if(repoNames.length === 0) {
        return "# Git Worklog\n\nNo commits found in the selected lookback window.";
    }

    const lines: string[] = ["# Git Worklog"];
    for(const repoName of repoNames) {
        lines.push(`\n## ${repoName}`);
        const commitsByDate = summary[repoName];
        const dates = Object.keys(commitsByDate).sort((a, b) => b.localeCompare(a));
        for(const date of dates) {
            lines.push(`- **${date}**: ${commitsByDate[date]}`);
        }
    }
    return lines.join("\n");
}

async function main(): Promise<void> {
    const options = parseArgs(process.argv.slice(2));
    const summary = await getWeeklySummary(options.root, options.lookback);

    if(options.json) {
        console.log(JSON.stringify(summary, null, 2));
        return;
    }

    console.log(toMarkdown(summary));
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
});
