# Chess Table

A local two-player chess game built as a static browser app.

## Run

```powershell
$node = "C:\Users\acest\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
& $node .\server.mjs 4173
```

Then open `http://localhost:4173`.

## Test

```powershell
$node = "C:\Users\acest\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
& $node .\tests\rules-smoke.mjs
```

## Features

- Legal chess moves through `chess.js`
- Check, checkmate, stalemate, draws, castling, en passant, and promotion
- Online host/join rooms with 5-number codes
- Dark game-style start menu with Online, Offline, BOT, and Settings
- Bot mode with selectable difficulty
- Optional move sounds and configurable clocks
- Click or drag moves
- Move history, captured pieces, material balance, FEN copy, undo, clocks, and board flip

## Online Play

Click `Online`, then `Host` to create a room code. The second player clicks `Online`, then `Join`, enters the 5-number code, and joins as Black.

## GitHub Pages

This repo is ready for GitHub Pages. Publish from the `main` branch and `/ (root)` folder in the repository Pages settings.

Offline, BOT, and Online mode work on GitHub Pages. The Pages version uses browser-to-browser rooms through PeerJS so players can host or join with a 5-number code without a custom backend.
