import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { EquipmentItem } from '../../types/equipment'
import { equipmentConnections } from '../../engine/equipmentModifiers'
import { rarities } from '../../utils/equipmentData'
import { EquipmentIcon } from './EquipmentIcon'
import { EQUIPMENT_DRAG_TYPE } from '../../utils/equipmentDrag'

export function EquipmentCatalog({ items, selectedId, onInspect, onDragChange }: {
  items: readonly EquipmentItem[]; selectedId?: number
  onInspect: (itemId: number, anchor: DOMRect) => void
  onDragChange: (id: number | null) => void
}) {
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const connections = useMemo(() => equipmentConnections(items), [items])
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])
  const rows = Math.max(...items.map((item) => item.position_in_shop[0])) + 1
  const highlightedId = hoveredId ?? selectedId
  const relatedIds = new Set(connections.filter((edge) => edge.from === highlightedId || edge.to === highlightedId).flatMap((edge) => [edge.from, edge.to]))
  return <section className="equipment-catalog" aria-labelledby="equipment-catalog-title">
    <h2 id="equipment-catalog-title">Все предметы</h2>
    <div className="equipment-rarity-headings">{rarities.map((rarity) =>
      <div key={rarity.name} style={{ '--rarity': rarity.color } as CSSProperties}>{rarity.name}</div>)}</div>
    <div className="equipment-catalog-scroll" tabIndex={0} aria-label="Каталог предметов">
      <div className="equipment-grid" style={{ '--rows': rows } as CSSProperties}>
        <svg className="equipment-connections" viewBox={`0 0 500 ${rows * 100}`} preserveAspectRatio="none" aria-hidden="true">
          {connections.map((edge) => {
            const from = byId.get(edge.from)!, to = byId.get(edge.to)!
            const active = edge.from === highlightedId || edge.to === highlightedId
            return <line key={`${edge.from}-${edge.to}`} x1={from.position_in_shop[1] * 100 + 50} y1={from.position_in_shop[0] * 100 + 50}
              x2={to.position_in_shop[1] * 100 + 50} y2={to.position_in_shop[0] * 100 + 50}
              className={active ? 'connection-active' : highlightedId !== undefined ? 'connection-muted' : ''} vectorEffect="non-scaling-stroke" />
          })}
        </svg>
        {items.map((item) => <button type="button" key={item.id} className="equipment-catalog-item" data-equipment-inspect
          style={{ gridRow: item.position_in_shop[0] + 1, gridColumn: item.position_in_shop[1] + 1, '--rarity': rarities[item.rarity].color } as CSSProperties}
          aria-label={item.name} aria-pressed={selectedId === item.id} data-related={relatedIds.has(item.id)}
          title={item.name} draggable
          onMouseEnter={() => setHoveredId(item.id)} onMouseLeave={() => setHoveredId(null)}
          onFocus={() => setHoveredId(item.id)} onBlur={() => setHoveredId(null)}
          onClick={(event) => onInspect(item.id, event.currentTarget.getBoundingClientRect())}
          onDragStart={(event) => {
            event.dataTransfer.setData(EQUIPMENT_DRAG_TYPE, String(item.id))
            event.dataTransfer.effectAllowed = 'copy'
            onDragChange(item.id)
          }} onDragEnd={() => onDragChange(null)}>
          <EquipmentIcon item={item} lazy />
        </button>)}
      </div>
    </div>
  </section>
}
