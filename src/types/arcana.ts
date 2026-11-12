export type ArcanaCategory = 'Gluttony' | 'Lust' | 'Wrath' | 'Sloth' | 'Envy' | 'Greed' | 'Pride'
export type ArcanaBonus = { bonus_type: 'basic'; attribute_name: string; attribute_bonus: number; upgrade_bonus: number }
  | { bonus_type: 'unique'; bonus_description: string; bonus_value: number; upgrade_bonus: number }
export interface ArcanaCard {
  id: number
  name: string
  file_name: string
  card_type: 'Standart_Arcana' | 'Major_Arcana'
  major_arcana_number?: number
  category: ArcanaCategory
  game_description: string
  additional_tags: string[]
  arcanas_bonus?: ArcanaBonus
  attributes_bonus?: ArcanaBonus
  abilities_bonus?: ArcanaBonus
}
export interface ArcanaInstance {
  arcanaId: number
  level: number
  selectedAbilityId?: string
  randomTargetSlot?: number
}
export type ArcanaSlots = readonly (ArcanaInstance | null)[]
export type ArcanaAction =
  | { type: 'place'; arcanaId: number; slot: number }
  | { type: 'move'; from: number; to: number }
  | { type: 'remove'; slot: number }
  | { type: 'level'; slot: number; level: number }
  | { type: 'ability'; slot: number; abilityId: string }
