import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useLogStore } from '../stores/logStore'
import type { LogLine, LogLevel, LogSource } from '../../../shared/types'

const LINE_HEIGHT = 20
const BUFFER_LINES = 20

const levelStyles: Record<string, string> = {
  error: 'text-red-400 bg-red-400/5',
  warn: 'text-neon-yellow bg-neon-yellow/5',
  debug: 'text-text-muted',
  info: ''
}

const sourceBadgeStyles: Record<LogSource, string> = {
  cet: 'bg-purple-500/20 text-purple-400',
  red4ext: 'bg-blue-500/20 text-blue-400',
  game: 'bg-green-500/20 text-green-400',
  other: 'bg-gray-500/20 text-gray-400'
}

function matchesLevel(line: LogLine, filter: LogLevel | null): boolean {
  if (!filter) return true
  return line.level === filter
}

function matchesSource(line: LogLine, filter: LogSource | null): boolean {
  if (!filter) return true
  return line.source === filter
}

function highlightSearch(text: string, query: string): JSX.Element {
  if (!query) return <>{text}</>
  let regex: RegExp
  try {
    regex = new RegExp(`(${query})`, 'gi')
  } catch {
    return <>{text}</>
  }
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-neon-cyan/20 text-inherit rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

export default function LogContent(): JSX.Element {
  const logLines = useLogStore((s) => s.logLines)
  const levelFilter = useLogStore((s) => s.levelFilter)
  const sourceFilter = useLogStore((s) => s.sourceFilter)
  const searchQuery = useLogStore((s) => s.searchQuery)
  const loading = useLogStore((s) => s.loading)

  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const [isAtBottom, setIsAtBottom] = useState(true)

  const filteredLines = useMemo(() => {
    return logLines.filter(
      (line) => matchesLevel(line, levelFilter) && matchesSource(line, sourceFilter)
    )
  }, [logLines, levelFilter, sourceFilter])

  const totalHeight = filteredLines.length * LINE_HEIGHT
  const useVirtualization = filteredLines.length > 5000

  // Track container height
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Auto-scroll to bottom when new lines arrive and already at bottom
  useEffect(() => {
    if (isAtBottom && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [filteredLines.length, isAtBottom])

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    setScrollTop(el.scrollTop)
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
    setIsAtBottom(atBottom)
  }, [])

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
      setIsAtBottom(true)
    }
  }, [])

  // Calculate visible range for virtualization
  const startIndex = useVirtualization
    ? Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - BUFFER_LINES)
    : 0
  const endIndex = useVirtualization
    ? Math.min(
        filteredLines.length,
        Math.ceil((scrollTop + containerHeight) / LINE_HEIGHT) + BUFFER_LINES
      )
    : filteredLines.length
  const visibleLines = filteredLines.slice(startIndex, endIndex)

  if (loading && filteredLines.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted">Loading logs...</div>
    )
  }

  if (filteredLines.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted">
        {logLines.length === 0
          ? 'No log lines to display'
          : 'No lines match the current filters'}
      </div>
    )
  }

  // Max line number width for gutter
  const maxLineNum = filteredLines[filteredLines.length - 1]?.lineNumber ?? 0
  const gutterWidth = String(maxLineNum).length

  return (
    <div className="flex-1 relative overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-auto font-mono text-xs leading-5"
      >
        {useVirtualization ? (
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: startIndex * LINE_HEIGHT,
                left: 0,
                right: 0
              }}
            >
              {visibleLines.map((line, i) => (
                <LogLineRow
                  key={`${line.fileId}-${line.lineNumber}`}
                  line={line}
                  searchQuery={searchQuery}
                  gutterWidth={gutterWidth}
                />
              ))}
            </div>
          </div>
        ) : (
          visibleLines.map((line) => (
            <LogLineRow
              key={`${line.fileId}-${line.lineNumber}`}
              line={line}
              searchQuery={searchQuery}
              gutterWidth={gutterWidth}
            />
          ))
        )}
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 px-3 py-1.5 rounded bg-surface border border-border text-text-muted hover:text-text hover:border-neon-cyan/40 text-xs transition-colors shadow-lg"
        >
          Scroll to bottom
        </button>
      )}
    </div>
  )
}

function LogLineRow({
  line,
  searchQuery,
  gutterWidth
}: {
  line: LogLine
  searchQuery: string
  gutterWidth: number
}): JSX.Element {
  const levelClass = line.level ? levelStyles[line.level] ?? '' : ''

  return (
    <div className={`flex items-start hover:bg-white/[0.02] ${levelClass}`} style={{ height: LINE_HEIGHT }}>
      {/* Line number gutter */}
      <span
        className="text-text-muted/40 select-none text-right pr-2 shrink-0"
        style={{ width: `${(gutterWidth + 1) * 0.6}em` }}
      >
        {line.lineNumber}
      </span>

      {/* Source badge */}
      <span
        className={`inline-flex items-center px-1 rounded text-[10px] uppercase tracking-wider shrink-0 mr-2 ${sourceBadgeStyles[line.source]}`}
      >
        {line.source === 'red4ext' ? 'R4E' : line.source === 'cet' ? 'CET' : line.source === 'game' ? 'GAM' : 'OTH'}
      </span>

      {/* Log text */}
      <span className="whitespace-pre overflow-hidden text-ellipsis">
        {highlightSearch(line.text, searchQuery)}
      </span>
    </div>
  )
}
