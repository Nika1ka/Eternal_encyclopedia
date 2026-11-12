import type { Skill } from '../types/character'
import { formatSkillDescription } from './formatAttributes.ts'

export function orderedSkills(skills: readonly Skill[]) {
  return [
    ...skills.filter((skill) => skill.skill_image.endsWith('_passive.png')),
    ...skills.filter((skill) => !skill.skill_image.endsWith('_passive.png')),
  ]
}

export function nextSkillVariant(skill: Skill, current: number, direction: -1 | 1) {
  const count = 1 + (skill.additional_effects?.length ?? 0)
  return (current + direction + count) % count
}

export function skillVariant(skill: Skill, index: number) {
  const effect = index > 0 ? skill.additional_effects?.[index - 1] : undefined
  const base = formatSkillDescription(skill)
  const extra = effect ? formatSkillDescription({ info: effect.info, skill_values: effect.effects_values }) : ''
  return {
    name: effect?.name ?? skill.name,
    image: effect?.skill_effect_image ?? skill.skill_image,
    folder: effect ? 'Alternative_skills' : 'Skills',
    description: effect ? `${base}\n\n${effect.name}\n${extra}` : base,
  }
}
