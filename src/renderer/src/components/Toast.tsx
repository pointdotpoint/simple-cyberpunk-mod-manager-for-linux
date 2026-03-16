import { useToastStore } from '../stores/toastStore'

export default function Toast(): JSX.Element | null {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={`px-4 py-3 rounded border cursor-pointer text-sm transition-all duration-200 ${
            toast.type === 'success'
              ? 'bg-surface border-neon-cyan/40 text-neon-cyan shadow-neon-cyan'
              : 'bg-surface border-red-500/40 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3),0_0_20px_rgba(239,68,68,0.1)]'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
