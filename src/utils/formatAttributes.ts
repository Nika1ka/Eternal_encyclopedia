import type { BaseAttributes, Skill } from '../types/character'

import { ATTACK_SPEED_SCALE } from '../engine/heroAttributeLimits.ts'

/** Floor display values (hundredths by default); preserve full calculation precision. */
export function formatNumber(value: number, decimals: 1 | 2 = 2) {
  const scale = 10 ** decimals
  const scaled = value * scale
  const nearest = Math.round(scaled)
  // Avoid losing a hundredth to floating-point noise (e.g. 1.15 * 100).
  const stable = Math.abs(scaled - nearest) <= Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4
    ? nearest : scaled
  return String(Math.floor(stable) / scale)
}
export const percent = (value: number) => `${formatNumber(value)}%`
export const bonusPercent = (value: number) => `${value > 0 ? '+' : ''}${percent(value)}`

export function formatSkillDescription(skill: Pick<Skill, 'info' | 'skill_values'>) {
  return skill.info.replace(/\$\{value(\d+)\}/g, (placeholder, index: string) => {
    const value = skill.skill_values[Number(index) - 1]
    return value === undefined ? placeholder : formatNumber(value)
  })
}

export function skillParameters(skill: Skill) {
  const parameters = [
    ['Урон', skill.damage, ''],
    ['Перезарядка', skill.cooldown, ' с'],
    ['Дальность / радиус', skill.range, ''],
    ['Длительность', skill.duration, ' с'],
  ] as const
  return parameters.flatMap(([label, value, unit]) =>
    value !== undefined && value !== 0 ? [{ label, value: `${formatNumber(value)}${unit}` }] : [],
  )
}

export function heroStatColumns(a: BaseAttributes) {
  const formatStatNumber = (value: number) => formatNumber(value, 1)
  const percent = (value: number) => `${formatStatNumber(value)}%`
  const bonusPercent = (value: number) => `${value > 0 ? '+' : ''}${percent(value)}`
  return [
    [
      { icon: 'physical_defense', label: 'Физическая защита', value: percent(a.physical_defense) },
      { icon: 'magic_resistance', label: 'Магическая защита', value: percent(a.magic_resistance) },
      { icon: 'evasion_chance', label: 'Уклонение', value: percent(a.dodge) },
      { icon: 'attack_damage', label: 'Урон от атаки', value: formatStatNumber(a.damage) },
      { icon: 'attack_speed', label: 'Скорость атаки', value: formatStatNumber(a.attack_spead * ATTACK_SPEED_SCALE) },
      { icon: 'critical_hit', label: 'Критический урон (шанс)', value: `${bonusPercent(a.critical_damage)} (${percent(a.critical_chance)})` },
    ],
    [
      { icon: 'movement_speed', label: 'Скорость передвижения', value: formatStatNumber(a.speed) },
      { icon: 'spell_damage', label: 'Урон от заклинаний', value: percent(a.spell_damage ?? 0) },
      { icon: 'spell_cooldown', label: 'Снижение перезарядки', value: percent(a.spell_cooldown ?? 0) },
      { icon: 'building_damage', label: 'Урон по постройкам', value: percent(a.building_damage ?? 0) },
      { icon: 'slow_effectiveness', label: 'Сопротивление замедлению', value: percent(a.slow_effectiveness ?? 0) },
      { icon: 'effect_resistance', label: 'Сопротивление эффектам', value: percent(a.effect_resistance ?? 0) },
      ...(a.attack_lifesteal ? [{ icon: 'attack_lifesteal', label: 'Вампиризм', value: formatStatNumber(a.attack_lifesteal) }] : []),
    ],
  ]
}
