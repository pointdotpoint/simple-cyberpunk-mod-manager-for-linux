import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

describe('database', () => {
  let tmpDir: string
  let queries: typeof import('../../src/main/database/queries')
  let connection: typeof import('../../src/main/database/connection')

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-db-'))
    process.env.XDG_DATA_HOME = tmpDir
    vi.resetModules()
    connection = await import('../../src/main/database/connection')
    queries = await import('../../src/main/database/queries')
  })

  afterEach(() => {
    connection.closeDb()
    fs.rmSync(tmpDir, { recursive: true, force: true })
    delete process.env.XDG_DATA_HOME
  })

  it('inserts and retrieves a mod', () => {
    const mod = {
      id: 'test-id',
      name: 'Test Mod',
      type: 'archive' as const,
      status: 'disabled' as const,
      sourceArchive: 'test.zip',
      fileSize: 1024,
      fileCount: 5,
      importedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    queries.insertMod(mod)
    const retrieved = queries.getMod('test-id')
    expect(retrieved).toEqual(mod)
  })

  it('lists all mods', () => {
    const now = new Date().toISOString()
    const mod1 = {
      id: 'mod-1',
      name: 'Mod One',
      type: 'archive' as const,
      status: 'disabled' as const,
      sourceArchive: 'mod1.zip',
      fileSize: 100,
      fileCount: 1,
      importedAt: now,
      updatedAt: now
    }
    const mod2 = {
      id: 'mod-2',
      name: 'Mod Two',
      type: 'cet' as const,
      status: 'enabled' as const,
      sourceArchive: 'mod2.zip',
      fileSize: 200,
      fileCount: 2,
      importedAt: now,
      updatedAt: now
    }
    queries.insertMod(mod1)
    queries.insertMod(mod2)
    const all = queries.getAllMods()
    expect(all).toHaveLength(2)
    expect(all.map((m) => m.id).sort()).toEqual(['mod-1', 'mod-2'])
  })

  it('updates mod status', () => {
    const now = new Date().toISOString()
    const mod = {
      id: 'test-status',
      name: 'Status Test',
      type: 'archive' as const,
      status: 'disabled' as const,
      sourceArchive: 'test.zip',
      fileSize: 100,
      fileCount: 1,
      importedAt: now,
      updatedAt: now
    }
    queries.insertMod(mod)
    queries.updateModStatus('test-status', 'enabled')
    const updated = queries.getMod('test-status')
    expect(updated!.status).toBe('enabled')
  })

  it('deletes mod with cascade', () => {
    const now = new Date().toISOString()
    const mod = {
      id: 'test-delete',
      name: 'Delete Test',
      type: 'archive' as const,
      status: 'disabled' as const,
      sourceArchive: 'test.zip',
      fileSize: 100,
      fileCount: 1,
      importedAt: now,
      updatedAt: now
    }
    queries.insertMod(mod)
    queries.insertModFiles([
      { modId: 'test-delete', stagingPath: 'file1.archive', deployPath: 'archive/pc/mod/file1.archive', fileHash: null }
    ])

    // Verify file exists
    expect(queries.getModFiles('test-delete')).toHaveLength(1)

    queries.deleteMod('test-delete')
    expect(queries.getMod('test-delete')).toBeNull()
    expect(queries.getModFiles('test-delete')).toHaveLength(0)
  })

  it('detects conflicting files', () => {
    const now = new Date().toISOString()
    const mod1 = {
      id: 'conflict-1',
      name: 'Conflict One',
      type: 'archive' as const,
      status: 'enabled' as const,
      sourceArchive: 'c1.zip',
      fileSize: 100,
      fileCount: 1,
      importedAt: now,
      updatedAt: now
    }
    const mod2 = {
      id: 'conflict-2',
      name: 'Conflict Two',
      type: 'archive' as const,
      status: 'enabled' as const,
      sourceArchive: 'c2.zip',
      fileSize: 100,
      fileCount: 1,
      importedAt: now,
      updatedAt: now
    }
    queries.insertMod(mod1)
    queries.insertMod(mod2)
    queries.insertModFiles([
      { modId: 'conflict-1', stagingPath: 'a.archive', deployPath: 'archive/pc/mod/shared.archive', fileHash: null }
    ])
    queries.insertModFiles([
      { modId: 'conflict-2', stagingPath: 'b.archive', deployPath: 'archive/pc/mod/shared.archive', fileHash: null }
    ])

    const conflicts = queries.getConflictingFiles(['archive/pc/mod/shared.archive'], 'conflict-1')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].modId).toBe('conflict-2')
    expect(conflicts[0].deployPath).toBe('archive/pc/mod/shared.archive')
  })

  it('manages settings', () => {
    queries.setSetting('game_directory', '/some/path')
    expect(queries.getSetting('game_directory')).toBe('/some/path')

    queries.setSetting('game_directory', '/other/path')
    expect(queries.getSetting('game_directory')).toBe('/other/path')

    expect(queries.getSetting('nonexistent')).toBeNull()
  })
})
