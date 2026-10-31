import type { Character } from '../types/character.ts'
import type { EquipmentItem, EquipmentSlots } from '../types/equipment.ts'
import type { BuildState } from './buildStore.ts'
import { canEquipItem, createBuildState } from './buildStore.ts'
import { restoreArcana } from './arcanaStore.ts'
import { arcanaById } from '../utils/arcanaData.ts'
import { canAssignArcanaAbility } from '../utils/arcanaAbilityEligibility.ts'
import { skillAtLevel } from '../utils/skillLevels.ts'
import { calculateArcanaModifiers } from '../utils/arcanaCalculator.ts'

export const BUILD_STORAGE_KEY = 'eternal-battle-build-v1'
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
export function restoreBuild(raw: string | null, heroes: readonly Character[], items: ReadonlyMap<number, EquipmentItem>, fallbackId: number): BuildState {
  const initial = createBuildState(fallbackId)
  if (!raw) return initial
  try {
    const saved = record(JSON.parse(raw))
    if (saved.version !== 1) return initial
    const data = record(saved.build)
    if (heroes.some((hero) => hero.id === data.selectedHeroId)) initial.selectedHeroId = data.selectedHeroId as number
    for (const hero of heroes) {
      const variants = record(record(data.variantsByHero)[hero.id])
      initial.variantsByHero[hero.id] = {}
      for (const skill of hero.skills) {
        const variant = variants[skill.skill_image]
        if (typeof variant === 'number' && Number.isInteger(variant) && variant >= 0 && variant <= (skill.additional_effects?.length ?? 0)) {
          initial.variantsByHero[hero.id][skill.skill_image] = variant
        }
      }
      const level = record(data.heroLevels)[hero.id]
      if (typeof level === 'number' && Number.isInteger(level) && level >= 1 && level <= 5) initial.heroLevels[hero.id] = level
      const slots = record(data.equipmentByHero)[hero.id]
      if (Array.isArray(slots)) {
        const equipment: [EquipmentSlots[0], EquipmentSlots[1], EquipmentSlots[2]] = [null, null, null]
        for (let index = 0; index < 3; index++) {
          const entry = record(slots[index])
          if (typeof entry.itemId === 'number' && (entry.level === 1 || entry.level === 2 || entry.level === 3) && canEquipItem(items, equipment, entry.itemId, index)) {
            equipment[index] = { itemId: entry.itemId, level: entry.level }
          }
        }
        initial.equipmentByHero[hero.id] = equipment
      }
      const restored = restoreArcana(record(data.arcanaByHero)[hero.id], new Set(hero.skills.map((skill) => skill.skill_image)))
      const { skillLevelBonuses } = calculateArcanaModifiers(restored, hero.skills)
      initial.arcanaByHero[hero.id] = restored.map((instance) => {
        if (!instance?.selectedAbilityId) return instance
        const skill = hero.skills.find((entry) => entry.skill_image === instance.selectedAbilityId)
        if (skill && canAssignArcanaAbility(arcanaById.get(instance.arcanaId)!, skillAtLevel(skill, initial.heroLevels[hero.id] ?? 1, { skillLevelBonuses }))) return instance
        const { selectedAbilityId: invalidAbility, ...rest } = instance
        void invalidAbility
        return rest
      })
    }
    return initial
  } catch { return initial }
}
export const serializeBuild = (build: BuildState) => JSON.stringify({ version: 1, build })
