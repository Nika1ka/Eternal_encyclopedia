import type { CSSProperties } from 'react'
import type { Enemy, EnemySkill } from '../types/enemy'
import { assetUrl } from './characterAssets'
import { locationAssetPath, skillAssetOverrides } from './locationAssets'

export const locationImage = (id: number, poster = false) => assetUrl(locationAssetPath(id, poster ? 'Location_poster.png' : 'Background.png'))
export const enemyImage = (enemy: Enemy) => enemy.model_name ? assetUrl(locationAssetPath(enemy.enemy_location_id, `${enemy.kind === 'boss' ? 'Bosses' : 'Enemies'}/${enemy.model_name}`)) : ''
export const enemySkillImage = (enemy: Enemy, skill: EnemySkill) => skill.skill_image ? assetUrl(skillAssetOverrides[`${enemy.id}/${skill.skill_image}`] ?? locationAssetPath(enemy.enemy_location_id, `Skill_images/${skill.skill_image}`)) : ''
export const effectImage = (effect: EnemySkill) => effect.skill_image ? assetUrl(`Game_images/Location_effects/${effect.skill_image}`) : ''
// Background-derived accents, darkened to keep white button text readable.
export const locationButtonColors: Record<number, string> = {
  0: '#466136', // Poisonous Mire: moss and marsh vegetation.
  1: '#713f46', // Blood Catacombs: burgundy stone and blood.
  2: '#984729', // Caldera: terracotta rock and lava.
  3: '#9b421c', // Demonic Forge: copper and furnace fire.
  4: '#75674b', // Ancient Ruins: weathered sandstone.
  5: '#496b9a', // Crystal Archive: blue crystal.
  6: '#556e7b', // Eternal Celestial City: blue-grey sky and marble shadows.
  7: '#46456f', // Shattered Abyss: violet-blue rock.
}
// Optional per-enemy presentation overrides, kept outside the game data.
export const enemyPresentation: Partial<Record<number, CSSProperties>> = {}
