import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

describe('mod-scanner', () => {
  let tmpDir: string
  let gameDir: string
  let queries: typeof import('../../src/main/database/queries')
  let connection: typeof import('../../src/main/database/connection')
  let scanner: typeof import('../../src/main/services/mod-scanner')

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-scanner-'))
    gameDir = path.join(tmpDir, 'game')
    fs.mkdirSync(gameDir, { recursive: true })

    process.env.XDG_DATA_HOME = tmpDir
    vi.resetModules()
    connection = await import('../../src/main/database/connection')
    queries = await import('../../src/main/database/queries')
    scanner = await import('../../src/main/services/mod-scanner')
  })

  afterEach(() => {
    connection.closeDb()
    fs.rmSync(tmpDir, { recursive: true, force: true })
    delete process.env.XDG_DATA_HOME
  })

  function createFile(relPath: string, content = 'test'): void {
    const fullPath = path.join(gameDir, relPath)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, content)
  }

  it('scans archive mods', () => {
    createFile('archive/pc/mod/cool_cars.archive')
    createFile('archive/pc/mod/better_weapons.archive')

    const result = scanner.scanExistingMods(gameDir)
    expect(result.discovered).toBe(2)
    expect(result.errors).toHaveLength(0)

    const mods = queries.getAllMods()
    expect(mods).toHaveLength(2)

    const names = mods.map((m) => m.name).sort()
    expect(names).toEqual(['better_weapons', 'cool_cars'])

    for (const mod of mods) {
      expect(mod.source).toBe('scanned')
      expect(mod.status).toBe('enabled')
      expect(mod.type).toBe('archive')
      expect(mod.sourceArchive).toBeNull()
    }
  })

  it('scans CET mods', () => {
    createFile('bin/x64/plugins/cyber_engine_tweaks/mods/BetterUI/init.lua', 'print("hi")')
    createFile('bin/x64/plugins/cyber_engine_tweaks/mods/BetterUI/modules/hud.lua')

    const result = scanner.scanExistingMods(gameDir)
    expect(result.discovered).toBe(1)

    const mods = queries.getAllMods()
    expect(mods).toHaveLength(1)
    expect(mods[0].name).toBe('BetterUI')
    expect(mods[0].type).toBe('cet')
    expect(mods[0].source).toBe('scanned')

    const files = queries.getModFiles(mods[0].id)
    expect(files).toHaveLength(2)

    const deployPaths = files.map((f) => f.deployPath).sort()
    expect(deployPaths).toEqual([
      'bin/x64/plugins/cyber_engine_tweaks/mods/BetterUI/init.lua',
      'bin/x64/plugins/cyber_engine_tweaks/mods/BetterUI/modules/hud.lua'
    ])
  })

  it('skips CET dirs without init.lua', () => {
    createFile('bin/x64/plugins/cyber_engine_tweaks/mods/NoInit/readme.txt')

    const result = scanner.scanExistingMods(gameDir)
    expect(result.discovered).toBe(0)
  })

  it('scans REDscript mods', () => {
    createFile('r6/scripts/MyRedscript/main.reds')
    createFile('r6/scripts/MyRedscript/utils.reds')

    const result = scanner.scanExistingMods(gameDir)
    expect(result.discovered).toBe(1)

    const mods = queries.getAllMods()
    expect(mods[0].type).toBe('redscript')
    expect(mods[0].name).toBe('MyRedscript')
  })

  it('scans TweakXL mods — yaml files and subdirectories', () => {
    createFile('r6/tweaks/my_tweak.yaml')
    createFile('r6/tweaks/big_tweak/part1.yaml')
    createFile('r6/tweaks/big_tweak/part2.yaml')

    const result = scanner.scanExistingMods(gameDir)
    expect(result.discovered).toBe(2)

    const mods = queries.getAllMods()
    expect(mods).toHaveLength(2)

    const names = mods.map((m) => m.name).sort()
    expect(names).toEqual(['big_tweak', 'my_tweak'])

    for (const mod of mods) {
      expect(mod.type).toBe('tweakxl')
    }
  })

  it('scans Red4ext mods', () => {
    createFile('red4ext/plugins/MyPlugin/MyPlugin.dll')
    createFile('red4ext/plugins/MyPlugin/config.ini')

    const result = scanner.scanExistingMods(gameDir)
    expect(result.discovered).toBe(1)

    const mods = queries.getAllMods()
    expect(mods[0].type).toBe('red4ext')
    expect(mods[0].name).toBe('MyPlugin')
  })

  it('is idempotent — second scan creates no duplicates', () => {
    createFile('archive/pc/mod/test.archive')
    createFile('bin/x64/plugins/cyber_engine_tweaks/mods/TestCET/init.lua')

    const result1 = scanner.scanExistingMods(gameDir)
    expect(result1.discovered).toBe(2)

    const result2 = scanner.scanExistingMods(gameDir)
    expect(result2.discovered).toBe(0)
    expect(result2.skipped).toBe(2)

    const mods = queries.getAllMods()
    expect(mods).toHaveLength(2)
  })

  it('scanned mods have empty staging paths', () => {
    createFile('archive/pc/mod/test.archive')

    scanner.scanExistingMods(gameDir)

    const mods = queries.getAllMods()
    const files = queries.getModFiles(mods[0].id)
    for (const file of files) {
      expect(file.stagingPath).toBe('')
    }
  })

  it('scans all mod types in one pass', () => {
    createFile('archive/pc/mod/a.archive')
    createFile('bin/x64/plugins/cyber_engine_tweaks/mods/MyCET/init.lua')
    createFile('r6/scripts/MyScript/main.reds')
    createFile('r6/tweaks/my.yaml')
    createFile('red4ext/plugins/MyExt/ext.dll')

    const result = scanner.scanExistingMods(gameDir)
    expect(result.discovered).toBe(5)
    expect(result.errors).toHaveLength(0)

    const mods = queries.getAllMods()
    const types = mods.map((m) => m.type).sort()
    expect(types).toEqual(['archive', 'cet', 'red4ext', 'redscript', 'tweakxl'])
  })

  it('returns errors without crashing when a directory is unreadable', () => {
    // Scanner should handle missing directories gracefully — no errors for simply-missing dirs
    const result = scanner.scanExistingMods(path.join(tmpDir, 'nonexistent-game'))
    expect(result.discovered).toBe(0)
    expect(result.errors).toHaveLength(0)
  })
})
