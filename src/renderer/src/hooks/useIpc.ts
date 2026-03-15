import type { ElectronAPI } from '../../../shared/types'

export function useIpc(): ElectronAPI {
  return window.electronAPI
}
