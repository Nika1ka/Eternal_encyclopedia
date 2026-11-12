import { useId, useEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { arcanaInteractions } from '../../utils/arcanaCalculator'

type Box = { x: number; y: number; width: number; height: number }
export function ArcanaConnections({ grid, interactions, active }: {
  grid: RefObject<HTMLDivElement | null>; interactions: ReturnType<typeof arcanaInteractions>; active: number
}) {
  const id = useId().replaceAll(':', '')
  const [boxes, setBoxes] = useState<Box[]>([])
  useEffect(() => {
    const element = grid.current
    if (!element) return
    const measure = () => {
      const bounds = element.getBoundingClientRect()
      const next = Array.from(element.querySelectorAll<HTMLElement>('.arcana-slot'), (slot) => {
        const rect = slot.getBoundingClientRect()
        return { x: rect.left - bounds.left, y: rect.top - bounds.top, width: rect.width, height: rect.height }
      })
      setBoxes((current) => current.length === next.length && current.every((box, index) => {
        const other = next[index]
        return box.x === other.x && box.y === other.y && box.width === other.width && box.height === other.height
      }) ? current : next)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    element.querySelectorAll('.arcana-slot').forEach((slot) => observer.observe(slot))
    measure()
    return () => observer.disconnect()
  }, [grid])
  return <svg className="arcana-connections" aria-hidden="true">
    <defs>{['positive', 'negative'].map((tone) => <marker key={tone} id={`${id}-${tone}`} viewBox="0 0 6 6"
      refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto" markerUnits="userSpaceOnUse">
      <path d="M0 0 L6 3 L0 6 Z" fill={tone === 'positive' ? '#60E0B0' : '#ED6B84'} />
    </marker>)}</defs>
    {interactions.map(({ from, to, value }) => {
      const a = boxes[from], b = boxes[to]
      if (!a || !b) return null
      const horizontal = Math.floor(from / 4) === Math.floor(to / 4)
      const forward = to > from
      const x1 = horizontal ? (forward ? a.x + a.width + 2 : a.x - 2) : a.x + a.width / 2
      const y1 = horizontal ? a.y + a.height / 2 : (forward ? a.y + a.height + 2 : a.y - 2)
      const x2 = horizontal ? (forward ? b.x - 2 : b.x + b.width + 2) : b.x + b.width / 2
      const y2 = horizontal ? b.y + b.height / 2 : (forward ? b.y - 2 : b.y + b.height + 2)
      const tone = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
      const gradient = `${id}-${from}-${to}`
      return <g key={`${from}-${to}`} className={`arcana-connection arcana-connection-${tone}`} data-active={from === active}>
        <defs><linearGradient id={gradient} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
          <stop offset="0" stopColor="currentColor" stopOpacity=".35" />
          <stop offset=".55" stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".7" />
        </linearGradient></defs>
        <line className="arcana-connection-glow" x1={x1} y1={y1} x2={x2} y2={y2} />
        <line style={{ stroke: `url(#${gradient})` }} x1={x1} y1={y1} x2={x2} y2={y2} markerEnd={value !== 0 ? `url(#${id}-${tone})` : undefined} />
      </g>
    })}
  </svg>
}
