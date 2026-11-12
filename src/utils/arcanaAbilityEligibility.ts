import type { ArcanaCard } from '../types/arcana.ts'
import type { Skill } from '../types/character.ts'

const nonzero = (value: number | undefined) => value !== undefined && Number.isFinite(value) && value !== 0
/** Inspect the concrete ability, not the hero's aggregate spell-damage stat. */
export function canAssignArcanaAbility(card: ArcanaCard, skill: Skill): boolean {
  const bonus = card.abilities_bonus
  if (!bonus) return false
  if (bonus.bonus_type === 'unique') return true
  switch (bonus.attribute_name) {
    case 'Spell_damage': return nonzero(skill.damage)
    case 'Spell_cooldown': return nonzero(skill.cooldown)
    case 'Spell_duration': return nonzero(skill.duration)
    case 'Spell_radius': return nonzero(skill.range)
    case 'First_value': return nonzero(skill.skill_values[0])
    case 'Last_value': return nonzero(skill.skill_values.at(-1))
    case 'All_values': return skill.skill_values.some(nonzero)
    case 'Additional_effect_value': return !!skill.additional_effects?.some((effect) => effect.effects_values.some(nonzero))
    default: return false
  }
}
