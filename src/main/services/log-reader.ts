import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import type { LogFileInfo, LogLine, LogReadResult, LogSearchResult, LogSource } from '../../shared/types'

const LOG_DIRS: { dir: string; source: LogSource }[] = [
  { dir: 'bin/x64/plugins/cyber_engine_tweaks/logs', source: 'cet' },
  { dir: 'red4ext/logs', source: 'red4ext' }
]

const MAX_READ_BYTES = 1024 * 1024 // 1MB
const MAX_SEARCH_MATCHES = 500

function fileIdFromPath(relativePath: string): string {
  return crypto.createHash('sha1').update(relativePath).digest('hex').slice(0, 12)
}

export function parseLogLevel(text: string): LogLine['level'] {
  if (/\b(ERROR|FATAL|EXCEPTION|PANIC)\b/i.test(text)) return 'error'
  if (/\b(WARN|WARNING)\b/i.test(text)) return 'warn'
  if (/\b(DEBUG|TRACE|VERBOSE)\b/i.test(text)) return 'debug'
  if (/\b(INFO)\b/i.test(text)) return 'info'
  return null
}

function collectLogFiles(dirPath: string, source: LogSource, gameDir: string): LogFileInfo[] {
  const results: LogFileInfo[] = []
  if (!fs.existsSync(dirPath)) return results

  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isFile() && entry.name.endsWith('.log')) {
      const stat = fs.statSync(fullPath)
      const relativePath = path.relative(gameDir, fullPath)
      results.push({
        id: fileIdFromPath(relativePath),
        relativePath,
        absolutePath: fullPath,
        source,
        fileName: entry.name,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString()
      })
    } else if (entry.isDirectory()) {
      results.push(...collectLogFiles(fullPath, source, gameDir))
    }
  }
  return results
}

export function scanLogFiles(gameDir: string): LogFileInfo[] {
  const results: LogFileInfo[] = []

  // Known log directories
  for (const { dir, source } of LOG_DIRS) {
    const fullDir = path.join(gameDir, dir)
    results.push(...collectLogFiles(fullDir, source, gameDir))
  }

  // Root-level *.log files
  try {
    const rootEntries = fs.readdirSync(gameDir, { withFileTypes: true })
    for (const entry of rootEntries) {
      if (entry.isFile() && entry.name.endsWith('.log')) {
        const fullPath = path.join(gameDir, entry.name)
        const stat = fs.statSync(fullPath)
        results.push({
          id: fileIdFromPath(entry.name),
          relativePath: entry.name,
          absolutePath: fullPath,
          source: 'game',
          fileName: entry.name,
          sizeBytes: stat.size,
          modifiedAt: stat.mtime.toISOString()
        })
      }
    }
  } catch {
    // Game dir might not exist
  }

  return results
}

function parseLines(
  content: string,
  fileId: string,
  source: LogSource,
  fileName: string,
  startLine: number
): LogLine[] {
  const rawLines = content.split('\n')
  // Remove trailing empty line from split
  if (rawLines.length > 0 && rawLines[rawLines.length - 1] === '') {
    rawLines.pop()
  }
  return rawLines.map((text, i) => ({
    fileId,
    lineNumber: startLine + i,
    text,
    level: parseLogLevel(text),
    source,
    fileName
  }))
}

export function readLogTail(
  absolutePath: string,
  fileId: string,
  source: LogSource,
  fileName: string,
  maxLines: number = 1000
): LogReadResult {
  let stat: fs.Stats
  try {
    stat = fs.statSync(absolutePath)
  } catch {
    return { fileId, fileName, source, lines: [], totalLines: 0, truncated: false }
  }

  let content: string
  let truncated = false

  if (stat.size <= MAX_READ_BYTES) {
    content = fs.readFileSync(absolutePath, 'utf-8')
  } else {
    // Read last 1MB
    const fd = fs.openSync(absolutePath, 'r')
    const buffer = Buffer.alloc(MAX_READ_BYTES)
    fs.readSync(fd, buffer, 0, MAX_READ_BYTES, stat.size - MAX_READ_BYTES)
    fs.closeSync(fd)
    content = buffer.toString('utf-8')
    // Drop partial first line
    const firstNewline = content.indexOf('\n')
    if (firstNewline !== -1) {
      content = content.slice(firstNewline + 1)
    }
    truncated = true
  }

  const totalLines = content.split('\n').length
  const allLines = parseLines(content, fileId, source, fileName, 1)

  let lines: LogLine[]
  if (allLines.length > maxLines) {
    lines = allLines.slice(allLines.length - maxLines)
    truncated = true
  } else {
    lines = allLines
  }

  return { fileId, fileName, source, lines, totalLines, truncated }
}

export function searchLogFiles(
  gameDir: string,
  pattern: string,
  sourceFilter: LogSource | null
): LogSearchResult[] {
  let regex: RegExp
  try {
    regex = new RegExp(pattern, 'i')
  } catch {
    return []
  }

  let files = scanLogFiles(gameDir)
  if (sourceFilter) {
    files = files.filter((f) => f.source === sourceFilter)
  }

  const results: LogSearchResult[] = []
  let totalMatches = 0

  for (const file of files) {
    if (totalMatches >= MAX_SEARCH_MATCHES) break

    let content: string
    try {
      const stat = fs.statSync(file.absolutePath)
      if (stat.size > MAX_READ_BYTES) {
        const fd = fs.openSync(file.absolutePath, 'r')
        const buffer = Buffer.alloc(MAX_READ_BYTES)
        fs.readSync(fd, buffer, 0, MAX_READ_BYTES, stat.size - MAX_READ_BYTES)
        fs.closeSync(fd)
        content = buffer.toString('utf-8')
      } else {
        content = fs.readFileSync(file.absolutePath, 'utf-8')
      }
    } catch {
      continue
    }

    const lines = content.split('\n')
    const matches: LogLine[] = []

    for (let i = 0; i < lines.length; i++) {
      if (totalMatches >= MAX_SEARCH_MATCHES) break
      if (regex.test(lines[i])) {
        matches.push({
          fileId: file.id,
          lineNumber: i + 1,
          text: lines[i],
          level: parseLogLevel(lines[i]),
          source: file.source,
          fileName: file.fileName
        })
        totalMatches++
      }
    }

    if (matches.length > 0) {
      results.push({
        fileId: file.id,
        fileName: file.fileName,
        matches,
        matchCount: matches.length
      })
    }
  }

  return results
}
