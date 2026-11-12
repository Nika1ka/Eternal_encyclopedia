export type ItemLevel = 1 | 2 | 3
export interface EquipmentItem {
  id: number
  name: string
  file_name: string
  rarity: number
  item_group: number
  game_description: string
  position_in_shop: number[]
  craft_price: { cost: number; components: string[]; components_amount: number[] }
  attributes_list: { attributes_name: string[]; attributes_bonus: number[] }
  item_abilities: { ability_image: string; name: string; info: string }[]
  skill_values: number[]
  upgrade_bonuses: {
    attributes_name: string[]; attributes_bonus: number[]
    skill_value_tags: string[]; skill_bonus: number[]
  }
}
export interface EquipmentInstance { itemId: number; level: ItemLevel }
export type EquipmentSlots = readonly [EquipmentInstance | null, EquipmentInstance | null, EquipmentInstance | null]
export interface EquipmentInspection {
  itemId: number
  slot: number | null
  previewLevel: ItemLevel
  anchor: { left: number; right: number; top: number }
}
