// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as gitActions from './git_actions';

function toMarkdown(summary: Record<string, Record<string, string>>): string {
	const repoNames = Object.keys(summary).sort((a, b) => a.localeCompare(b));
	if (repoNames.length === 0) {
		return '# Git Worklog\n\nNo commits found in the selected lookback window.';
	}

	const lines: string[] = ['# Git Worklog'];
	for (const repoName of repoNames) {
		lines.push(`\n## ${repoName}`);
		const commitsByDate = summary[repoName];
		const dates = Object.keys(commitsByDate).sort((a, b) => b.localeCompare(a));
		for (const date of dates) {
			lines.push(`- **${date}**: ${commitsByDate[date]}`);
		}
	}
	return lines.join('\n');
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Git Worklog extension is now active.');

	const outputChannel = vscode.window.createOutputChannel('Git Worklog');
	const runWorklog = async () => {
		try {
			const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
			if (!workspaceRoot) {
				vscode.window.showInformationMessage('Open a folder/workspace first, then run Git Worklog: Generate.');
				return;
			}

			const summary = await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Generating git worklog...',
					cancellable: false
				},
				async () => gitActions.getWeeklySummary(workspaceRoot)
			);

			const markdown = toMarkdown(summary);
			outputChannel.clear();
			outputChannel.appendLine(markdown);
			outputChannel.show(true);
			const action = await vscode.window.showInformationMessage(
				'Git worklog generated in Output panel.',
				'Copy Worklog'
			);
			if (action === 'Copy Worklog') {
				await vscode.env.clipboard.writeText(markdown);
				vscode.window.showInformationMessage('Git worklog copied to clipboard.');
			}
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to generate summary: ${error?.message ?? String(error)}`);
		}
	};
	const disposable = vscode.commands.registerCommand('git-worklog.generate', runWorklog);
	const weeklyAliasDisposable = vscode.commands.registerCommand('git-worklog.generateWeekly', runWorklog);

	context.subscriptions.push(disposable, weeklyAliasDisposable, outputChannel);
}

// This method is called when your extension is deactivated
export function deactivate() {}
