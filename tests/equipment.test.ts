import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import type { EquipmentItem, EquipmentSlots } from '../src/types/equipment.ts'
import type { Character } from '../src/types/character.ts'
import { canEquipItem, createBuildReducer, createBuildState, EMPTY_SLOTS } from '../src/store/buildStore.ts'
import { equipmentAtLevel, calculateHeroAttributes, getActiveEquipmentEffects, equipmentConnections } from '../src/engine/equipmentModifiers.ts'
import { equipmentAttributes, modifierTone } from '../src/utils/equipmentAttributes.ts'
import { readEquipmentDrop } from '../src/utils/equipmentDrag.ts'
import { skillAtLevel } from '../src/utils/skillLevels.ts'

const { items } = JSON.parse(readFileSync(new URL('../src/data/Equipment.json', import.meta.url), 'utf8')) as { items: EquipmentItem[] }
const { heroes } = JSON.parse(readFileSync(new URL('../src/data/Characters.json', import.meta.url), 'utf8')) as { heroes: Character[] }
const byId = new Map(items.map((item) => [item.id, item]))
const itemIds = new Set(byId.keys())
const reducer = createBuildReducer(byId, new Set(heroes.map((hero) => hero.id)))
const ghost = heroes.find((hero) => hero.name === 'Ghost')!
const cursed = byId.get(20)!

test('spell attributes modify level-adjusted damage and cooldown, and removal restores both', () => {
  const skill = heroes[0].skills[2]
  const source = structuredClone(skill)
  const leveled = skillAtLevel(skill, 4)
  const modified = skillAtLevel(skill, 4, { spell_damage: 50, spell_cooldown: -20 })
  assert.equal(modified.damage, leveled.damage! * 1.5)
  assert.equal(modified.cooldown, leveled.cooldown! * .8)
  assert.deepEqual(modified.skill_values, leveled.skill_values)
  assert.deepEqual(modified.additional_effects, source.additional_effects)
  const slots: EquipmentSlots = [{ itemId: 24, level: 1 }, { itemId: 49, level: 3 }, null]
  const attributes = calculateHeroAttributes(ghost.base_attributes, slots, byId)
  const equipped = skillAtLevel(skill, 4, attributes)
  assert.equal(equipped.damage, leveled.damage! * (1 + attributes.spell_damage! / 100))
  assert.equal(equipped.cooldown, leveled.cooldown! * (1 + attributes.spell_cooldown! / 100))
  assert.deepEqual(skillAtLevel(skill, 4, calculateHeroAttributes(ghost.base_attributes, EMPTY_SLOTS, byId)), leveled)
  assert.deepEqual(skill, source)
  const passive = skillAtLevel(heroes[0].skills[4], 3, attributes)
  assert.equal(passive.cooldown, undefined)
  assert.equal(passive.damage, undefined)
})

test('equip into empty slot, replace at level 1, then remove restores original attributes', () => {
  const initial = createBuildState(ghost.id)
  let state = reducer(initial, { type: 'equip', itemId: 20, slot: 1 })
  assert.deepEqual(state.equipmentByHero[ghost.id], [null, { itemId: 20, level: 1 }, null])
  state = reducer(state, { type: 'itemLevel', slot: 1, level: 3 })
  assert.equal(state.equipmentByHero[ghost.id][1]?.level, 3)
  state = reducer(state, { type: 'equip', itemId: 24, slot: 1 })
  assert.deepEqual(state.equipmentByHero[ghost.id][1], { itemId: 24, level: 1 })
  assert.equal(calculateHeroAttributes(ghost.base_attributes, state.equipmentByHero[ghost.id], byId).spell_damage, 6)
  state = reducer(state, { type: 'unequip', slot: 1 })
  assert.deepEqual(calculateHeroAttributes(ghost.base_attributes, state.equipmentByHero[ghost.id], byId), ghost.base_attributes)
  assert.deepEqual(initial, createBuildState(ghost.id))
})

test('Cursed Blade levels match supplied reference and signed per-level increments', () => {
  assert.equal(equipmentAtLevel(cursed, 1).attributes.Critical_hit_amount, 75)
  assert.equal(equipmentAtLevel(cursed, 2).attributes.Critical_hit_amount, 100)
  const max = equipmentAtLevel(cursed, 3)
  assert.deepEqual(max.attributes, { Attack_damage: 70, Attack_speed: -35, Critical_hit_amount: 125 })
  assert.deepEqual(max.values, [60, 55, 60])
  assert.deepEqual(equipmentAtLevel(cursed, 1).values, cursed.skill_values)
})

