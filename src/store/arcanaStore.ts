import type { ArcanaAction, ArcanaSlots } from '../types/arcana.ts'
import { arcanaById, randomArcanaTargets } from '../utils/arcanaData.ts'
import type { Skill } from '../types/character.ts'
import { canAssignArcanaAbility } from '../utils/arcanaAbilityEligibility.ts'

/** Call on a committed edit, never from a render or the bonus calculator. */
export function reconcileArcanaTargets(slots: ArcanaSlots, random: () => number): ArcanaSlots {
  return slots.map((instance, index) => {
    if (!instance) return null
    const card = arcanaById.get(instance.arcanaId)
    if (!card || !card.arcanas_bonus) return instance
    const candidates = randomArcanaTargets(card, index)
    if (!candidates.length) return instance
    if (instance.randomTargetSlot !== undefined && candidates.includes(instance.randomTargetSlot)) return instance
    const { randomTargetSlot: oldTarget, ...rest } = instance
    void oldTarget
    if (!candidates.length) return rest
    const target = candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)))]
    return { ...rest, randomTargetSlot: target }
  })
}

export const EMPTY_ARCANA: ArcanaSlots = Object.freeze(Array(12).fill(null))
const validSlot = (index: number) => Number.isInteger(index) && index >= 0 && index < 12
export function reduceArcana(slots: ArcanaSlots, action: ArcanaAction, abilityIds: ReadonlySet<string>, skills?: readonly Skill[]): ArcanaSlots {
  const next = [...slots]
  if (action.type === 'move') {
    if (!validSlot(action.from) || !validSlot(action.to) || !slots[action.from]) return slots
    ;[next[action.from], next[action.to]] = [next[action.to], next[action.from]]
    return next
  }
  if (!validSlot(action.slot)) return slots
  const instance = slots[action.slot]
  if (action.type === 'place') {
    if (!arcanaById.has(action.arcanaId) || slots.some((entry) => entry?.arcanaId === action.arcanaId) || instance) return slots
    next[action.slot] = { arcanaId: action.arcanaId, level: 1 }
  } else if (action.type === 'remove') next[action.slot] = null
  else if (!instance) return slots
  else if (action.type === 'level') {
    if (!Number.isInteger(action.level) || action.level < 1 || action.level > 15) return slots
    next[action.slot] = { ...instance, level: action.level }
  } else {
    if (!abilityIds.has(action.abilityId)) return slots
    if (skills) {
      const skill = skills.find((entry) => entry.skill_image === action.abilityId)
      const card = arcanaById.get(instance.arcanaId)
      if (!skill || !card || !canAssignArcanaAbility(card, skill)) return slots
    }
    next[action.slot] = { ...instance, selectedAbilityId: action.abilityId }
  }
  return next
}

export function restoreArcana(value: unknown, abilityIds: ReadonlySet<string>): ArcanaSlots {
  if (!Array.isArray(value)) return EMPTY_ARCANA
  const seen = new Set<number>()
  const restored: ArcanaSlots = Array.from({ length: 12 }, (_, index) => {
    const item = value[index]
    if (!item || typeof item !== 'object' || !arcanaById.has(item.arcanaId) || seen.has(item.arcanaId) ||
      !Number.isInteger(item.level) || item.level < 1 || item.level > 15) return null
    seen.add(item.arcanaId)
    return { arcanaId: item.arcanaId as number, level: item.level as number,
      ...(abilityIds.has(item.selectedAbilityId) ? { selectedAbilityId: item.selectedAbilityId as string } : {}),
      ...(Number.isInteger(item.randomTargetSlot) ? { randomTargetSlot: item.randomTargetSlot as number } : {}),
    }
  })
  return restored.map((instance, index) => {
    if (!instance) return instance
    const card = arcanaById.get(instance.arcanaId)!
    const { randomTargetSlot: invalidTarget, ...rest } = instance
    void invalidTarget
    const candidates = randomArcanaTargets(card, index)
    if (candidates.length && card.arcanas_bonus) {
      if (instance.randomTargetSlot !== undefined && candidates.includes(instance.randomTargetSlot)) return instance
      // Migrate old saves from a card ID to its occupied slot. Missing/invalid targets
      // receive a stable adjacent slot without generating randomness during restore.
      const legacyId = value[index]?.randomTargetArcanaId
      const migrated = typeof legacyId === 'number' ? candidates.find((slot) => restored[slot]?.arcanaId === legacyId) : undefined
      return { ...rest, randomTargetSlot: migrated ?? candidates[0] }
    }
    return rest
  })
}
