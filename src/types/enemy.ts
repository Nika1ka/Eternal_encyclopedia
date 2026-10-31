import type { BaseAttributes } from './character'

export interface EnemySkill {
  name: string
  info: string
  skill_image?: string
  range?: number
  damage?: number
  duration?: number
  cooldown?: number
}
export interface EnemyAttributes extends BaseAttributes {
  attack_lifesteal?: number
  stun_resistance?: number
}
export interface Enemy {
  id: number
  /** Boss IDs are namespaced as -(sourceId + 1) in the presentation layer. */
  sourceId?: number
  kind?: 'boss'
  name: string
  model_name?: string
  enemy_location_id: number
  game_description?: string[] | string
  base_attributes: EnemyAttributes
  skills?: EnemySkill[]
}
export interface GameLocation {
  id: number
  name: string
  location_name: string
  description?: string[] | string
  location_effects?: EnemySkill[]
}
export interface EnemyPageState {
  selectedLocationId: number
  selectedEnemyId: number | null
  mode: 'enemy' | 'location'
}
