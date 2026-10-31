import type { BaseAttributes, HeroEffect } from '../types/character'
import type { EquipmentItem, EquipmentSlots } from '../types/equipment'
import { equipmentAttributes } from '../utils/equipmentAttributes.ts'
import { formatSkillDescription } from '../utils/formatAttributes.ts'
import { limitHeroAttributes } from './heroAttributeLimits.ts'

export function equipmentAtLevel(item: EquipmentItem, level: number) {
  const steps = Math.max(0, Math.floor(level) - 1)
  const attributes: Record<string, number> = {}
  item.attributes_list.attributes_name.forEach((name, index) => {
    attributes[name] = (attributes[name] ?? 0) + item.attributes_list.attributes_bonus[index]
  })
  const baseAttributes = { ...attributes }
  item.upgrade_bonuses.attributes_name.forEach((name, index) => {
    attributes[name] = (attributes[name] ?? 0) + item.upgrade_bonuses.attributes_bonus[index] * steps
  })
  const values = [...item.skill_values]
  item.upgrade_bonuses.skill_value_tags.forEach((tag, index) => {
    const match = /^value([1-9]\d*)$/.exec(tag)
    if (!match) return
    const valueIndex = Number(match[1]) - 1
    if (values[valueIndex] !== undefined) values[valueIndex] += item.upgrade_bonuses.skill_bonus[index] * steps
  })
  return { attributes, baseAttributes, values }
}

export function calculateHeroAttributes(base: BaseAttributes, slots: EquipmentSlots, items: ReadonlyMap<number, EquipmentItem>, additional: Partial<BaseAttributes> = {}, equipmentLevelBonus = 0, applyLimits = true): BaseAttributes {
  const result = { ...base }
  for (const instance of slots) {
    const item = instance && items.get(instance.itemId)
    if (!instance || !item) continue
    const { attributes, values } = equipmentAtLevel(item, instance.level + equipmentLevelBonus)
    for (const [name, value] of Object.entries(attributes)) {
      const definition = equipmentAttributes[name]
      if (definition) result[definition.key] = (result[definition.key] ?? 0) + value
    }
    if (item.item_group === 0 && item.item_abilities.some((ability) => ability.ability_image === 'Blood_River')) {
      result.attack_lifesteal = (result.attack_lifesteal ?? 0) + (values[0] ?? 0)
    }
  }
  for (const key of Object.keys(additional) as (keyof BaseAttributes)[]) result[key] = (result[key] ?? 0) + (additional[key] ?? 0)
  return applyLimits ? limitHeroAttributes(result) : result
}

/** Effects retain their slot identity; group uniqueness is enforced by the build store. */
export function getActiveEquipmentEffects(slots: EquipmentSlots, items: ReadonlyMap<number, EquipmentItem>, equipmentLevelBonus = 0): HeroEffect[] {
  return slots.flatMap((instance, slot) => {
    const item = instance && items.get(instance.itemId)
    if (!item || !instance) return []
    const level = instance.level + equipmentLevelBonus
    const { values } = equipmentAtLevel(item, level)
    return item.item_abilities.map((ability, index) => ({
      id: `equipment-${slot}-${item.id}-${index}`,
      name: ability.name,
      description: `${item.name} · Уровень ${level}\n\n${formatSkillDescription({ info: ability.info, skill_values: values })}`,
      image: `Game_images/Items/Skills/${ability.ability_image}.png`,
      equipment: { itemId: item.id, level, abilityIndex: index },
    }))
  })
}

/** Only members of the same item group form an upgrade chain. */
export function equipmentConnections(items: readonly EquipmentItem[]) {
  const rows = new Map<number, EquipmentItem[]>()
  for (const item of items) rows.set(item.item_group, [...(rows.get(item.item_group) ?? []), item])
  return [...rows.values()].flatMap((row) => {
    const ordered = [...row].sort((a, b) => a.position_in_shop[1] - b.position_in_shop[1])
    return ordered.slice(1).map((item, index) => ({ from: ordered[index].id, to: item.id }))
  })
}