test('all attribute bonuses are additive, cooldown retains its source sign', () => {
  const slots: EquipmentSlots = [{ itemId: 20, level: 3 }, { itemId: 49, level: 3 }, { itemId: 33, level: 2 }]
  const final = calculateHeroAttributes(ghost.base_attributes, slots, byId)
  assert.equal(final.damage, ghost.base_attributes.damage + 70)
  assert.equal(final.attack_spead, 75)
  assert.equal(final.critical_damage, ghost.base_attributes.critical_damage + 125)
  assert.equal(final.hp, ghost.base_attributes.hp + 25 + 5)
  assert.equal(final.physical_defense, ghost.base_attributes.physical_defense + 22.5)
  assert.equal(final.spell_cooldown, -14)
  assert.equal(modifierTone(final.spell_cooldown!, true), 'positive')
})

test('effects reflect equipped instance levels, replacement and removal', () => {
  let state = reducer(createBuildState(ghost.id), { type: 'equip', itemId: 20, slot: 0 })
  let effects = getActiveEquipmentEffects(state.equipmentByHero[ghost.id], byId)
  assert.equal(effects.length, 2)
  assert.match(effects[1].description, /80%/)
  state = reducer(state, { type: 'itemLevel', slot: 0, level: 3 })
  effects = getActiveEquipmentEffects(state.equipmentByHero[ghost.id], byId)
  assert.match(effects[0].description, /60%/)
  assert.match(effects[0].description, /55%/)
  assert.match(effects[1].description, /60%/)
  state = reducer(state, { type: 'equip', itemId: 24, slot: 0 })
  assert.deepEqual(getActiveEquipmentEffects(state.equipmentByHero[ghost.id], byId).map((effect) => effect.name), ['Аура волшебства'])
  state = reducer(state, { type: 'unequip', slot: 0 })
  assert.deepEqual(getActiveEquipmentEffects(state.equipmentByHero[ghost.id], byId), [])
})

test('hero selection preserves independent builds and hero levels across shared routes', () => {
  let state = reducer(createBuildState(ghost.id), { type: 'equip', itemId: 20, slot: 2 })
  state = reducer(state, { type: 'heroLevel', level: 4 })
  state = reducer(state, { type: 'itemLevel', slot: 2, level: 2 })
  state = reducer(state, { type: 'selectHero', heroId: 0 })
  assert.equal(state.equipmentByHero[0], undefined)
  state = reducer(state, { type: 'equip', itemId: 24, slot: 0 })
  state = reducer(state, { type: 'selectHero', heroId: ghost.id })
  assert.equal(state.heroLevels[ghost.id], 4)
  assert.deepEqual(state.equipmentByHero[ghost.id][2], { itemId: 20, level: 2 })
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  assert.equal((app.match(/<HeroesPage\b/g) ?? []).length, 1, 'both routes must share one persistent scene')
})

test('catalog preview is pure and cannot mutate the build or JSON', () => {
  const state = reducer(createBuildState(ghost.id), { type: 'equip', itemId: 20, slot: 0 })
  const before = structuredClone(state), source = structuredClone(items)
  for (const item of items) for (const level of [1, 2, 3] as const) equipmentAtLevel(item, level)
  assert.deepEqual(state, before)
  assert.deepEqual(items, source)
  assert.equal(state.equipmentByHero[ghost.id][0]?.level, 1)
})

test('empty ability lists are supported without introducing placeholder effects', () => {
  // Structural edge case; all current source items have at least one ability.
  const withoutAbilities = { ...cursed, item_abilities: [] }
  assert.deepEqual(getActiveEquipmentEffects([{ itemId: 20, level: 1 }, null, null], new Map([[20, withoutAbilities]])), [])
})

