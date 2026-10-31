import locationsJson from '../data/Locations.json' with { type: 'json' }
import enemiesJson from '../data/Enemies.json' with { type: 'json' }
import bossesJson from '../data/Bosses.json' with { type: 'json' }
import type { Enemy, EnemyPageState, EnemySkill, GameLocation } from '../types/enemy.ts'
import { formatNumber, heroStatColumns, percent } from './formatAttributes.ts'

export const getLocations = (): readonly GameLocation[] => locationsJson.locations
export const getLocationById = (id: number) => getLocations().find((location) => location.id === id)
export const getEnemiesByLocation = (id: number): Enemy[] => enemiesJson.enemies.filter((enemy) => enemy.enemy_location_id === id)
// Bosses share the 0-based location IDs with enemies, but have independent enemy IDs.
const bosses: Enemy[] = bossesJson.enemies.map((boss) => ({ ...boss, kind: 'boss', sourceId: boss.id,
  id: -(boss.id + 1) }))
export const getBossesByLocation = (id: number): Enemy[] => bosses.filter((boss) => boss.enemy_location_id === id)
export const getEncountersByLocation = (id: number): Enemy[] => [...getEnemiesByLocation(id), ...getBossesByLocation(id)]
export const getEnemyById = (id: number | null): Enemy | undefined =>
  id !== null && id < 0 ? bosses.find((boss) => boss.id === id) : enemiesJson.enemies.find((enemy) => enemy.id === id)
export const getEnemySkills = (enemy: Enemy) => enemy.skills ?? []
export const getLocationEffects = (location: GameLocation) => location.location_effects ?? []
export const descriptionParagraphs = (value?: string[] | string) => {
  const paragraphs = (Array.isArray(value) ? value : value ? [value] : []).flatMap((part) => part.split(/\r?\n/).filter(Boolean))
  return paragraphs.length ? paragraphs : ['Описание пока отсутствует.']
}

export function selectLocation(id: number, mode: EnemyPageState['mode'] = 'enemy', enemies = getEncountersByLocation(id)): EnemyPageState {
  return { selectedLocationId: id, selectedEnemyId: enemies[0]?.id ?? null, mode: enemies.length ? mode : 'location' }
}
export function nextEnemyId(enemies: readonly Enemy[], id: number | null, direction: -1 | 1) {
  if (!enemies.length) return null
  const index = enemies.findIndex((enemy) => enemy.id === id)
  return enemies[(index + direction + enemies.length) % enemies.length].id
}
export function switchEnemyMode(state: EnemyPageState): EnemyPageState {
  return { ...state, mode: state.mode === 'enemy' || state.selectedEnemyId === null ? 'location' : 'enemy' }
}
export function enemyStatColumns(enemy: Enemy) {
  const a = enemy.base_attributes
  const columns = heroStatColumns(a)
  // Enemies store a direct rate (1), unlike the heroes' hundredths (e.g. 110).
  columns[0][4].value = formatNumber(a.attack_spead)
  const optionalPercent = (value: number | undefined) => value === undefined ? '-' : percent(value)
  columns[1] = [
    { icon: 'movement_speed', label: 'Скорость передвижения', value: formatNumber(a.speed) },
    { icon: 'attack_lifesteal', label: 'Вампиризм', value: a.attack_lifesteal === undefined ? '-' : formatNumber(a.attack_lifesteal) },
    { icon: 'slow_effectiveness', label: 'Сопротивление замедлению', value: optionalPercent(a.slow_effectiveness) },
    { icon: 'effect_resistance', label: 'Сопротивление эффектам', value: optionalPercent(a.effect_resistance) },
    { icon: 'stun_resistance', label: 'Сопротивление оглушению', value: optionalPercent(a.stun_resistance) },
  ]
  return columns
}
export function enemySkillParameters(skill: EnemySkill) {
  return ([['damage', 'Урон', ''], ['range', 'Дальность / радиус', ''], ['duration', 'Длительность', ' с'], ['cooldown', 'Перезарядка', ' с']] as const)
    .flatMap(([key, label, unit]) => skill[key] === undefined ? [] : [{ label, value: `${formatNumber(skill[key])}${unit}` }])
}
export function skillArcPositions(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const offset = count === 1 ? 0 : ((index / (count - 1)) * 2 - 1) * (count === 2 ? .24 : .84)
    return { left: `${85 - 26 * offset ** 2}%`, top: `${50 + 50 * offset}%` }
  })
}
