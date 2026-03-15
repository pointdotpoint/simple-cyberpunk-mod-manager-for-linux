interface ProgressOverlayProps {
  visible: boolean
  operation: string
  current: number
  total: number
  label: string
}

export default function ProgressOverlay({
  visible,
  operation,
  current,
  total,
  label,
}: ProgressOverlayProps): JSX.Element | null {
  if (!visible) return null

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">
          {operation}
        </h3>

        <div className="h-2 bg-border rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-neon-cyan transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-text-muted">
          <span>{label}</span>
          <span>
            {current} / {total}
          </span>
        </div>
      </div>
    </div>
  )
}
