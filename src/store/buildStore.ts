import type { EquipmentItem, EquipmentSlots, ItemLevel } from '../types/equipment'
import type { ArcanaSlots } from '../types/arcana'

export interface BuildState {
  selectedHeroId: number
  heroLevels: Record<number, number>
  equipmentByHero: Record<number, EquipmentSlots>
  arcanaByHero: Record<number, ArcanaSlots>
  variantsByHero: Record<number, Record<string, number>>
}
export type BuildAction =
  | { type: 'selectHero'; heroId: number }
  | { type: 'skillVariant'; skillId: string; variant: number }
  | { type: 'heroLevel'; level: number }
  | { type: 'equip'; itemId: number; slot: number }
  | { type: 'unequip'; slot: number }
  | { type: 'itemLevel'; slot: number; level: ItemLevel }
  | { type: 'arcana'; slots: ArcanaSlots }

export const EMPTY_SLOTS: EquipmentSlots = [null, null, null]
export const createBuildState = (heroId: number): BuildState => ({ selectedHeroId: heroId, heroLevels: {}, equipmentByHero: {}, arcanaByHero: {}, variantsByHero: {} })
export function canEquipItem(items: ReadonlyMap<number, EquipmentItem>, slots: EquipmentSlots, itemId: number, slot: number) {
  const item = items.get(itemId)
  return !!item && Number.isInteger(slot) && slot >= 0 && slot < 3 && !slots.some((instance, index) =>
    index !== slot && instance !== null && items.get(instance.itemId)?.item_group === item.item_group)
}

export function createBuildReducer(items: ReadonlyMap<number, EquipmentItem>, heroIds: ReadonlySet<number>) {
  return (state: BuildState, action: BuildAction): BuildState => {
    if (action.type === 'selectHero') return heroIds.has(action.heroId) ? { ...state, selectedHeroId: action.heroId } : state
    const heroId = state.selectedHeroId
    if (action.type === 'skillVariant') return Number.isInteger(action.variant) && action.variant >= 0
      ? { ...state, variantsByHero: { ...state.variantsByHero, [heroId]: { ...state.variantsByHero[heroId], [action.skillId]: action.variant } } } : state
    if (action.type === 'arcana') return { ...state, arcanaByHero: { ...state.arcanaByHero, [heroId]: action.slots } }
    if (action.type === 'heroLevel') {
      return Number.isInteger(action.level) && action.level >= 1 && action.level <= 5
        ? { ...state, heroLevels: { ...state.heroLevels, [heroId]: action.level } } : state
    }
    if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot > 2) return state
    const slots = [...(state.equipmentByHero[heroId] ?? EMPTY_SLOTS)] as [EquipmentSlots[0], EquipmentSlots[1], EquipmentSlots[2]]
    if (action.type === 'equip') {
      if (!canEquipItem(items, slots, action.itemId, action.slot)) return state
      slots[action.slot] = { itemId: action.itemId, level: 1 }
    } else if (action.type === 'unequip') slots[action.slot] = null
    else {
      const item = slots[action.slot]
      if (!item || ![1, 2, 3].includes(action.level)) return state
      slots[action.slot] = { ...item, level: action.level }
    }
    return { ...state, equipmentByHero: { ...state.equipmentByHero, [heroId]: slots } }
  }
}