test('only one item per group can be equipped; replacement in the same slot is allowed', () => {
  const state = reducer(createBuildState(ghost.id), { type: 'equip', itemId: 19, slot: 0 })
  assert.equal(reducer(state, { type: 'equip', itemId: 20, slot: 1 }), state)
  assert.equal(reducer(state, { type: 'equip', itemId: 19, slot: 2 }), state)
  assert.equal(canEquipItem(byId, state.equipmentByHero[ghost.id], 20, 1), false)
  const replaced = reducer(state, { type: 'equip', itemId: 20, slot: 0 })
  assert.deepEqual(replaced.equipmentByHero[ghost.id], [{ itemId: 20, level: 1 }, null, null])
  assert.equal(canEquipItem(byId, replaced.equipmentByHero[ghost.id], 18, 1), true)
  const removed = reducer(replaced, { type: 'unequip', slot: 0 })
  assert.equal(canEquipItem(byId, removed.equipmentByHero[ghost.id], 19, 2), true)
})

test('cancelled or foreign drag payloads never equip an item', () => {
  assert.equal(readEquipmentDrop('20', null, itemIds), null)
  assert.equal(readEquipmentDrop('', 20, itemIds), null)
  assert.equal(readEquipmentDrop('not-an-id', 20, itemIds), null)
  assert.equal(readEquipmentDrop('21', 20, itemIds), null)
  assert.equal(readEquipmentDrop('9999', 9999, itemIds), null)
  assert.equal(readEquipmentDrop('20', 20, itemIds), 20)
})

test('invalid slots, item IDs and levels are rejected without changing state', () => {
  const state = createBuildState(ghost.id)
  assert.equal(reducer(state, { type: 'equip', itemId: 20, slot: 3 }), state)
  assert.equal(reducer(state, { type: 'equip', itemId: 20, slot: -1 }), state)
  assert.equal(reducer(state, { type: 'equip', itemId: 9999, slot: 0 }), state)
  assert.equal(reducer(state, { type: 'itemLevel', slot: 0, level: 2 }), state)
  assert.equal(reducer(state, { type: 'heroLevel', level: 6 }), state)
  assert.equal(reducer(state, { type: 'selectHero', heroId: 9999 }), state)
  assert.deepEqual(EMPTY_SLOTS, [null, null, null])
})

test('catalog links connect consecutive items of the same group, never unrelated row neighbors', () => {
  const links = equipmentConnections(items)
  assert.equal(links.length, items.length - new Set(items.map((item) => item.item_group)).size)
  assert.ok(!links.some((edge) => edge.from === 2 && edge.to === 3))
  assert.ok(!links.some((edge) => edge.from === 48 && edge.to === 49))
  assert.ok(links.some((edge) => edge.from === 6 && edge.to === 7), 'skipped rarity columns are supported')
  for (const edge of links) {
    const from = byId.get(edge.from)!, to = byId.get(edge.to)!
    assert.equal(from.position_in_shop[0], to.position_in_shop[0])
    assert.equal(from.item_group, to.item_group)
    assert.ok(to.position_in_shop[1] > from.position_in_shop[1])
  }
  assert.equal(new Set(items.map((item) => item.position_in_shop.join(','))).size, items.length)
})

test('all 50 source items, ability images, material icons and attribute mappings resolve', () => {
  assert.equal(items.length, 50)
  const asset = (path: string) => new URL(`../public/assets/${path}`, import.meta.url)
  for (const item of items) {
    const image = item.file_name === 'Midnight_Prism.png' ? 'Midnight_Prism.png.png' : item.file_name
    assert.ok(existsSync(asset(`Game_images/Items/Icons/${image}`)), image)
    assert.equal(item.rarity, item.position_in_shop[1])
    for (const name of [...item.attributes_list.attributes_name, ...item.upgrade_bonuses.attributes_name]) {
      assert.ok(equipmentAttributes[name], name)
      assert.ok(existsSync(asset(`ui/stats_icon/hero_stats/${equipmentAttributes[name].icon}.png`)))
    }
    for (const material of item.craft_price.components) assert.ok(existsSync(asset(`Game_images/Items/Resources/${material}.png`)), material)
    for (const ability of item.item_abilities) assert.ok(existsSync(asset(`Game_images/Items/Skills/${ability.ability_image}.png`)))
    for (const level of [1, 2, 3] as const) {
      for (const effect of getActiveEquipmentEffects([{ itemId: item.id, level }, null, null], byId)) assert.doesNotMatch(effect.description, /\$\{/)
    }
  }
})
