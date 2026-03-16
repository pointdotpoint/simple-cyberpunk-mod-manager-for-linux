import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { scanLogFiles, readLogTail, searchLogFiles, parseLogLevel } from '../../src/main/services/log-reader'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-reader-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function writeLog(relativePath: string, content: string): void {
  const full = path.join(tmpDir, relativePath)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
}

describe('log-reader', () => {
  describe('parseLogLevel', () => {
    it('detects error levels', () => {
      expect(parseLogLevel('[ERROR] something broke')).toBe('error')
      expect(parseLogLevel('FATAL: crash')).toBe('error')
      expect(parseLogLevel('Exception in thread')).toBe('error')
      expect(parseLogLevel('PANIC at the disco')).toBe('error')
    })

    it('detects warn levels', () => {
      expect(parseLogLevel('[WARN] low memory')).toBe('warn')
      expect(parseLogLevel('WARNING: deprecated')).toBe('warn')
    })

    it('detects info level', () => {
      expect(parseLogLevel('[INFO] started')).toBe('info')
    })

    it('detects debug level', () => {
      expect(parseLogLevel('[DEBUG] var=123')).toBe('debug')
      expect(parseLogLevel('TRACE: entering func')).toBe('debug')
    })

    it('returns null for unknown levels', () => {
      expect(parseLogLevel('just a regular line')).toBeNull()
    })
  })

  describe('scanLogFiles', () => {
    it('discovers CET logs', () => {
      writeLog('bin/x64/plugins/cyber_engine_tweaks/logs/cet.log', 'hello')

      const files = scanLogFiles(tmpDir)
      expect(files).toHaveLength(1)
      expect(files[0].source).toBe('cet')
      expect(files[0].fileName).toBe('cet.log')
    })

    it('discovers RED4ext logs', () => {
      writeLog('red4ext/logs/red4ext.log', 'hello')

      const files = scanLogFiles(tmpDir)
      expect(files).toHaveLength(1)
      expect(files[0].source).toBe('red4ext')
      expect(files[0].fileName).toBe('red4ext.log')
    })

    it('discovers root-level game logs', () => {
      writeLog('game.log', 'hello')

      const files = scanLogFiles(tmpDir)
      expect(files).toHaveLength(1)
      expect(files[0].source).toBe('game')
      expect(files[0].fileName).toBe('game.log')
    })

    it('ignores non-log files', () => {
      writeLog('bin/x64/plugins/cyber_engine_tweaks/logs/readme.txt', 'not a log')
      writeLog('some_file.txt', 'not a log')

      const files = scanLogFiles(tmpDir)
      expect(files).toHaveLength(0)
    })

    it('discovers nested log files in log directories', () => {
      writeLog('bin/x64/plugins/cyber_engine_tweaks/logs/sub/nested.log', 'hello')

      const files = scanLogFiles(tmpDir)
      expect(files).toHaveLength(1)
      expect(files[0].fileName).toBe('nested.log')
    })

    it('returns empty array for missing game dir', () => {
      const files = scanLogFiles('/nonexistent/path')
      expect(files).toHaveLength(0)
    })

    it('generates stable ids from relative paths', () => {
      writeLog('game.log', 'hello')

      const files1 = scanLogFiles(tmpDir)
      const files2 = scanLogFiles(tmpDir)
      expect(files1[0].id).toBe(files2[0].id)
    })
  })

  describe('readLogTail', () => {
    it('reads all lines from small files', () => {
      const logPath = path.join(tmpDir, 'test.log')
      fs.writeFileSync(logPath, '[INFO] line 1\n[ERROR] line 2\n[WARN] line 3\n')

      const result = readLogTail(logPath, 'test-id', 'game', 'test.log')
      expect(result.lines).toHaveLength(3)
      expect(result.truncated).toBe(false)
      expect(result.lines[0].level).toBe('info')
      expect(result.lines[1].level).toBe('error')
      expect(result.lines[2].level).toBe('warn')
    })

    it('respects maxLines parameter', () => {
      const logPath = path.join(tmpDir, 'test.log')
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join('\n') + '\n'
      fs.writeFileSync(logPath, lines)

      const result = readLogTail(logPath, 'test-id', 'game', 'test.log', 10)
      expect(result.lines).toHaveLength(10)
      expect(result.truncated).toBe(true)
      // Should return the last 10 lines
      expect(result.lines[0].text).toBe('line 91')
    })

    it('returns empty result for missing file', () => {
      const result = readLogTail('/nonexistent/file.log', 'test-id', 'game', 'file.log')
      expect(result.lines).toHaveLength(0)
      expect(result.totalLines).toBe(0)
    })
  })

  describe('searchLogFiles', () => {
    it('finds matching lines across files', () => {
      writeLog('game.log', '[ERROR] crash\n[INFO] ok\n')
      writeLog('red4ext/logs/r4e.log', '[ERROR] also broke\n[INFO] fine\n')

      const results = searchLogFiles(tmpDir, 'ERROR', null)
      const allMatches = results.flatMap((r) => r.matches)
      expect(allMatches).toHaveLength(2)
    })

    it('filters by source', () => {
      writeLog('game.log', '[ERROR] crash\n')
      writeLog('red4ext/logs/r4e.log', '[ERROR] also broke\n')

      const results = searchLogFiles(tmpDir, 'ERROR', 'game')
      const allMatches = results.flatMap((r) => r.matches)
      expect(allMatches).toHaveLength(1)
      expect(allMatches[0].source).toBe('game')
    })

    it('returns empty for invalid regex', () => {
      writeLog('game.log', '[ERROR] crash\n')

      const results = searchLogFiles(tmpDir, '[invalid', null)
      expect(results).toHaveLength(0)
    })

    it('is case insensitive', () => {
      writeLog('game.log', 'error happened\nERROR HAPPENED\n')

      const results = searchLogFiles(tmpDir, 'error', null)
      expect(results[0].matchCount).toBe(2)
    })
  })
})
