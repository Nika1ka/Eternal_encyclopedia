import { useEffect } from 'react'
import type { ArcanaSlots } from '../types/arcana'
import { ARCANA_DRAG_TYPE, outsideArcanaDropSlot } from '../utils/arcanaDrag'

export function useArcanaOutsideDrop(slots: ArcanaSlots, dragId: number | null, onRemove: (slot: number) => void) {
  useEffect(() => {
    if (dragId === null || !slots.some((entry) => entry?.arcanaId === dragId)) return
    const overSlot = (event: DragEvent) => event.target instanceof Element && !!event.target.closest('.arcana-slot')
    const onOver = (event: DragEvent) => {
      if (overSlot(event) || !event.dataTransfer?.types.includes(ARCANA_DRAG_TYPE)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    }
    const onDrop = (event: DragEvent) => {
      const index = outsideArcanaDropSlot(slots, dragId, event.dataTransfer?.getData(ARCANA_DRAG_TYPE) ?? '', overSlot(event))
      if (index < 0) return
      event.preventDefault()
      onRemove(index)
    }
    // Only an actual drop removes a card: Escape/dragend/outside the window do not.
    document.addEventListener('dragover', onOver)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragover', onOver)
      document.removeEventListener('drop', onDrop)
    }
  }, [slots, dragId, onRemove])
}
