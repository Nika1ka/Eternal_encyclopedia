import type { ArcanaSlots } from '../types/arcana.ts'
export const ARCANA_DRAG_TYPE = 'application/x-eternal-arcana'
export function outsideArcanaDropSlot(slots: ArcanaSlots, draggingId: number | null, payload: string, overSlot: boolean) {
  if (overSlot || draggingId === null || payload !== String(draggingId)) return -1
  return slots.findIndex((instance) => instance?.arcanaId === draggingId)
}
