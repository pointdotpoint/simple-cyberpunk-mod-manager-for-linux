# Simple Cyberpunk Mod Manager for Linux

A lightweight desktop mod manager for **Cyberpunk 2077** on Linux. Built with Electron, React, and TypeScript.

Mods are managed through a **staging directory pattern** — archives are extracted to a staging area, and enabling/disabling a mod copies or removes files from the game directory. The game folder is never modified destructively.

## Features

- Import mods from `.zip`, `.7z`, and `.rar` archives
- Automatic mod type detection (Archive, REDmod, CET, REDscript, TweakXL, RED4ext, mixed)
- Enable/disable mods without re-extracting
- Bulk enable, disable, and delete operations
- File conflict detection when enabling mods
- Scan game directory for existing (manually installed) mods
- Nexus Mods download integration
- Auto-detect Cyberpunk 2077 install location (Steam, GOG, Heroic, Lutris)
- Search and filter mod list by name, type, or status
- Progress feedback for long-running operations
- SQLite database for mod metadata and file tracking

## Requirements

- Linux (built for case-sensitive filesystems)
- [pnpm](https://pnpm.io/) v10+
- Node.js 20+
- `7z` (p7zip) installed and available on `$PATH`

## Getting Started

```bash
# Install dependencies
pnpm install

# Rebuild native SQLite module for Electron
npx @electron/rebuild -f -w better-sqlite3

# Start development server with hot reload
pnpm dev
```

## Build

```bash
pnpm build
```

## Testing

```bash
pnpm test             # Run all tests
pnpm test:watch       # Watch mode
```

## Architecture

```
Main Process (src/main/)        — Node.js: file I/O, SQLite, archive extraction
    ↕ IPC
Preload (src/preload/)          — contextBridge exposing typed ElectronAPI
    ↕ window.electronAPI
Renderer (src/renderer/src/)    — React + Zustand + Tailwind CSS
```

Shared type definitions in `src/shared/types.ts` serve as the contract between all three layers.

### How Mods Work

1. **Import** — Archive is extracted to `~/.local/share/cp2077-mod-manager/staging/<uuid>/`
2. **Detect** — File tree is scanned for marker files to determine mod type and deploy paths
3. **Enable** — Files are copied from staging to the appropriate subdirectory in the game folder
4. **Disable** — Deployed files are removed from the game folder; staging copy is untouched

## Tech Stack

- **Electron** — Desktop shell
- **electron-vite** — Build tooling with HMR
- **React 19** — UI
- **Zustand** — State management
- **Tailwind CSS** — Styling
- **better-sqlite3** — Mod metadata database (WAL mode)
- **node-7z** — Archive extraction
- **Vitest** — Testing
