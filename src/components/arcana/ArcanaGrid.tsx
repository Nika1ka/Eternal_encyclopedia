import type { ArcanaSlots } from '../../types/arcana'
import { arcanaById, needsRandomNeighbor } from '../../utils/arcanaData'
import { ArcanaCardImage } from './ArcanaCardImage'
import { useEffect, useRef, useState } from 'react'
import { arcanaConnectionViews } from '../../utils/arcanaConnectionViews'
import { reduceArcana } from '../../store/arcanaStore'
import { ArcanaConnections } from './ArcanaConnections'
import { ARCANA_DRAG_TYPE } from '../../utils/arcanaDrag'
import { effectiveArcanaLevels } from '../../utils/arcanaCalculator'

export function ArcanaGrid({ slots, selectedId, placement, dragId, onDrag, onInspect, onPlace, onCancel }: {
  slots: ArcanaSlots; selectedId: number | null; placement: number | null; dragId: number | null
  onDrag: (id: number | null) => void; onInspect: (id: number) => void; onPlace: (id: number, index: number) => void; onCancel: () => void
}) {
  const grid = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(-1)
  const [dropSlot, setDropSlot] = useState(-1)
  useEffect(() => {
    const end = () => { setDropSlot(-1); setHovered(-1) }
    document.addEventListener('dragend', end)
    return () => document.removeEventListener('dragend', end)
  }, [])
  const selected = slots.findIndex((slot) => slot?.arcanaId === selectedId)
  const levels = effectiveArcanaLevels(slots)
  const source = slots.findIndex((slot) => slot?.arcanaId === dragId)
  const moving = dragId !== null && source >= 0
  const preview = dragId !== null && dropSlot >= 0
    ? reduceArcana(slots, source >= 0 ? { type: 'move', from: source, to: dropSlot }
      : { type: 'place', arcanaId: dragId, slot: dropSlot }, new Set<string>()) : slots
  const active = dragId !== null ? dropSlot : selected >= 0 ? selected : hovered
  const interactions = arcanaConnectionViews(preview)
  const related = new Set(interactions.filter((edge) => edge.from === active).map((edge) => edge.to))
  const activeCard = preview[active] && arcanaById.get(preview[active]!.arcanaId)
  return <section className="arcana-layout" aria-label="Расклад Таро">
    {placement !== null && <div className="arcana-placement" role="status">Выберите ячейку для карты «{arcanaById.get(placement)?.name}» <button type="button" onClick={onCancel}>Отмена</button></div>}
    <div ref={grid} className="arcana-grid" role="group" aria-label="12 ячеек, 4 столбца и 3 строки"
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropSlot(-1) }}>
      <ArcanaConnections grid={grid} interactions={interactions} active={active} />
      {slots.map((instance, index) => {
        const card = instance ? arcanaById.get(instance.arcanaId) : undefined
        const canDrop = dragId !== null && (moving || !instance)
        return <button key={index} type="button" className="arcana-slot" draggable={!!card}
          data-connected={related.has(index)}
          onMouseEnter={() => setHovered(card ? index : -1)} onMouseLeave={() => setHovered(-1)}
          onFocus={() => setHovered(card ? index : -1)} onBlur={() => setHovered(-1)}
          aria-label={`Ячейка ${index + 1}: ${card ? `${card.name}, уровень ${levels[index]}` : 'пусто'}`}
          aria-pressed={card ? card.id === selectedId : false} data-drop={canDrop || placement !== null}
          onClick={() => { if (placement !== null) onPlace(placement, index); else if (card) onInspect(card.id) }}
          onDragStart={(event) => { if (!card) return; onDrag(card.id); event.dataTransfer.setData(ARCANA_DRAG_TYPE, String(card.id)); event.dataTransfer.effectAllowed = 'move' }}
          onDragEnd={() => { setDropSlot(-1); onDrag(null) }} onDragOver={(event) => { if (canDrop) { event.preventDefault(); setDropSlot(index) } else setDropSlot(-1) }}
          onDrop={(event) => { event.preventDefault(); if (canDrop && event.dataTransfer.getData(ARCANA_DRAG_TYPE) === String(dragId)) onPlace(dragId!, index); setDropSlot(-1); onDrag(null) }}>
          <ArcanaCardImage card={card} framed />
          {instance && <span className="arcana-card-level" title={`Ручной уровень: ${instance.level}; бонус: ${levels[index] - instance.level}`}>{levels[index]}</span>}
        </button>
      })}
    </div>
    {activeCard && <div className="arcana-connections-note">
      <span className="arcana-link-positive">● Усиление</span>
      <span className="arcana-link-negative">● Ослабление</span>
      <span>┄ Нет эффекта</span>
      {dragId !== null && needsRandomNeighbor(activeCard) && <p>Случайная цель определяется при размещении.</p>}
    </div>}
  </section>
}
