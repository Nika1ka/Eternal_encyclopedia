import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { BaseAttributes } from '../src/types/character.ts'
import type { EquipmentItem } from '../src/types/equipment.ts'
import { limitHeroAttributes } from '../src/engine/heroAttributeLimits.ts'
import { calculateHeroAttributes } from '../src/engine/equipmentModifiers.ts'
import { heroStatColumns } from '../src/utils/formatAttributes.ts'
import { skillAtLevel } from '../src/utils/skillLevels.ts'
import { readFileSync } from 'node:fs'

const base: BaseAttributes = {
  hp: 30, shield: 5, physical_defense: -30, magic_resistance: -5, dodge: 20,
  attack_spead: 92, damage: 27, critical_chance: 5, critical_damage: 20, speed: 180,
}

test('all requested limits clamp out-of-range attributes and leave source intact', () => {
  const source = { ...base, hp: -20, physical_defense: 110, magic_resistance: 90, dodge: 100,
    attack_spead: -10, damage: 0, critical_chance: -5, critical_damage: -20, spell_cooldown: -90, speed: 0 }
  const snapshot = { ...source }
  const result = limitHeroAttributes(source)
  assert.deepEqual(result, { ...base, hp: 3, physical_defense: 85, magic_resistance: 85, dodge: 85,
    attack_spead: 50, damage: 10, critical_chance: 0, critical_damage: 0, spell_cooldown: -75, speed: 50 })
  assert.deepEqual(source, snapshot)
  assert.equal(heroStatColumns(result)[0].find((stat) => stat.icon === 'attack_speed')?.value, '0.5')
  assert.deepEqual(limitHeroAttributes(result), result)
})

test('valid values, negative resistances and unspecified attributes remain unchanged', () => {
  assert.deepEqual(limitHeroAttributes(base), base)
  const extra = { ...base, shield: -2, spell_damage: 160, spell_cooldown: 10, critical_chance: 150, damage: 999 }
  assert.deepEqual(limitHeroAttributes(extra), extra)
})

test('limits apply after summation, regardless of equipment order', () => {
  const item = (id: number, hp: number): EquipmentItem => ({
    id, name: '', file_name: '', rarity: 0, item_group: id, game_description: '', position_in_shop: [0, id],
    craft_price: { cost: 0, components: [], components_amount: [] },
    attributes_list: { attributes_name: ['Health'], attributes_bonus: [hp] },
    item_abilities: [], skill_values: [],
    upgrade_bonuses: { attributes_name: [], attributes_bonus: [], skill_value_tags: [], skill_bonus: [] },
  })
  const items = new Map([[0, item(0, -50)], [1, item(1, 30)]])
  const result = calculateHeroAttributes(base, [{ itemId: 0, level: 1 }, { itemId: 1, level: 1 }, null], items)
  assert.equal(result.hp, 10)
  assert.deepEqual(calculateHeroAttributes(base, [{ itemId: 1, level: 1 }, { itemId: 0, level: 1 }, null], items), result)
  assert.equal(calculateHeroAttributes(base, [{ itemId: 0, level: 1 }, null, null], items).hp, 3)
  assert.deepEqual(calculateHeroAttributes(base, [null, null, null], items), base)
})

test('cooldown cap propagates to hero abilities', () => {
  const { heroes } = JSON.parse(readFileSync(new URL('../src/data/Characters.json', import.meta.url), 'utf8'))
  const skill = heroes[0].skills[2]
  const attributes = calculateHeroAttributes({ ...base, spell_cooldown: -120 }, [null, null, null], new Map())
  assert.equal(skillAtLevel(skill, 1, attributes).cooldown, skill.cooldown * .25)
})
