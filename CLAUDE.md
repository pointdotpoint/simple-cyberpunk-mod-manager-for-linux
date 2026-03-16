# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start Electron dev server with HMR
pnpm build            # Production build (electron-vite)
pnpm test             # Run all tests (vitest)
pnpm test -- tests/unit/database.test.ts   # Run a single test file
pnpm test:watch       # Watch mode
```

Requires `pnpm` (v10+). Archive extraction is handled by bundled dependencies (`7zip-bin` for 7z/zip/tar, `node-unrar-js` for RAR).

After install or Electron version changes, rebuild the native SQLite module:
```bash
npx @electron/rebuild -f -w better-sqlite3
```

## Architecture

Electron app with three process tiers:

```
Main Process (src/main/)          – Node.js: file I/O, SQLite, archive extraction
    ↕ IPC (ipcMain.handle / ipcRenderer.invoke)
Preload (src/preload/index.ts)    – contextBridge exposing typed ElectronAPI
    ↕ window.electronAPI
Renderer (src/renderer/src/)      – React + Zustand + Tailwind
```

Shared types live in `src/shared/types.ts` — the `ElectronAPI` interface is the contract between all three layers.

## Key Patterns

### Mod Lifecycle (staging directory pattern)
Mods are never modified in-place in the game directory. On import, files are extracted to `~/.local/share/cp2077-mod-manager/staging/<uuid>/`. Enable copies from staging → game dir. Disable removes from game dir. Staging is the source of truth.

### IPC Registration
Three handler groups registered in `src/main/index.ts` before window creation:
- `registerModHandlers()` — mods:list, mods:import, mods:enable, etc.
- `registerSettingsHandlers()` — settings:get, settings:set
- `registerGameDetectionHandlers()` — game:detect, game:browse, dialog:open-file

Progress events flow from main → renderer via `webContents.send('operation:progress', ...)`.

### Database
SQLite via better-sqlite3 (synchronous API, WAL mode). Singleton in `src/main/database/connection.ts`. All queries in `queries.ts` use snake_case SQL ↔ camelCase TypeScript conversion via row mapper functions. Foreign key CASCADE on mod_files ensures cleanup on mod deletion.

### Mod Type Detection
`detectModType()` in `src/main/services/mod-importer.ts` scans extracted file trees for marker files (.archive, init.lua, .reds, .xl, info.json+archives/, etc.) and maps to one of 8 types. Each type has a fixed deploy path pattern relative to the game root.

### Case Normalization
Directory names are lowercased on import (Linux case-sensitivity), filenames preserved. This happens in `src/main/services/case-normalizer.ts`.

### State Management
Two Zustand stores: `modStore` (mods, selection, filtering/sorting) and `settingsStore` (game directory, staging directory). Both call `window.electronAPI` methods and re-fetch after mutations.

### User Feedback
Every user-facing operation must provide clear feedback on success or failure. On failure, always show an error message with actionable suggestions on how to fix the issue. Never silently swallow errors or leave the user without indication of what happened.

## TypeScript Configuration

Composite project: `tsconfig.node.json` covers main+preload (Node APIs), `tsconfig.web.json` covers renderer (DOM+JSX). The `@/` path alias in renderer maps to `src/renderer/src/`.

## Testing

Vitest configured for Node environment. Tests use real temp directories (`fs.mkdtempSync`) and `vi.resetModules()` + `process.env.XDG_DATA_HOME` override for database isolation. Clean up temp dirs in `afterEach`.

## Formatting

Prettier: no semicolons, single quotes, trailing comma none, 100 char width.
