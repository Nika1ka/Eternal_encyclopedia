import type { BaseAttributes } from '../types/character'

interface AttributeDefinition {
  key: keyof BaseAttributes; label: string; icon: string; percent?: boolean; lowerIsBetter?: boolean
}
export const equipmentAttributes: Record<string, AttributeDefinition> = {
  Health: { key: 'hp', label: 'Здоровье', icon: 'health' },
  Shield: { key: 'shield', label: 'Щит', icon: 'Shield' },
  Attack_damage: { key: 'damage', label: 'Урон', icon: 'attack_damage' },
  Attack_speed: { key: 'attack_spead', label: 'Скорость атаки', icon: 'attack_speed' },
  Evasion_chance: { key: 'dodge', label: 'Уклонение', icon: 'evasion_chance', percent: true },
  Physical_defense: { key: 'physical_defense', label: 'Физическая защита', icon: 'physical_defense', percent: true },
  Magic_resistance: { key: 'magic_resistance', label: 'Магическая защита', icon: 'magic_resistance', percent: true },
  Critical_hit_amount: { key: 'critical_damage', label: 'Размер крит. удара', icon: 'critical_hit', percent: true },
  Critical_hit_chance: { key: 'critical_chance', label: 'Шанс крит. удара', icon: 'critical_hit', percent: true },
  Movement_speed: { key: 'speed', label: 'Скорость передвижения', icon: 'movement_speed' },
  Spell_damage: { key: 'spell_damage', label: 'Урон заклинаний', icon: 'spell_damage', percent: true },
  Spell_cooldown: { key: 'spell_cooldown', label: 'Перезарядка способностей', icon: 'spell_cooldown', percent: true, lowerIsBetter: true },
  Building_damage: { key: 'building_damage', label: 'Урон постройкам', icon: 'building_damage', percent: true },
  Slow_effectiveness: { key: 'slow_effectiveness', label: 'Сопротивление замедлению', icon: 'slow_effectiveness', percent: true },
  Effect_resistance: { key: 'effect_resistance', label: 'Сопротивление эффектам', icon: 'effect_resistance', percent: true },
}

// These parameters describe penalties or waiting times in the supplied ability text.
export const lowerIsBetterAbilityValues: Record<string, readonly string[]> = {
  Spell_Reflection: ['value3'], Doom: ['value3'], Inexorable_Fate: ['value3'],
  Divine_Restoration: ['value3'], Heroism: ['value2'], Piercing_Shot: ['value3'], Resurrection: ['value1'],
}
export function modifierTone(value: number, lowerIsBetter = false) {
  if (value === 0) return 'neutral'
  return (lowerIsBetter ? -value : value) > 0 ? 'positive' : 'negative'
}
