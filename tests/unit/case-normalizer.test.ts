import { describe, it, expect } from 'vitest'
import { normalizeFilePath, normalizeStagingDirectory } from '../../src/main/services/case-normalizer'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

describe('normalizeFilePath', () => {
  it('lowercases directory components', () => {
    expect(normalizeFilePath('Archive/PC/Mod/myMod.archive')).toBe('archive/pc/mod/myMod.archive')
  })

  it('preserves filename case', () => {
    expect(normalizeFilePath('SomeDir/MyFile.lua')).toBe('somedir/MyFile.lua')
  })

  it('handles file at root (no directory)', () => {
    expect(normalizeFilePath('README.md')).toBe('README.md')
  })

  it('handles already lowercase paths', () => {
    expect(normalizeFilePath('archive/pc/mod/test.archive')).toBe('archive/pc/mod/test.archive')
  })

  it('handles deeply nested paths', () => {
    expect(normalizeFilePath('A/B/C/D/file.txt')).toBe('a/b/c/d/file.txt')
  })

  it('handles mixed case in directories only', () => {
    expect(normalizeFilePath('Bin/X64/Plugins/CET.dll')).toBe('bin/x64/plugins/CET.dll')
  })
})

describe('normalizeStagingDirectory', () => {
  it('renames directories to lowercase', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'))
    try {
      fs.mkdirSync(path.join(tmpDir, 'Archive', 'PC'), { recursive: true })
      fs.writeFileSync(path.join(tmpDir, 'Archive', 'PC', 'test.archive'), '')

      normalizeStagingDirectory(tmpDir)

      expect(fs.existsSync(path.join(tmpDir, 'archive', 'pc', 'test.archive'))).toBe(true)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('preserves filenames', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'))
    try {
      fs.mkdirSync(path.join(tmpDir, 'MyDir'), { recursive: true })
      fs.writeFileSync(path.join(tmpDir, 'MyDir', 'MyFile.txt'), '')

      normalizeStagingDirectory(tmpDir)

      expect(fs.existsSync(path.join(tmpDir, 'mydir', 'MyFile.txt'))).toBe(true)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})
