import { describe, it, expect } from 'vitest'
import { validateGameDirectory } from '../../src/main/services/game-finder'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

describe('VDF parsing', () => {
  it('extracts library paths from VDF content', () => {
    const vdfContent = `
"libraryfolders"
{
    "0"
    {
        "path"		"/home/user/.local/share/Steam"
        "label"		""
        "apps"
        {
            "228980"		"0"
            "1091500"		"0"
        }
    }
    "1"
    {
        "path"		"/mnt/games/SteamLibrary"
    }
}`
    const paths: string[] = []
    const pathRegex = /"path"\s+"([^"]+)"/g
    let match
    while ((match = pathRegex.exec(vdfContent)) !== null) {
      paths.push(match[1])
    }

    expect(paths).toEqual(['/home/user/.local/share/Steam', '/mnt/games/SteamLibrary'])
  })

  it('handles empty VDF', () => {
    const paths: string[] = []
    const pathRegex = /"path"\s+"([^"]+)"/g
    let match
    while ((match = pathRegex.exec('')) !== null) {
      paths.push(match[1])
    }
    expect(paths).toEqual([])
  })
})

describe('validateGameDirectory', () => {
  it('returns false for non-existent directory', () => {
    expect(validateGameDirectory('/nonexistent/path')).toBe(false)
  })

  it('returns false for directory without game executable', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-game-'))
    try {
      expect(validateGameDirectory(tmpDir)).toBe(false)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('returns true for directory with correct structure', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-game-'))
    try {
      const exeDir = path.join(tmpDir, 'bin', 'x64')
      fs.mkdirSync(exeDir, { recursive: true })
      fs.writeFileSync(path.join(exeDir, 'Cyberpunk2077.exe'), '')
      expect(validateGameDirectory(tmpDir)).toBe(true)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})
