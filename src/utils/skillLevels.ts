import type { BaseAttributes, Skill } from '../types/character'

export type AbilityBonuses = Record<string, number>
export type SpellModifiers = Pick<BaseAttributes, 'spell_damage' | 'spell_cooldown'> & {
  abilityBonuses?: Record<string, AbilityBonuses>; skillLevelBonuses?: Record<string, number>
  skillValueOverrides?: Record<string, readonly number[]>
}

export const effectiveSkillLevel = (skill: Skill, level: number, modifiers: SpellModifiers = {}) =>
  Math.min(6, Math.max(1, Math.min(5, Math.trunc(level))) + Math.max(0, Math.floor(modifiers.skillLevelBonuses?.[skill.skill_image] ?? 0)))

/** Recalculate from the source so lowering a level never retains old bonuses. */
export function skillAtLevel(skill: Skill, level: number, modifiers: SpellModifiers = {}): Skill {
  const effectiveLevel = effectiveSkillLevel(skill, level, modifiers)
  const result: Skill = { ...skill, skill_values: [...skill.skill_values] }
  if (effectiveLevel > Math.min(5, Math.max(1, Math.trunc(level)))) result.effective_level = effectiveLevel
  const upgrades = skill.upgrade_per_level_bonuses
  const count = effectiveLevel - 1
  for (let index = 0; index < count; index++) {
    const tag = upgrades.skill_per_level_value_tags[index]
    const bonus = upgrades.skill_per_level_bonus[index]
    if (!tag || bonus === undefined) continue
    const valueMatch = /^value([1-9]\d*)$/.exec(tag)
    if (valueMatch) {
      const valueIndex = Number(valueMatch[1]) - 1
      if (result.skill_values[valueIndex] !== undefined) {
        result.skill_values[valueIndex] += bonus
      }
    } else if (tag === 'duration' || tag === 'damage' || tag === 'range' || tag === 'cooldown') {
      const value = result[tag]
      if (value !== undefined) result[tag] = tag === 'cooldown' ? value - bonus : value + bonus
    }
  }
  const global = modifiers.abilityBonuses?.['*'] ?? {}
  const targeted = modifiers.abilityBonuses?.[skill.skill_image] ?? {}
  const bonus = (key: string) => (global[key] ?? 0) + (targeted[key] ?? 0)
  if (result.damage !== undefined) result.damage *= 1 + ((modifiers.spell_damage ?? 0) + bonus('Spell_damage')) / 100
  if (result.cooldown !== undefined) result.cooldown *= 1 + Math.max(-75, (modifiers.spell_cooldown ?? 0) + bonus('Spell_cooldown')) / 100
  if (result.duration !== undefined) result.duration *= 1 + bonus('Spell_duration') / 100
  if (result.range !== undefined) result.range *= 1 + bonus('Spell_radius') / 100
  result.skill_values = result.skill_values.map((value, index, values) => value * (1 + (bonus('All_values') +
    (index === 0 ? bonus('First_value') : 0) + (index === values.length - 1 ? bonus('Last_value') : 0)) / 100))
  const override = modifiers.skillValueOverrides?.[skill.skill_image]
  if (override) result.skill_values = [...override]
  if (result.additional_effects && bonus('Additional_effect_value')) result.additional_effects = result.additional_effects.map((effect) => ({
    ...effect, effects_values: effect.effects_values.map((value) => value * (1 + bonus('Additional_effect_value') / 100)),
  }))
  return result
}
