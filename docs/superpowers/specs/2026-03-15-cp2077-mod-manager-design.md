# CP2077 Mod Manager — Design Spec

## Overview

A desktop mod manager for Cyberpunk 2077, built as an Electron app with React + TypeScript. Linux-first with future Windows support. Manages the full mod lifecycle: import, enable/disable, and delete.

## Problem

Managing CP2077 mods on Linux is painful. Existing tools (Vortex, MO2) are Windows-first and fragile under Wine/Proton. Manual installation requires knowing multiple directory structures for different mod types, dealing with case-sensitivity issues, and tracking what's installed by hand.

## Architecture

### Monolithic Electron App

Single Electron application with two processes:

- **Main process**: All file system operations, SQLite database, game detection, archive extraction. Exposes operations to renderer via IPC.
- **Renderer process**: React UI. Communicates with main process exclusively through `contextBridge`-exposed IPC channels.

### Data Storage

| What | Where |
|------|-------|
| Settings/config | `$XDG_CONFIG_HOME/cp2077-mod-manager/` (defaults to `~/.config/`) |
| Mod database | `$XDG_DATA_HOME/cp2077-mod-manager/mods.db` (defaults to `~/.local/share/`) |
| Staging directory | `$XDG_DATA_HOME/cp2077-mod-manager/staging/<mod-id>/` |
| Deployed mods | Game directory (various subdirs depending on mod type) |

The staging directory is the **source of truth** for mod files. The game directory contains copies of enabled mods only.

### Build Tooling

- `electron-vite` for dev server, HMR, and production builds
- `pnpm` as package manager

## Mod Types and Deployment Paths

When a mod is enabled, its files are copied from staging to the appropriate game directory location:

| Mod Type | Detection Rule | Game Directory Target |
|----------|---------------|----------------------|
| Archive (legacy) | Contains `.archive` files | `archive/pc/mod/` |
| REDmod | Contains `info.json` with REDmod structure | `mods/<modname>/` |
| CET | Contains `init.lua` | `bin/x64/plugins/cyber_engine_tweaks/mods/<modname>/` |
| REDscript | Contains `.reds` files | `r6/scripts/<modname>/` |
| TweakXL | Contains `.xl` or `.yaml`/`.tweak` in tweak paths | `r6/tweaks/` |
| Red4ext | Contains `.dll` plugin files | `red4ext/plugins/<modname>/` |
| Mixed/Unknown | Multiple types detected or unrecognizable | User chooses target or raw file tree preserved |

### Mod Type Detection Algorithm

1. Extract archive to temp directory
2. Scan file tree for marker files/patterns
3. **REDmod check**: `info.json` at root must contain `name` field AND an `archives/` subdirectory alongside it
4. **Archive check**: `.archive` files present in tree
5. **CET check**: `init.lua` found (typically under a mod-named directory)
6. **REDscript check**: `.reds` files present
7. **TweakXL check**: `.xl` files present, OR `.yaml`/`.tweak` files under a path containing `r6/tweaks/`
8. **Red4ext check**: `.dll` files under a `red4ext/plugins/` path in the archive
9. If single type detected → assign that type
10. If multiple types detected → classify as "mixed" and preserve original directory structure
11. If no type detected → classify as "unknown", deploy preserving original directory structure relative to game root

**Note on mixed/unknown**: For MVP, mixed and unknown mods are deployed by preserving the archive's directory structure relative to the game root. No manual mapping UI is needed — the assumption is that well-structured mod archives already mirror the game directory layout.

## Mod Lifecycle

### Import

1. User selects or drops an archive file (.zip, .7z, .rar)
2. Extract to temp directory
3. Run mod type detection
4. Normalize file paths for case sensitivity (Linux)
5. Move extracted files to `staging/<generated-uuid>/`
6. Create database record with: id, name (from filename), type, import date, file size, status=disabled, file manifest

### Enable

