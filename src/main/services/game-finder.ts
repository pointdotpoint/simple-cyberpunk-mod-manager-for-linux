import fs from 'fs'
import path from 'path'
import os from 'os'

const CP2077_APP_ID = '1091500'
const CP2077_RELATIVE_PATH = path.join(
  'steamapps',
  'common',
  'Cyberpunk 2077',
  'bin',
  'x64',
  'Cyberpunk2077.exe'
)

const VDF_PATHS = [
  path.join(os.homedir(), '.steam', 'steam', 'libraryfolders.vdf'),
  path.join(os.homedir(), '.steam', 'steam', 'config', 'libraryfolders.vdf')
]

function parseVdfLibraryPaths(content: string): string[] {
  const paths: string[] = []
  const pathRegex = /"path"\s+"([^"]+)"/g
  let match
  while ((match = pathRegex.exec(content)) !== null) {
    paths.push(match[1])
  }
  return paths
}

function readVdfContent(): string | null {
  for (const vdfPath of VDF_PATHS) {
    if (fs.existsSync(vdfPath)) {
      try {
        return fs.readFileSync(vdfPath, 'utf-8')
      } catch {
        // Try next path
      }
    }
  }
  return null
}

export function detectGameDirectory(): string | null {
  const content = readVdfContent()
  if (content) {
    const libraryPaths = parseVdfLibraryPaths(content)
    for (const libraryPath of libraryPaths) {
      const gamePath = path.join(libraryPath, CP2077_RELATIVE_PATH)
      if (fs.existsSync(gamePath)) {
        return path.join(libraryPath, 'steamapps', 'common', 'Cyberpunk 2077')
      }
    }
  }

  // Fallback: check common Steam install paths directly
  const fallbackPaths = [
    path.join(os.homedir(), '.local', 'share', 'Steam'),
    path.join(os.homedir(), '.steam', 'steam')
  ]
  for (const steamPath of fallbackPaths) {
    const gamePath = path.join(steamPath, CP2077_RELATIVE_PATH)
    if (fs.existsSync(gamePath)) {
      return path.join(steamPath, 'steamapps', 'common', 'Cyberpunk 2077')
    }
  }

  return null
}

export function validateGameDirectory(gamePath: string): boolean {
  const exePath = path.join(gamePath, 'bin', 'x64', 'Cyberpunk2077.exe')
  return fs.existsSync(exePath)
}

// Re-export for reference
export { CP2077_APP_ID }
