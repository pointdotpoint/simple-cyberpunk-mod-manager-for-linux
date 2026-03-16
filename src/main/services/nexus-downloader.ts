import { BrowserWindow, session } from 'electron'
import * as os from 'os'
import * as path from 'path'
import type { OperationProgress } from '../../shared/types'

const NEXUS_URL_RE = /^https?:\/\/(www\.)?nexusmods\.com\/([^/]+)\/mods\/(\d+)/

export function parseNexusUrl(url: string): { gameDomain: string; modId: number } {
  const match = url.match(NEXUS_URL_RE)
  if (!match) {
    throw new Error(
      'Invalid Nexus Mods URL. Expected format: https://www.nexusmods.com/cyberpunk2077/mods/12345'
    )
  }
  return { gameDomain: match[2], modId: parseInt(match[3], 10) }
}

async function checkLoginState(win: BrowserWindow): Promise<'logged-in' | 'not-logged-in'> {
  return win.webContents.executeJavaScript(`
    (function() {
      const profileEl = document.querySelector('.avatar, [class*="avatar"], .user-avatar, #user-area img')
      const loginLink = document.querySelector('a[href*="login"], a[href*="signin"], .login-link')
      if (profileEl) return 'logged-in'
      if (loginLink) return 'not-logged-in'
      return 'logged-in'
    })()
  `)
}

async function clickManualDownload(win: BrowserWindow): Promise<'clicked' | 'not-found'> {
  return win.webContents.executeJavaScript(`
    (function() {
      var links = document.querySelectorAll('a, button')
      for (var i = 0; i < links.length; i++) {
        var text = (links[i].textContent || '').toLowerCase().trim()
        if (text.includes('manual download') || text.includes('manual')) {
          var el = links[i]
          if (el.closest('.file-category-main, .main-files, [class*="main"]') ||
              el.closest('.file-expander-header') ||
              el.closest('.accordion')) {
            el.click()
            return 'clicked'
          }
        }
      }
      for (var j = 0; j < links.length; j++) {
        var t = (links[j].textContent || '').toLowerCase().trim()
        if (t.includes('manual download') || t === 'manual') {
          links[j].click()
          return 'clicked'
        }
      }
      return 'not-found'
    })()
  `)
}

async function clickSlowDownload(win: BrowserWindow): Promise<'clicked'> {
  return win.webContents.executeJavaScript(`
    new Promise(function(resolve, reject) {
      var attempts = 0
      var maxAttempts = 30
      var interval = setInterval(function() {
        attempts++
        var btn = document.getElementById('slowDownloadButton')
        if (!btn) {
          var allBtns = document.querySelectorAll('a, button')
          for (var i = 0; i < allBtns.length; i++) {
            var text = (allBtns[i].textContent || '').toLowerCase().trim()
            if (text.includes('slow download')) {
              btn = allBtns[i]
              break
            }
          }
        }
        if (btn) {
          if (btn.disabled || btn.classList.contains('disabled')) {
            return
          }
          clearInterval(interval)
          btn.click()
          resolve('clicked')
          return
        }
        if (attempts >= maxAttempts) {
          clearInterval(interval)
          reject(new Error('Slow download button not found within timeout'))
        }
      }, 500)
    })
  `)
}

async function attemptAutomation(
  win: BrowserWindow,
  onProgress: (progress: OperationProgress) => void
): Promise<void> {
  const loginState = await checkLoginState(win)
  if (loginState === 'not-logged-in') {
    throw new Error('Login required')
  }

  onProgress({
    operation: 'download',
    current: 0,
    total: 100,
    label: 'Starting download from Nexus Mods...'
  })

  const manualResult = await clickManualDownload(win)
  if (manualResult === 'not-found') {
    throw new Error('Manual download button not found')
  }

  await clickSlowDownload(win)
}

export function openNexusDownloadWindow(
  url: string,
  onProgress: (progress: OperationProgress) => void,
  onComplete: (filePath: string) => void,
  onCancel: () => void
): () => void {
  const filesTabUrl = url.replace(/\?.*$/, '') + '?tab=files'

  const nexusSession = session.fromPartition('persist:nexus')

  let downloadStarted = false
  let windowClosed = false
  let automationAttempts = 0
  const maxAutomationAttempts = 3

  const win = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
    title: 'Nexus Mods - Download',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      session: nexusSession
    }
  })

  const showWindow = (): void => {
    if (!windowClosed && !win.isVisible()) {
      win.show()
    }
  }

  const safetyTimeout = setTimeout(() => {
    if (!downloadStarted && !windowClosed) {
      showWindow()
    }
  }, 30_000)

  const willDownloadHandler = (
    _event: Electron.Event,
    item: Electron.DownloadItem
  ): void => {
    downloadStarted = true
    clearTimeout(safetyTimeout)
    const filename = item.getFilename()
    const savePath = path.join(os.tmpdir(), `nexus-dl-${Date.now()}-${filename}`)
    item.setSavePath(savePath)

    onProgress({
      operation: 'download',
      current: 0,
      total: 100,
      label: `Downloading ${filename}...`
    })

    item.on('updated', (_e, state) => {
      if (state === 'progressing') {
        const received = item.getReceivedBytes()
        const total = item.getTotalBytes()
        const percent = total > 0 ? Math.round((received / total) * 100) : 0
        onProgress({
          operation: 'download',
          current: percent,
          total: 100,
          label: `Downloading ${filename}... ${percent}%`
        })
      }
    })

    item.once('done', (_e, state) => {
      if (state === 'completed') {
        if (!windowClosed) {
          windowClosed = true
          win.close()
        }
        onComplete(savePath)
      } else {
        if (!windowClosed) {
          windowClosed = true
          win.close()
        }
        onCancel()
      }
    })
  }

  nexusSession.on('will-download', willDownloadHandler)

  const tryAutomation = (): void => {
    if (windowClosed || downloadStarted) return
    automationAttempts++
    attemptAutomation(win, onProgress).catch(() => {
      showWindow()
    })
  }

  win.webContents.on('did-finish-load', () => {
    if (automationAttempts === 0) {
      tryAutomation()
    }
  })

  win.webContents.on('did-navigate', (_event, navUrl) => {
    if (downloadStarted || windowClosed) return
    const isNexusModPage = NEXUS_URL_RE.test(navUrl) && navUrl.includes('tab=files')
    if (isNexusModPage && automationAttempts > 0 && automationAttempts < maxAutomationAttempts) {
      tryAutomation()
    }
  })

  win.on('closed', () => {
    windowClosed = true
    clearTimeout(safetyTimeout)
    nexusSession.removeListener('will-download', willDownloadHandler)
    if (!downloadStarted) {
      onCancel()
    }
  })

  win.loadURL(filesTabUrl)

  return () => {
    clearTimeout(safetyTimeout)
    nexusSession.removeListener('will-download', willDownloadHandler)
    if (!windowClosed) {
      windowClosed = true
      win.close()
    }
  }
}
