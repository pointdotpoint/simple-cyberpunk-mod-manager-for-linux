import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as childProcess from 'child_process'

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
  execFile: vi.fn()
}))

const SAMPLE_JOURNAL = [
  'Mar 15 10:00:01 host kernel: normal system message',
  'Mar 15 10:01:00 host kernel: cyberpunk[12345]: segfault at 0x0',
  'Mar 15 10:01:01 host kernel: Out of memory: Killed process 12345 (cyberpunk)',
  'Mar 15 10:02:00 host proton: [1091500] wine: Unhandled exception',
  'Mar 15 10:03:00 host systemd[1]: Started timer',
  'Mar 15 10:04:00 host kernel: [ERROR] cyberpunk crashed badly'
].join('\n')

function mockExecFileSuccess(output: string): void {
  vi.mocked(childProcess.execFile).mockImplementation(
    (_cmd: any, _args: any, _opts: any, callback: any) => {
      callback(null, output, '')
      return {} as any
    }
  )
}

function mockExecFileFailure(error: Error): void {
  vi.mocked(childProcess.execFile).mockImplementation(
    (_cmd: any, _args: any, _opts: any, callback: any) => {
      callback(error, '', '')
      return {} as any
    }
  )
}

describe('journal-reader', () => {
  let originalPlatform: string

  beforeEach(() => {
    vi.resetModules()
    vi.mocked(childProcess.execFileSync).mockReset()
    vi.mocked(childProcess.execFile).mockReset()
    originalPlatform = process.platform
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  describe('isJournalAvailable', () => {
    it('returns false on non-Linux platforms', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      const { isJournalAvailable } = await import('../../src/main/services/journal-reader')
      expect(isJournalAvailable()).toBe(false)
    })

    it('returns true when journalctl is found on Linux', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
      vi.mocked(childProcess.execFileSync).mockReturnValue(Buffer.from('/usr/bin/journalctl\n'))
      const { isJournalAvailable } = await import('../../src/main/services/journal-reader')
      expect(isJournalAvailable()).toBe(true)
    })

    it('returns false when journalctl is not found on Linux', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
      vi.mocked(childProcess.execFileSync).mockImplementation(() => {
        throw new Error('not found')
      })
      const { isJournalAvailable } = await import('../../src/main/services/journal-reader')
      expect(isJournalAvailable()).toBe(false)
    })

    it('caches the result', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
      vi.mocked(childProcess.execFileSync).mockReturnValue(Buffer.from('/usr/bin/journalctl\n'))
      const { isJournalAvailable } = await import('../../src/main/services/journal-reader')
      isJournalAvailable()
      isJournalAvailable()
      isJournalAvailable()
      // Only called once despite 3 invocations — result is cached
      expect(childProcess.execFileSync).toHaveBeenCalledTimes(1)
    })
  })

  describe('readJournalLogs', () => {
    it('filters lines matching cyberpunk or 1091500', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
      vi.mocked(childProcess.execFileSync).mockReturnValue(Buffer.from('/usr/bin/journalctl\n'))
      mockExecFileSuccess(SAMPLE_JOURNAL)

      const { readJournalLogs } = await import('../../src/main/services/journal-reader')
      const result = await readJournalLogs()

      expect(result.lines).toHaveLength(4)
      expect(result.lines[0].text).toContain('cyberpunk')
      expect(result.lines[2].text).toContain('1091500')
      expect(result.source).toBe('system')
      expect(result.fileId).toBe('__journalctl__')
    })

    it('applies parseLogLevel to journal lines', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
      vi.mocked(childProcess.execFileSync).mockReturnValue(Buffer.from('/usr/bin/journalctl\n'))
      mockExecFileSuccess(SAMPLE_JOURNAL)

      const { readJournalLogs } = await import('../../src/main/services/journal-reader')
      const result = await readJournalLogs()

      const errorLine = result.lines.find((l) => l.text.includes('[ERROR]'))
      expect(errorLine?.level).toBe('error')
    })

    it('returns empty result on command failure', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
      vi.mocked(childProcess.execFileSync).mockReturnValue(Buffer.from('/usr/bin/journalctl\n'))
      mockExecFileFailure(new Error('permission denied'))

      const { readJournalLogs } = await import('../../src/main/services/journal-reader')
      const result = await readJournalLogs()
      expect(result.lines).toHaveLength(0)
      expect(result.source).toBe('system')
    })
  })

  describe('searchJournalLogs', () => {
    it('filters journal lines by search pattern', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
      vi.mocked(childProcess.execFileSync).mockReturnValue(Buffer.from('/usr/bin/journalctl\n'))
      mockExecFileSuccess(SAMPLE_JOURNAL)

      const { searchJournalLogs } = await import('../../src/main/services/journal-reader')
      const result = await searchJournalLogs('segfault')

      expect(result).not.toBeNull()
      expect(result!.matches).toHaveLength(1)
      expect(result!.matches[0].text).toContain('segfault')
    })

    it('returns null for invalid regex', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
      vi.mocked(childProcess.execFileSync).mockReturnValue(Buffer.from('/usr/bin/journalctl\n'))

      const { searchJournalLogs } = await import('../../src/main/services/journal-reader')
      const result = await searchJournalLogs('[invalid')
      expect(result).toBeNull()
    })

    it('returns null when no lines match search', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
      vi.mocked(childProcess.execFileSync).mockReturnValue(Buffer.from('/usr/bin/journalctl\n'))
      mockExecFileSuccess(SAMPLE_JOURNAL)

      const { searchJournalLogs } = await import('../../src/main/services/journal-reader')
      const result = await searchJournalLogs('nonexistent_pattern_xyz')
      expect(result).toBeNull()
    })
  })
})
