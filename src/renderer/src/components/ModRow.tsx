import type { Mod, ModType } from '../../../shared/types'

interface ModRowProps {
  mod: Mod
  selected: boolean
  onSelect: (e: React.MouseEvent) => void
  onToggleEnable: () => void
}

const TYPE_STYLES: Record<ModType, string> = {
  archive: 'bg-blue-500/20 text-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.15)]',
  cet: 'bg-green-500/20 text-green-400 shadow-[0_0_6px_rgba(34,197,94,0.15)]',
  redmod: 'bg-purple-500/20 text-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.15)]',
  redscript: 'bg-orange-500/20 text-orange-400 shadow-[0_0_6px_rgba(249,115,22,0.15)]',
  tweakxl: 'bg-yellow-500/20 text-yellow-400 shadow-[0_0_6px_rgba(234,179,8,0.15)]',
  red4ext: 'bg-red-500/20 text-red-400 shadow-[0_0_6px_rgba(239,68,68,0.15)]',
  mixed: 'bg-neon-magenta/20 text-neon-magenta shadow-[0_0_6px_rgba(255,45,149,0.15)]',
  unknown: 'bg-gray-500/20 text-gray-400'
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '\u2014'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString()
}

export default function ModRow({ mod, selected, onSelect, onToggleEnable }: ModRowProps): JSX.Element {
  const enabled = mod.status === 'enabled'

  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer transition-all duration-150 ${
        selected
          ? 'bg-neon-cyan/5 border-l-2 border-neon-cyan shadow-[inset_0_0_20px_rgba(0,240,255,0.04)]'
          : 'border-l-2 border-transparent hover:bg-surface-hover'
      }`}
    >
      {/* Toggle */}
      <td className="px-4 py-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleEnable()
          }}
          className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
            enabled ? 'bg-neon-cyan shadow-neon-cyan' : 'bg-border'
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${
              enabled ? 'left-5' : 'left-0.5'
            }`}
          />
        </button>
      </td>

      {/* Name */}
      <td className="px-4 py-3 font-bold text-text font-orbitron">{mod.name}</td>

      {/* Type badge */}
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[mod.type]}`}>
          {mod.type}
        </span>
      </td>

      {/* Size */}
      <td className="px-4 py-3 text-text-muted text-sm">{formatFileSize(mod.fileSize)}</td>

      {/* Date */}
      <td className="px-4 py-3 text-text-muted text-sm">{formatDate(mod.importedAt)}</td>
    </tr>
  )
}
