import type { BaseAttributes, HeroEffect, Skill } from '../types/character.ts'
import { canAssignArcanaAbility } from './arcanaAbilityEligibility.ts'
import type { ArcanaBonus, ArcanaCard, ArcanaSlots } from '../types/arcana.ts'
import { arcanaById, arcanaImagePath, bonusSections, needsAbility, needsRandomNeighbor, isArcanaLevelProtected } from './arcanaData.ts'
import { getAdjacentSlots } from './arcanaAdjacency.ts'
import { equipmentAttributes } from './equipmentAttributes.ts'
import { formatNumber } from './formatAttributes.ts'
import type { AbilityBonuses } from './skillLevels.ts'

export function getArcanaLevelBonus(bonus: ArcanaBonus, level: number) {
  return (bonus.bonus_type === 'basic' ? bonus.attribute_bonus : bonus.bonus_value) + bonus.upgrade_bonus * (level - 1)
}
export function getArcanaNeighbors(slots: ArcanaSlots, index: number) {
  return getAdjacentSlots(index).flatMap((slot) => slots[slot] ? [{ slot, instance: slots[slot]! }] : [])
}
/** Level grants use manual source levels. Lovers, Judgement and Emperor cannot receive grants. */
export function effectiveArcanaLevels(slots: ArcanaSlots): number[] {
  const extra = Array(12).fill(0) as number[]
  const chariot = slots.some((instance) => instance?.arcanaId === 39)
  slots.forEach((instance, from) => {
    if (!instance || ![11, 16, 37].includes(instance.arcanaId)) return
    const bonus = arcanaById.get(instance.arcanaId)?.arcanas_bonus
    if (!bonus) return
    const targets = instance.arcanaId === 11 ? getAdjacentSlots(from) : instance.randomTargetSlot === undefined ? [] : [instance.randomTargetSlot]
    for (const to of targets) {
      if (to === from || !slots[to] || isArcanaLevelProtected(slots[to]!.arcanaId)) continue
      if (instance.arcanaId === 16 && !getAdjacentSlots(from).includes(to)) continue
      extra[to] += Math.max(0, Math.floor(getArcanaLevelBonus(bonus, instance.level)))
    }
  })
  return slots.map((instance, index) => !instance ? 0 : Math.min(20, instance.level + extra[index] +
    (chariot && !isArcanaLevelProtected(instance.arcanaId) ? 1 : 0)))
}
/** Only level-adjusted source arcanas_bonus contributes. It can never amplify itself. */
export function arcanaInteractions(slots: ArcanaSlots) {
  const levels = effectiveArcanaLevels(slots)
  const interactions: { from: number; to: number; value: number }[] = []
  slots.forEach((instance, index) => {
    const card = instance && arcanaById.get(instance.arcanaId)
    const bonus = card?.arcanas_bonus
    if (!instance || !card || !bonus || bonus.bonus_type !== 'basic') return
    for (const neighbor of getArcanaNeighbors(slots, index)) {
      if (needsRandomNeighbor(card) && neighbor.slot !== instance.randomTargetSlot) continue
      const value = getArcanaLevelBonus(bonus, levels[index])
      if (value !== 0) interactions.push({ from: index, to: neighbor.slot, value })
    }
  })
  return interactions
}
export function temporaryAmplification(slots: ArcanaSlots): number[] {
  const amplification = Array(12).fill(0) as number[]
  for (const { to, value } of arcanaInteractions(slots)) amplification[to] += value
  return amplification
}
export interface ArcanaEfficiency { attributes?: number; abilities?: number }
export function resolvedArcanaBonuses(card: ArcanaCard, level: number, amplification = 0, efficiency: ArcanaEfficiency = {}) {
  return Object.fromEntries(bonusSections.flatMap((key) => {
    const bonus = card[key]
    const levelGrant = (card.id === 5 && key === 'abilities_bonus') || (card.id === 29 && key === 'attributes_bonus')
    const scale = key === 'arcanas_bonus' || levelGrant ? 1 : (1 + amplification / 100) *
      (1 + (key === 'attributes_bonus' ? efficiency.attributes ?? 0 : efficiency.abilities ?? 0) / 100)
    const value = bonus ? getArcanaLevelBonus(bonus, level) * scale : 0
    return bonus ? [[key, key === 'arcanas_bonus' && [11, 16, 37].includes(card.id) ? Math.floor(value) : value]] : []
  })) as Partial<Record<typeof bonusSections[number], number>>
}
export function uniqueDescription(bonus: Extract<ArcanaBonus, { bonus_type: 'unique' }>, value: number) {
  return bonus.bonus_description.replace(/([+-]?)\$\{bonus_value\}/g, (_, sign: string) =>
    sign === '-' ? formatNumber(-Math.abs(value)) : `${sign === '+' && value >= 0 ? '+' : ''}${formatNumber(value)}`)
}
export const arcanaAttributeDefinitions: typeof equipmentAttributes = {
  ...equipmentAttributes,
  Critical_damage: equipmentAttributes.Critical_hit_amount,
  Critical_chance: equipmentAttributes.Critical_hit_chance,
}
export const abilityLabels: Record<string, string> = {
  Spell_damage: 'Урон заклинаний', Spell_cooldown: 'Перезарядка способностей', Spell_duration: 'Длительность способностей',
  Spell_radius: 'Радиус способностей', First_value: 'Первое значение способности', Last_value: 'Последнее значение способности',
  All_values: 'Все значения способности', Additional_effect_value: 'Значения дополнительных эффектов',
}
export function calculateArcanaModifiers(slots: ArcanaSlots, skills?: readonly Skill[], efficiency: ArcanaEfficiency = {}) {
  const levels = effectiveArcanaLevels(slots)
  const skillLevelBonuses: Record<string, number> = {}
  let equipmentLevelBonus = 0, strengthPerHealth = 0, allAttributesPercent = 0
  const amplification = temporaryAmplification(slots)
  const attributes: Partial<BaseAttributes> = {}
  const abilityBonuses: Record<string, AbilityBonuses> = {}
  const effects: HeroEffect[] = []
  slots.forEach((instance, index) => {
    if (!instance) return
    const card = arcanaById.get(instance.arcanaId)
    if (!card) return
    const resolved = resolvedArcanaBonuses(card, levels[index], amplification[index], efficiency)
    for (const section of bonusSections) {
      const bonus = card[section]
      if (!bonus) continue
      const value = resolved[section]!
      if (bonus.bonus_type === 'unique') {
        if (card.id === 5 && instance.selectedAbilityId && (!skills || skills.some((skill) => skill.skill_image === instance.selectedAbilityId))) skillLevelBonuses[instance.selectedAbilityId] = 1
        if (card.id === 29) equipmentLevelBonus = Math.max(0, Math.floor(value))
        if (card.id === 9) strengthPerHealth += value
        if (card.id === 39) allAttributesPercent += value
        if (card.id === 40) {
          const total = getAdjacentSlots(index).reduce((sum, slot) => sum + levels[slot], 0) * value * (1 + (efficiency.attributes ?? 0) / 100)
          attributes.damage = (attributes.damage ?? 0) + total
          attributes.spell_damage = (attributes.spell_damage ?? 0) + total
        }
        effects.push({ id: `arcana-${card.id}-${section}`, name: card.name,
          description: `Уровень ${levels[index]}\n${uniqueDescription(bonus, value)}`, image: arcanaImagePath(card),
          arcana: { level: levels[index] } })
      } else if (section === 'attributes_bonus') {
        const definition = arcanaAttributeDefinitions[bonus.attribute_name]
        if (definition) attributes[definition.key] = (attributes[definition.key] ?? 0) + value
      } else if (section === 'abilities_bonus') {
        const target = needsAbility(card) ? instance.selectedAbilityId : '*'
        if (!target) continue
        if (target !== '*' && skills) {
          const skill = skills.find((entry) => entry.skill_image === target)
          if (!skill || !canAssignArcanaAbility(card, skill)) continue
        }
        // Global damage/cooldown belong to the same hero totals as equipment.
        if (target === '*' && (bonus.attribute_name === 'Spell_damage' || bonus.attribute_name === 'Spell_cooldown')) {
          const key = bonus.attribute_name === 'Spell_damage' ? 'spell_damage' : 'spell_cooldown'
          attributes[key] = (attributes[key] ?? 0) + value
        } else {
          const values = abilityBonuses[target] ??= {}
          values[bonus.attribute_name] = (values[bonus.attribute_name] ?? 0) + value
        }
      }
    }
  })
  return { attributes, abilityBonuses, effects, amplification, levels, skillLevelBonuses, equipmentLevelBonus, strengthPerHealth, allAttributesPercent, efficiency }
}