1. Read mod's file manifest from DB
2. Check for file conflicts: query `mod_files` table for any other enabled mod with overlapping `deploy_path`. If conflicts exist, warn the user and list which mods conflict. User can choose to proceed (overwrite) or cancel.
3. Copy all files from `staging/<mod-id>/` to appropriate game directory paths. If any copy fails, roll back all files already copied in this operation and report the error.
4. Update DB status to "enabled" and record deployed file paths only after all copies succeed

### Disable

1. Read deployed file paths from DB
2. Remove each deployed file from game directory
3. Clean up empty directories left behind
4. Update DB status to "disabled"
5. Staging files remain untouched

### Delete

1. If enabled, run disable flow first
2. Remove `staging/<mod-id>/` directory
3. Remove DB record

## Database Schema

```sql
CREATE TABLE mods (
  id TEXT PRIMARY KEY,           -- UUID
  name TEXT NOT NULL,            -- Display name (editable)
  type TEXT NOT NULL,            -- archive|redmod|cet|redscript|tweakxl|red4ext|mixed|unknown
  status TEXT NOT NULL DEFAULT 'disabled',  -- enabled|disabled
  source_archive TEXT,           -- Original archive filename
  file_size INTEGER,             -- Total size in bytes
  file_count INTEGER,            -- Number of files
  imported_at TEXT NOT NULL,     -- ISO 8601 timestamp
  updated_at TEXT NOT NULL       -- ISO 8601 timestamp
);

CREATE TABLE mod_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mod_id TEXT NOT NULL REFERENCES mods(id) ON DELETE CASCADE,
  staging_path TEXT NOT NULL,    -- Relative path within staging/<mod-id>/
  deploy_path TEXT,              -- Relative path within game directory (null if not deployed)
  file_hash TEXT                 -- SHA-256 for integrity checking
);

CREATE INDEX idx_mod_files_deploy_path ON mod_files(deploy_path);
-- Used for conflict detection: find if another enabled mod deploys to the same path

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Expected keys: game_directory, staging_directory
```

## Game Directory Detection

### Linux
1. Parse `~/.steam/steam/libraryfolders.vdf` to find all Steam library paths
2. Check each for `steamapps/common/Cyberpunk 2077/`
3. Verify by checking for `bin/x64/Cyberpunk2077.exe`

### Windows (future)
1. Read Steam install path from registry
2. Parse `libraryfolders.vdf` similarly
3. Check for GOG installation via registry

### Fallback
Manual directory picker if auto-detection fails.

## Case Sensitivity Handling (Linux)

Mod authors develop on Windows (case-insensitive). On Linux, `Archive/PC/Mod/` and `archive/pc/mod/` are different directories.

**Strategy**: On import, normalize **directory names** in deployment paths to lowercase (e.g., `Archive/PC/Mod/` → `archive/pc/mod/`). **Filenames are preserved as-is** to avoid breaking case-sensitive references in Lua/REDscript code (e.g., `require("MyModule")` expects `MyModule.lua`). The game's directory structure uses lowercase directories, and Proton handles file access case-insensitively, so this is safe.

## Progress Feedback

Long-running operations (archive extraction, file deployment for large mods) send progress events from main to renderer via IPC. The renderer shows a progress bar overlay during import and enable/disable operations. IPC pattern: main process emits `operation:progress` events with `{ operation, current, total, label }`.

## UI Design

### Main Window

Dark theme with cyberpunk aesthetic (neon accents on dark background).

**Layout:**
- Top bar: App title, settings gear icon
- Main area: Mod list table
- Bottom bar: Status info (game directory, mod count)

### Mod List Table

Columns: Enable toggle | Mod name | Type (badge) | Size | Date imported

Features:
- Click row to select, shift/ctrl for multi-select
- Right-click context menu: Enable, Disable, Delete, Open in file manager
- Search/filter bar above table
- Sort by any column
- Bulk actions toolbar appears when multiple selected

### Import

- Drag-and-drop zone overlay (appears when dragging files over window)
- "Import Mod" button in toolbar opens file picker
- Import dialog shows: detected mod type, file count, size, confirmation button

### Settings View

