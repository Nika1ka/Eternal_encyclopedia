import data from '../data/Arcana_cards.json' with { type: 'json' }
import type { ArcanaCard, ArcanaCategory } from '../types/arcana.ts'
import { getAdjacentSlots } from './arcanaAdjacency.ts'

export const arcanaCards = data.arcanaCards as ArcanaCard[]
export const arcanaById = new Map(arcanaCards.map((card) => [card.id, card]))
export const arcanaCategories = [...new Set(arcanaCards.map((card) => card.category))]
export const categoryPresentation: Record<ArcanaCategory, { name: string; genitive: string; color: string }> = {
  Gluttony: { name: 'Чревоугодие', genitive: 'чревоугодия', color: '#958528' },
  Lust: { name: 'Похоть', genitive: 'похоти', color: '#a63b69' },
  Wrath: { name: 'Гнев', genitive: 'гнева', color: '#a83a2d' },
  Sloth: { name: 'Лень', genitive: 'лени', color: '#526685' },
  Envy: { name: 'Зависть', genitive: 'зависти', color: '#66852b' },
  Greed: { name: 'Жадность', genitive: 'жадности', color: '#9b7c25' },
  Pride: { name: 'Гордыня', genitive: 'гордыни', color: '#7861a0' },
}
export const arcanaImagePath = (card: ArcanaCard) => `Game_images/Arcana_cards/${card.category}/${card.file_name}`
export const categoryImagePath = (category: ArcanaCategory) => `Game_images/Arcana_cards/${category}/Arcana_background.png`
export const needsAbility = (card: ArcanaCard) => card.additional_tags.includes('Affects_one_selected_ability')
export const needsRandomNeighbor = (card: ArcanaCard) => card.additional_tags.includes('Affects_one_random_arcana')
export const isArcanaLevelProtected = (id: number) => [11, 16, 37].includes(id)
export const randomArcanaTargets = (card: ArcanaCard, slot: number): number[] => card.id === 37
  ? Array.from({ length: 12 }, (_, index) => index).filter((index) => index !== slot)
  : needsRandomNeighbor(card) ? getAdjacentSlots(slot) : []
export const bonusSections = ['arcanas_bonus', 'attributes_bonus', 'abilities_bonus'] as const
export const bonusTitles = { arcanas_bonus: 'Влияние на соседние Арканы', attributes_bonus: 'Влияние на атрибуты героя', abilities_bonus: 'Влияние на способности героя' }
