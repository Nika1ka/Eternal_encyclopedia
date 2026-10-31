import { useState } from 'react'
import type { EquipmentInstance, ItemLevel } from '../../types/equipment'
import { equipmentById, itemImage } from '../../utils/equipmentData'
import { uiAsset } from '../../utils/characterAssets'
import { EquipmentImage } from './EquipmentIcon'
import { EquipmentLevelSelector } from './EquipmentLevelSelector'
import { EQUIPMENT_DRAG_TYPE, readEquipmentDrop } from '../../utils/equipmentDrag'
import { EQUIPPED_SLOT_DRAG_TYPE } from '../../hooks/useEquipmentOutsideDrop'

const validIds = new Set(equipmentById.keys())
export interface EquipmentSlotActions {
  draggingItemId: number | null
  canEquip: (itemId: number, slot: number) => boolean
  onInspectSlot: (slot: number, anchor: DOMRect) => void
  onEquip: (itemId: number, slot: number) => void
  onItemLevel: (slot: number, level: ItemLevel) => void
  onDragSlot: (slot: number | null) => void
}
export function EquipmentSlot({ instance, index, actions }: {
  instance: EquipmentInstance | null; index: number; actions: EquipmentSlotActions
}) {
  const [over, setOver] = useState(false)
  const [lastDrag, setLastDrag] = useState(actions.draggingItemId)
  if (lastDrag !== actions.draggingItemId) {
    setLastDrag(actions.draggingItemId)
    setOver(false)
  }
  const item = instance && equipmentById.get(instance.itemId)
  const canDrop = actions.draggingItemId !== null && actions.canEquip(actions.draggingItemId, index)
  return <div className={`arc-slot equipment-slot equipment-slot-${index}`} data-loadout
    data-drop-ready={canDrop} data-drop-over={over && canDrop}
    onDragOver={(event) => {
      if (!canDrop || !event.dataTransfer.types.includes(EQUIPMENT_DRAG_TYPE)) return
      event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setOver(true)
    }}
    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false) }}
    onDrop={(event) => {
      event.preventDefault(); setOver(false)
      const id = readEquipmentDrop(event.dataTransfer.getData(EQUIPMENT_DRAG_TYPE), actions.draggingItemId, validIds)
      if (id !== null && actions.canEquip(id, index)) actions.onEquip(id, index)
    }}>
    <img className="slot-frame" src={uiAsset('additional_icons/skill_frame.png')} alt="" />
    <button type="button" className="equipment-slot-button" data-equipment-inspect
      draggable={!!item}
      onDragStart={(event) => {
        if (!item) { event.preventDefault(); return }
        event.dataTransfer.setData(EQUIPPED_SLOT_DRAG_TYPE, String(index))
        event.dataTransfer.effectAllowed = 'move'
        actions.onDragSlot(index)
      }}
      onDragEnd={() => actions.onDragSlot(null)}
      aria-label={item ? `Слот ${index + 1}: ${item.name}, уровень ${instance!.level}` : `Пустой слот ${index + 1}: выбрать предмет`}
      title={item?.name ?? 'Выбрать предмет'} onClick={(event) => actions.onInspectSlot(index, event.currentTarget.getBoundingClientRect())}>
      {item && <EquipmentImage src={itemImage(item)} />}
    </button>
    {instance && item && <div className="equipment-stars"><EquipmentLevelSelector level={instance.level}
      label={`${item.name}, уровень в слоте ${index + 1}`} onChange={(level) => actions.onItemLevel(index, level)} /></div>}
  </div>
}
