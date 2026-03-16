import { execFile, execFileSync } from 'child_process'
import { parseLogLevel } from './log-reader'
import type { LogFileInfo, LogLine, LogReadResult, LogSearchResult } from '../../shared/types'

function execFileAsync(
  cmd: string,
  args: string[],
  opts: { maxBuffer: number }
): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, opts, (err, stdout) => {
      if (err) reject(err)
      else resolve({ stdout })
    })
  })
}

export const JOURNAL_FILE_ID = '__journalctl__'

export const JOURNAL_FILE_INFO: LogFileInfo = {
  id: JOURNAL_FILE_ID,
  relativePath: 'journalctl',
  absolutePath: 'journalctl',
  source: 'system',
  fileName: 'journalctl',
  sizeBytes: 0,
  modifiedAt: new Date().toISOString()
}

const JOURNAL_FILTER = /cyberpunk|1091500/i
const MAX_LINES = 1000
const MAX_BUFFER = 2 * 1024 * 1024

let journalAvailable: boolean | null = null

export function isJournalAvailable(): boolean {
  if (journalAvailable !== null) return journalAvailable
  if (process.platform !== 'linux') {
    journalAvailable = false
    return false
  }
  try {
    execFileSync('which', ['journalctl'])
    journalAvailable = true
  } catch {
    journalAvailable = false
  }
  return journalAvailable
}

function parseJournalLines(output: string): LogLine[] {
  const rawLines = output.split('\n').filter((line) => line && JOURNAL_FILTER.test(line))

  // Tail truncation
  const lines = rawLines.length > MAX_LINES ? rawLines.slice(rawLines.length - MAX_LINES) : rawLines

  return lines.map((text, i) => ({
    fileId: JOURNAL_FILE_ID,
    lineNumber: i + 1,
    text,
    level: parseLogLevel(text),
    source: 'system' as const,
    fileName: 'journalctl'
  }))
}

export async function readJournalLogs(): Promise<LogReadResult> {
  try {
    const { stdout } = await execFileAsync('journalctl', ['--since', '1 hour ago', '--no-pager'], {
      maxBuffer: MAX_BUFFER
    })

    const lines = parseJournalLines(stdout)

    return {
      fileId: JOURNAL_FILE_ID,
      fileName: 'journalctl',
      source: 'system',
      lines,
      totalLines: lines.length,
      truncated: lines.length >= MAX_LINES
    }
  } catch (err) {
    console.warn('journalctl read failed:', err)
    return {
      fileId: JOURNAL_FILE_ID,
      fileName: 'journalctl',
      source: 'system',
      lines: [],
      totalLines: 0,
      truncated: false
    }
  }
}

export async function searchJournalLogs(pattern: string): Promise<LogSearchResult | null> {
  let regex: RegExp
  try {
    regex = new RegExp(pattern, 'i')
  } catch {
    return null
  }

  const result = await readJournalLogs()
  const matches = result.lines.filter((line) => regex.test(line.text))

  if (matches.length === 0) return null

  return {
    fileId: JOURNAL_FILE_ID,
    fileName: 'journalctl',
    matches,
    matchCount: matches.length
  }
}
