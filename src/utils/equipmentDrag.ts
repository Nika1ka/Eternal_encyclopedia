export const EQUIPMENT_DRAG_TYPE = 'application/x-eternal-battle-item'
export function readEquipmentDrop(payload: string, draggingId: number | null, validIds: ReadonlySet<number>): number | null {
  if (!/^\d+$/.test(payload)) return null
  const id = Number(payload)
  return id === draggingId && validIds.has(id) ? id : null
}
