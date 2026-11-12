import type { BaseAttributes } from '../types/character'

/** Source attack-speed units are hundredths of the displayed value. */
export const ATTACK_SPEED_SCALE = 0.01

export const HERO_ATTRIBUTE_LIMITS = Object.freeze({
  minHealth: 3,
  maxPhysicalDefense: 85,
  maxMagicResistance: 85,
  maxDodge: 85,
  minAttackSpeed: 0.5,
  minDamage: 10,
  minCriticalChance: 0,
  minCriticalDamage: 0,
  minSpellCooldown: -75,
  minMovementSpeed: 50,
})

/** Apply once after all bonuses, without changing source or item values. */
export function limitHeroAttributes(attributes: BaseAttributes): BaseAttributes {
  const limits = HERO_ATTRIBUTE_LIMITS
  const result = {
    ...attributes,
    hp: Math.max(limits.minHealth, attributes.hp),
    physical_defense: Math.min(limits.maxPhysicalDefense, attributes.physical_defense),
    magic_resistance: Math.min(limits.maxMagicResistance, attributes.magic_resistance),
    dodge: Math.min(limits.maxDodge, attributes.dodge),
    attack_spead: Math.max(limits.minAttackSpeed / ATTACK_SPEED_SCALE, attributes.attack_spead),
    damage: Math.max(limits.minDamage, attributes.damage),
    critical_chance: Math.max(limits.minCriticalChance, attributes.critical_chance),
    critical_damage: Math.max(limits.minCriticalDamage, attributes.critical_damage),
    speed: Math.max(limits.minMovementSpeed, attributes.speed),
  }
  if (attributes.spell_cooldown !== undefined) {
    result.spell_cooldown = Math.max(limits.minSpellCooldown, attributes.spell_cooldown)
  }
  return result
}
