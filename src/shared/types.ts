// Log types
export type LogSource = 'cet' | 'red4ext' | 'game' | 'system' | 'other'
export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

export interface LogFileInfo {
  id: string
  relativePath: string
  absolutePath: string
  source: LogSource
  fileName: string
  sizeBytes: number
  modifiedAt: string
}

export interface LogLine {
  fileId: string
  lineNumber: number
  text: string
  level: LogLevel | null
  source: LogSource
  fileName: string
}

export interface LogReadResult {
  fileId: string
  fileName: string
  source: LogSource
  lines: LogLine[]
  totalLines: number
  truncated: boolean
}

export interface LogSearchResult {
  fileId: string
  fileName: string
  matches: LogLine[]
  matchCount: number
}

export interface LogUpdateEvent {
  fileId: string
  newLines: LogLine[]
}

// Mod types
export type ModType =
  | 'archive'
  | 'redmod'
  | 'cet'
  | 'redscript'
  | 'tweakxl'
  | 'red4ext'
  | 'mixed'
  | 'unknown'

export type ModStatus = 'enabled' | 'disabled'

export type ModSource = 'imported' | 'scanned'

export interface Mod {
  id: string // UUID
  name: string // Display name
  type: ModType
  status: ModStatus
  source: ModSource
  sourceArchive: string | null // Original archive filename
  fileSize: number | null // Total size in bytes
  fileCount: number | null // Number of files
  importedAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

export interface ModFile {
  id: number
  modId: string
  stagingPath: string // Relative path within staging/<mod-id>/
  deployPath: string | null // Relative path within game directory
  fileHash: string | null // SHA-256
}

export interface Settings {
  gameDirectory: string | null
  stagingDirectory: string
}

// IPC types
export interface OperationProgress {
  operation: string
  current: number
  total: number
  label: string
}

export interface ConflictInfo {
  modId: string
  modName: string
  conflictingFiles: string[]
}

export interface ImportResult {
  mod: Mod
  files: ModFile[]
}

export interface EnableResult {
  success: boolean
  conflicts?: ConflictInfo[]
}

export interface ScanResult {
  discovered: number
  skipped: number
  errors: string[]
}

// IPC API exposed via contextBridge
export interface ElectronAPI {
  getPathForFile(file: File): string
  listMods(): Promise<Mod[]>
  importMod(archivePath: string): Promise<ImportResult>
  enableMod(id: string): Promise<EnableResult>
  enableModForce(id: string): Promise<void>
  disableMod(id: string): Promise<void>
  deleteMod(id: string): Promise<void>
  bulkEnable(ids: string[]): Promise<EnableResult[]>
  bulkDisable(ids: string[]): Promise<void>
  bulkDelete(ids: string[]): Promise<void>
  getSettings(): Promise<Settings>
  setSetting(key: string, value: string): Promise<void>
  detectGame(): Promise<string | null>
  browseDirectory(): Promise<string | null>
  onProgress(callback: (progress: OperationProgress) => void): () => void
  scanMods(): Promise<ScanResult>
  openFileDialog(
    filters?: { name: string; extensions: string[] }[]
  ): Promise<string | null>
  nexusDownload(url: string): Promise<ImportResult>
  scanLogs(): Promise<LogFileInfo[]>
  readLogs(fileId: string | null, tail: number): Promise<LogReadResult[]>
  searchLogs(pattern: string, sourceFilter: LogSource | null): Promise<LogSearchResult[]>
  startLogWatch(): Promise<void>
  stopLogWatch(): Promise<void>
  onLogUpdate(callback: (event: LogUpdateEvent) => void): () => void
}
