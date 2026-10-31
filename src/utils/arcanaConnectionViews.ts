import type { ArcanaSlots } from '../types/arcana.ts'
import { arcanaInteractions, getArcanaLevelBonus } from './arcanaCalculator.ts'
import { getAdjacentSlots } from './arcanaAdjacency.ts'
import { arcanaById, needsRandomNeighbor, isArcanaLevelProtected } from './arcanaData.ts'

/** Presentation only: neutral links and documented unique neighbor effects do not modify bonuses. */
export function arcanaConnectionViews(slots: ArcanaSlots) {
  const calculated = arcanaInteractions(slots)
  return slots.flatMap((instance, from) => {
    if (!instance) return []
    const card = arcanaById.get(instance.arcanaId)
    return getAdjacentSlots(from).map((to) => {
      let value = calculated.find((edge) => edge.from === from && edge.to === to)?.value ?? 0
      // Lovers grants levels to all neighbors; Judgement grants levels to its stored random neighbor.
      // Emperor, Magician and Fool do not grant a known effect to a specific neighboring card.
      if (slots[to] && !isArcanaLevelProtected(slots[to]!.arcanaId) && card && (card.id === 11 || card.id === 16) && card.arcanas_bonus?.bonus_type === 'unique' &&
        (!needsRandomNeighbor(card) || instance.randomTargetSlot === to)) {
        value = Math.floor(getArcanaLevelBonus(card.arcanas_bonus, instance.level))
      }
      return { from, to, value }
    })
  })
}
