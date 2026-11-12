import { useEffect } from 'react'

export const EQUIPPED_SLOT_DRAG_TYPE = 'application/x-eternal-equipped-slot'
export function useEquipmentOutsideDrop(slot: number | null, onRemove: (slot: number) => void) {
  useEffect(() => {
    if (slot === null) return
    const overSlot = (event: DragEvent) => event.target instanceof Element && !!event.target.closest('.equipment-slot')
    const onOver = (event: DragEvent) => {
      if (overSlot(event) || !event.dataTransfer?.types.includes(EQUIPPED_SLOT_DRAG_TYPE)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    }
    const onDrop = (event: DragEvent) => {
      if (overSlot(event) || event.dataTransfer?.getData(EQUIPPED_SLOT_DRAG_TYPE) !== String(slot)) return
      event.preventDefault()
      onRemove(slot)
    }
    document.addEventListener('dragover', onOver)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragover', onOver)
      document.removeEventListener('drop', onDrop)
    }
  }, [slot, onRemove])
}
