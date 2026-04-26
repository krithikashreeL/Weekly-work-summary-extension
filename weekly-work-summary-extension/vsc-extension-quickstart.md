# Weekly Work Summary Extension

## Run locally

1. Install Node.js 18+ (includes `npm`).
2. In this folder run:
   - `npm install`
   - `npm run compile`
3. Open this folder in VS Code.
4. Press `F5` to launch the Extension Development Host.
5. In the host, run command: `Weekly Work Summary: Generate from Git Log`.

## Package as .vsix

1. Install VSCE once: `npm install -g @vscode/vsce`
2. Run:
   - `npm install`
   - `npm run compile`
   - `npm run package`
