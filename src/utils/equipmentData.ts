import data from '../data/Equipment.json'
import type { EquipmentItem } from '../types/equipment'
import { assetUrl } from './characterAssets'

export const equipmentItems: EquipmentItem[] = data.items
export const equipmentById = new Map(equipmentItems.map((item) => [item.id, item]))
export const itemImage = (item: EquipmentItem) => assetUrl(`Game_images/Items/Icons/${item.file_name === 'Midnight_Prism.png' ? 'Midnight_Prism.png.png' : item.file_name}`)
export const itemAbilityImage = (name: string) => assetUrl(`Game_images/Items/Skills/${name}.png`)
export const resourceImage = (name: string) => assetUrl(`Game_images/Items/Resources/${name}.png`)
export const rarities = [
  { name: 'Обычные', color: '#D5D7E0' },
  { name: 'Редкие', color: '#4C91FF' },
  { name: 'Древние', color: '#58C77B' },
  { name: 'Мифические', color: '#A17BFF' },
  { name: 'Легендарные', color: '#D84A52' },
] as const
