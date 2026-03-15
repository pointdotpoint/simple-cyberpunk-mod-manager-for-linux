import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { detectModType } from '../../src/main/services/mod-importer'

describe('detectModType', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-detect-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('detects archive type from .archive files', () => {
    fs.writeFileSync(path.join(tmpDir, 'mod.archive'), '')
    const result = detectModType(tmpDir, ['mod.archive'])
    expect(result.type).toBe('archive')
  })

  it('detects CET type from init.lua', () => {
    fs.mkdirSync(path.join(tmpDir, 'mymod'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'mymod', 'init.lua'), '')
    const result = detectModType(tmpDir, ['mymod/init.lua'])
    expect(result.type).toBe('cet')
  })

  it('detects REDscript type from .reds files', () => {
    fs.writeFileSync(path.join(tmpDir, 'script.reds'), '')
    const result = detectModType(tmpDir, ['script.reds'])
    expect(result.type).toBe('redscript')
  })

  it('detects TweakXL from .xl files', () => {
    fs.writeFileSync(path.join(tmpDir, 'tweak.xl'), '')
    const result = detectModType(tmpDir, ['tweak.xl'])
    expect(result.type).toBe('tweakxl')
  })

  it('detects TweakXL from .yaml files', () => {
    fs.writeFileSync(path.join(tmpDir, 'mod.yaml'), '')
    const result = detectModType(tmpDir, ['mod.yaml'])
    expect(result.type).toBe('tweakxl')
  })

  it('detects Red4ext from .dll under red4ext/plugins/', () => {
    const pluginDir = path.join(tmpDir, 'red4ext', 'plugins', 'mymod')
    fs.mkdirSync(pluginDir, { recursive: true })
    fs.writeFileSync(path.join(pluginDir, 'plugin.dll'), '')
    const result = detectModType(tmpDir, ['red4ext/plugins/mymod/plugin.dll'])
    expect(result.type).toBe('red4ext')
  })

  it('detects REDmod from info.json with name + archives dir', () => {
    fs.writeFileSync(path.join(tmpDir, 'info.json'), JSON.stringify({ name: 'TestMod' }))
    fs.mkdirSync(path.join(tmpDir, 'archives'))
    const result = detectModType(tmpDir, ['info.json'])
    expect(result.type).toBe('redmod')
    expect(result.redmodName).toBe('TestMod')
  })

  it('returns mixed for multiple types', () => {
    fs.writeFileSync(path.join(tmpDir, 'mod.archive'), '')
    fs.mkdirSync(path.join(tmpDir, 'scripts'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'scripts', 'init.lua'), '')
    const result = detectModType(tmpDir, ['mod.archive', 'scripts/init.lua'])
    expect(result.type).toBe('mixed')
  })

  it('returns unknown when no type detected', () => {
    fs.writeFileSync(path.join(tmpDir, 'readme.txt'), '')
    const result = detectModType(tmpDir, ['readme.txt'])
    expect(result.type).toBe('unknown')
  })
})