- Game directory: text field + browse button + auto-detect button
- Displays detection status (found/not found)

## Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Shell | Electron | Cross-platform desktop app, mature ecosystem |
| Build tool | electron-vite | Fast HMR, good Electron integration |
| Frontend | React 18+ TypeScript | Large ecosystem, well-known |
| Styling | Tailwind CSS | Utility-first, easy dark theme, fast iteration |
| State | Zustand | Minimal boilerplate, good TypeScript support |
| Database | better-sqlite3 | Synchronous SQLite for Node.js, fast, reliable |
| Archives | node-7z | Wraps 7-Zip CLI, handles .zip/.7z/.rar. Requires `7z` binary — app checks at startup and shows install instructions if missing |
| IPC | Electron contextBridge | Secure renderer-to-main communication |
| Testing | Vitest + Playwright | Unit tests + E2E tests |
| Linting | ESLint + Prettier | Code quality |
| Package mgr | pnpm | Fast, disk-efficient |

## Project Structure

```
cp2077-mod-manager/
├── electron.vite.config.ts
├── package.json
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # App entry, window creation
│   │   ├── ipc/                 # IPC handlers
│   │   │   ├── mods.ts          # Mod CRUD operations
│   │   │   ├── settings.ts      # Settings operations
│   │   │   └── game-detection.ts
│   │   ├── database/
│   │   │   ├── connection.ts    # SQLite connection + migrations
│   │   │   └── queries.ts       # Typed query functions
│   │   ├── services/
│   │   │   ├── mod-importer.ts  # Archive extraction + type detection
│   │   │   ├── mod-deployer.ts  # Enable/disable (staging <-> game dir)
│   │   │   ├── game-finder.ts   # Steam library scanning
│   │   │   └── case-normalizer.ts
│   │   └── preload.ts           # contextBridge API
│   ├── renderer/                # React app
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ModList.tsx
│   │   │   ├── ModRow.tsx
│   │   │   ├── ImportDialog.tsx
│   │   │   ├── SettingsView.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── Layout.tsx
│   │   ├── stores/
│   │   │   ├── modStore.ts      # Zustand store for mod state
│   │   │   └── settingsStore.ts
│   │   ├── hooks/
│   │   │   └── useIpc.ts        # Typed IPC call wrapper
│   │   └── styles/
│   │       └── globals.css      # Tailwind imports + custom theme
│   └── shared/                  # Types shared between main/renderer
│       └── types.ts
├── resources/                   # App icons, assets
├── tests/
│   ├── unit/
│   └── e2e/
└── tailwind.config.ts
```

## MVP Scope

### In Scope
- Import mods from .zip/.7z/.rar archives
- Auto-detect mod type from file contents
- List all managed mods with type, status, size, date
- Enable/disable mods (copy to/remove from game directory)
- Delete mods (remove from staging + game directory)
- Bulk enable/disable/delete
- Search and filter mod list
- Auto-detect CP2077 game directory from Steam libraries
- Manual game directory selection
- Case-sensitivity normalization on Linux
- Dark cyberpunk-themed UI

### Out of Scope (Future)
- NexusMods API integration (browse/download/update)
- Load order management
- Conflict detection between mods
- Dependency tracking
- REDmod deployment step
- Mod profiles/presets
- Mod update checking
- GOG support
- Windows build (architecture supports it, just not tested/packaged yet)

## Verification

1. **Build**: `pnpm dev` starts the app with HMR
2. **Import test**: Drop a known CP2077 mod archive → verify correct type detection and staging
3. **Enable test**: Enable a mod → verify files appear in game directory at correct paths
4. **Disable test**: Disable → verify files removed from game directory, staging intact
5. **Delete test**: Delete → verify staging and DB cleaned up
6. **Game detection test**: Verify Steam library scanning finds CP2077 installation
7. **Case test**: Import a mod with mixed-case paths → verify normalization to lowercase
8. **Unit tests**: `pnpm test` runs Vitest suite
9. **E2E tests**: `pnpm test:e2e` runs Playwright against the app
