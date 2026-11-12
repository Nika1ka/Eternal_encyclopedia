import type { BaseAttributes, Character } from '../types/character.ts'
import type { ArcanaSlots } from '../types/arcana.ts'
import type { EquipmentItem, EquipmentSlots } from '../types/equipment.ts'
import { calculateArcanaModifiers } from '../utils/arcanaCalculator.ts'
import { skillAtLevel } from '../utils/skillLevels.ts'
import { calculateHeroAttributes, getActiveEquipmentEffects } from './equipmentModifiers.ts'
import { limitHeroAttributes } from './heroAttributeLimits.ts'

/** Derive the complete build without modifying manually chosen levels or saved data. */
export function calculateHeroBuild(hero: Character, level: number, equipment: EquipmentSlots, slots: ArcanaSlots, items: ReadonlyMap<number, EquipmentItem>) {
  const levels = calculateArcanaModifiers(slots).skillLevelBonuses
  const skills = hero.skills.map((skill) => skillAtLevel(skill, level, { skillLevelBonuses: levels }))
  const preliminary = calculateArcanaModifiers(slots, skills)
  const fairy = hero.skills.find((skill) => skill.skill_image === 'Fairy_passive.png')
  // One pass: the fairy cannot recursively amplify the bonus that amplifies herself.
  const fairyValues = fairy ? skillAtLevel(fairy, level, preliminary).skill_values : []
  const arcana = fairy ? calculateArcanaModifiers(slots, skills, { abilities: fairyValues[0], attributes: fairyValues[1] }) : preliminary
  const raw = calculateHeroAttributes(hero.base_attributes, equipment, items, arcana.attributes, arcana.equipmentLevelBonus, false)
  const resolvedSkills = hero.skills.map((skill) => skillAtLevel(skill, level, { ...raw, ...arcana }))
  const passive = (image: string) => resolvedSkills.find((skill) => skill.skill_image === image)?.skill_values
  const necromancer = passive('Necromancer_passive.png')
  if (necromancer) {
    raw.hp *= 1 - necromancer[0] / 100
    raw.attack_lifesteal = (raw.attack_lifesteal ?? 0) + necromancer[1]
  }
  const demon = passive('Demon_passive.png')
  if (demon) {
    const occupied = slots.filter(Boolean).length
    raw.physical_defense += (12 - occupied) * demon[0]
    raw.magic_resistance += (12 - occupied) * demon[0]
    raw.damage += occupied * demon[1]
  }
  const scale = 1 + arcana.allAttributesPercent / 100
  // Dependent defenses use the health/shield actually shown, not their unmodified bases.
  raw.hp = Math.max(3, raw.hp * scale)
  raw.shield *= scale
  raw.physical_defense += raw.hp * arcana.strengthPerHealth
  raw.magic_resistance += raw.hp * arcana.strengthPerHealth
  const ghost = passive('Ghost_passive.png')
  if (ghost) raw.magic_resistance += raw.shield * ghost[2]
  for (const key of Object.keys(raw) as (keyof BaseAttributes)[]) {
    if (key !== 'hp' && key !== 'shield' && raw[key] !== undefined) raw[key] *= scale
  }
  const attributes = limitHeroAttributes(raw)
  const modifiers = { ...attributes, abilityBonuses: arcana.abilityBonuses, skillLevelBonuses: arcana.skillLevelBonuses,
    skillValueOverrides: fairy ? { [fairy.skill_image]: fairyValues } : undefined }
  const effects = [...getActiveEquipmentEffects(equipment, items, arcana.equipmentLevelBonus), ...arcana.effects]
  return { attributes, modifiers, effects, arcana }
}
