import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { arcanaCards, arcanaById, arcanaCategories, arcanaImagePath, categoryImagePath } from '../src/utils/arcanaData.ts'
import { getAdjacentSlots } from '../src/utils/arcanaAdjacency.ts'
import { EMPTY_ARCANA, reduceArcana, restoreArcana, reconcileArcanaTargets } from '../src/store/arcanaStore.ts'
import { calculateArcanaModifiers, getArcanaLevelBonus, resolvedArcanaBonuses, temporaryAmplification, uniqueDescription } from '../src/utils/arcanaCalculator.ts'
import { skillAtLevel } from '../src/utils/skillLevels.ts'
import { calculateHeroAttributes } from '../src/engine/equipmentModifiers.ts'
import { EMPTY_SLOTS } from '../src/store/buildStore.ts'
import type { ArcanaSlots } from '../src/types/arcana.ts'
import { restoreBuild, serializeBuild } from '../src/store/buildPersistence.ts'
import { createBuildReducer, createBuildState } from '../src/store/buildStore.ts'
import type { Character } from '../src/types/character.ts'
import type { EquipmentItem } from '../src/types/equipment.ts'
import { canAssignArcanaAbility } from '../src/utils/arcanaAbilityEligibility.ts'
import { outsideArcanaDropSlot } from '../src/utils/arcanaDrag.ts'

const abilities = new Set(['skill-a', 'skill-b'])
const { heroes } = JSON.parse(readFileSync(new URL('../src/data/Characters.json', import.meta.url), 'utf8')) as { heroes: Character[] }
const { items } = JSON.parse(readFileSync(new URL('../src/data/Equipment.json', import.meta.url), 'utf8')) as { items: EquipmentItem[] }
test('skill variants survive hero switches and saved builds; invalid saved variants are ignored', () => {
  const hero = heroes.find((entry) => entry.skills.some((skill) => skill.additional_effects?.length))!
  const skill = hero.skills.find((entry) => entry.additional_effects?.length)!
  const other = heroes.find((entry) => entry.id !== hero.id)!
  const itemMap = new Map(items.map((item) => [item.id, item]))
  const reducer = createBuildReducer(itemMap, new Set(heroes.map((entry) => entry.id)))
  let build = reducer(createBuildState(hero.id), { type: 'skillVariant', skillId: skill.skill_image, variant: 1 })
  build = reducer(build, { type: 'selectHero', heroId: other.id })
  build = reducer(build, { type: 'selectHero', heroId: hero.id })
  const restored = restoreBuild(serializeBuild(build), heroes, itemMap, hero.id)
  assert.equal(restored.variantsByHero[hero.id][skill.skill_image], 1)
  assert.deepEqual(restored.variantsByHero[other.id], {})
  build = reducer(build, { type: 'skillVariant', skillId: skill.skill_image, variant: 999 })
  assert.equal(restoreBuild(serializeBuild(build), heroes, itemMap, hero.id).variantsByHero[hero.id][skill.skill_image], undefined)
})
test('targeted cards require an existing nonzero attribute on the concrete ability', () => {
  const emptySkill = { ...heroes[0].skills[0], damage: 0, cooldown: 0, duration: 0, range: 0, skill_values: [0], additional_effects: [] }
  const populatedSkill = { ...emptySkill, damage: 20, cooldown: 10, duration: 5, range: 2, skill_values: [-10, 20],
    additional_effects: [{ name: 'Effect', info: '', skill_effect_image: 'effect', effects_values: [5] }] }
  for (const card of arcanaCards.filter((entry) => entry.abilities_bonus?.bonus_type === 'basic')) {
    assert.equal(canAssignArcanaAbility(card, emptySkill), false, card.name)
    assert.equal(canAssignArcanaAbility(card, populatedSkill), true, card.name)
  }
  const damageCard = arcanaById.get(28)!
  assert.equal(canAssignArcanaAbility(damageCard, { ...populatedSkill, damage: undefined }), false)
  assert.equal(canAssignArcanaAbility(damageCard, { ...populatedSkill, damage: NaN }), false)
  assert.equal(canAssignArcanaAbility(arcanaById.get(5)!, emptySkill), true, 'unique effects have no numeric attribute requirement')
})
test('invalid ability assignments are rejected and old saves cannot apply them', () => {
  const skill = { ...heroes[0].skills[0], skill_image: 'skill-a', damage: 0 }
  const hero = { ...heroes[0], skills: [skill] }
  const slots = reduceArcana(EMPTY_ARCANA, { type: 'place', arcanaId: 28, slot: 0 }, abilities)
  assert.equal(reduceArcana(slots, { type: 'ability', slot: 0, abilityId: 'skill-a' }, abilities, [skill]), slots)
  const valid = reduceArcana(slots, { type: 'ability', slot: 0, abilityId: 'skill-a' }, abilities, [{ ...skill, damage: 20 }])
  assert.equal(valid[0]?.selectedAbilityId, 'skill-a')
  assert.equal(calculateArcanaModifiers(valid, [skill]).abilityBonuses['skill-a'], undefined)
  assert.equal(calculateArcanaModifiers(valid, [{ ...skill, damage: 20 }]).abilityBonuses['skill-a'].Spell_damage, -15)
  const state = createBuildState(hero.id)
  state.arcanaByHero[hero.id] = valid
  const restored = restoreBuild(serializeBuild(state), [hero], new Map(), hero.id)
  assert.equal(restored.arcanaByHero[hero.id][0]?.selectedAbilityId, undefined)
  assert.equal(restored.arcanaByHero[hero.id][0]?.arcanaId, 28)
})
test('only an equipped card dropped outside cells is removed; foreign, catalog and cancelled drags are ignored', () => {
  const slots = reduceArcana(EMPTY_ARCANA, { type: 'place', arcanaId: 0, slot: 5 }, abilities)
  assert.equal(outsideArcanaDropSlot(slots, 0, '0', false), 5)
  assert.equal(outsideArcanaDropSlot(slots, 0, '0', true), -1)
  assert.equal(outsideArcanaDropSlot(slots, 0, '1', false), -1)
  assert.equal(outsideArcanaDropSlot(slots, 0, '', false), -1)
  assert.equal(outsideArcanaDropSlot(slots, null, '0', false), -1)
  assert.equal(outsideArcanaDropSlot(slots, 1, '1', false), -1)
  const result = reduceArcana(slots, { type: 'remove', slot: outsideArcanaDropSlot(slots, 0, '0', false) }, abilities)
  assert.ok(result.every((entry) => entry === null))
})
test('seven categories, 42 cards and every original asset exist', () => {
  assert.equal(arcanaCategories.length, 7)
  assert.equal(arcanaCards.length, 42)
  for (const path of [...arcanaCards.map(arcanaImagePath), ...arcanaCategories.map(categoryImagePath),
    'ui/card_covers/empty_card.png', 'ui/card_covers/card_frame.png', 'ui/additional_icons/taro_cards_page_background.png']) {
    assert.ok(existsSync(new URL(`../public/assets/${path}`, import.meta.url)), path)
  }
})
test('place, move, swap and remove preserve card level and ability selection', () => {
  let slots = reduceArcana(EMPTY_ARCANA, { type: 'place', arcanaId: 0, slot: 0 }, abilities)
  slots = reduceArcana(slots, { type: 'level', slot: 0, level: 7 }, abilities)
  slots = reduceArcana(slots, { type: 'ability', slot: 0, abilityId: 'skill-b' }, abilities)
  slots = reduceArcana(slots, { type: 'move', from: 0, to: 5 }, abilities)
  assert.equal(slots[0], null)
  assert.deepEqual(slots[5], { arcanaId: 0, level: 7, selectedAbilityId: 'skill-b' })
  slots = reduceArcana(slots, { type: 'place', arcanaId: 1, slot: 0 }, abilities)
  slots = reduceArcana(slots, { type: 'move', from: 5, to: 0 }, abilities)
  assert.equal(slots[0]?.arcanaId, 0)
  assert.equal(slots[5]?.arcanaId, 1)
  slots = reduceArcana(slots, { type: 'remove', slot: 0 }, abilities)
  assert.equal(slots[0], null)
  assert.ok(EMPTY_ARCANA.every((slot) => slot === null))
})
test('duplicates, occupied slots, invalid IDs and out-of-bounds placements are rejected', () => {
  const slots = reduceArcana(EMPTY_ARCANA, { type: 'place', arcanaId: 0, slot: 0 }, abilities)
  for (const action of [{ type: 'place', arcanaId: 0, slot: 1 }, { type: 'place', arcanaId: 1, slot: 0 },
    { type: 'place', arcanaId: 1, slot: 12 }, { type: 'place', arcanaId: 1, slot: -1 },
    { type: 'place', arcanaId: 999, slot: 1 }] as const) assert.equal(reduceArcana(slots, action, abilities), slots)
  let full = EMPTY_ARCANA
  for (let i = 0; i < 12; i++) full = reduceArcana(full, { type: 'place', arcanaId: i, slot: i }, abilities)
  assert.equal(full.filter(Boolean).length, 12)
  assert.equal(reduceArcana(full, { type: 'place', arcanaId: 12, slot: 0 }, abilities), full)
})
test('levels remain in 1–15 and invalid ability IDs cannot be assigned', () => {
  let slots = reduceArcana(EMPTY_ARCANA, { type: 'place', arcanaId: 0, slot: 0 }, abilities)
  for (const level of [0, 16, -1, 2.5, NaN]) assert.equal(reduceArcana(slots, { type: 'level', slot: 0, level }, abilities), slots)
  slots = reduceArcana(slots, { type: 'level', slot: 0, level: 15 }, abilities)
  assert.equal(slots[0]?.level, 15)
  slots = reduceArcana(slots, { type: 'level', slot: 0, level: 1 }, abilities)
  assert.equal(slots[0]?.level, 1)
  assert.equal(reduceArcana(slots, { type: 'ability', slot: 0, abilityId: 'invalid' }, abilities), slots)
})
test('adjacency is orthogonal and never crosses rows', () => {
  assert.deepEqual(getAdjacentSlots(0), [1, 4])
  assert.deepEqual(getAdjacentSlots(5), [1, 4, 6, 9])
  assert.deepEqual(getAdjacentSlots(11), [7, 10])
  assert.deepEqual(getAdjacentSlots(3), [2, 7])
  assert.deepEqual(getAdjacentSlots(12), [])
})
test('restore discards unknown cards, duplicates, invalid levels and ability targets', () => {
  const slots = restoreArcana([{ arcanaId: 0, level: 15, selectedAbilityId: 'invalid' }, { arcanaId: 0, level: 1 },
    { arcanaId: 1, level: 16 }, { arcanaId: 999, level: 1 }, { arcanaId: 2, level: 2, selectedAbilityId: 'skill-a' }], abilities)
  assert.equal(slots.length, 12)
  assert.deepEqual(slots[0], { arcanaId: 0, level: 15 })
  assert.deepEqual(slots.slice(1, 4), [null, null, null])
  assert.equal(slots[4]?.selectedAbilityId, 'skill-a')
})
test('shared build persistence restores hero, equipment, levels and per-hero arcana', () => {
  const { heroes } = JSON.parse(readFileSync(new URL('../src/data/Characters.json', import.meta.url), 'utf8')) as { heroes: Character[] }
  const { items } = JSON.parse(readFileSync(new URL('../src/data/Equipment.json', import.meta.url), 'utf8')) as { items: EquipmentItem[] }
  const byId = new Map(items.map((item) => [item.id, item]))
  const state = createBuildState(heroes[1].id)
  state.heroLevels[heroes[1].id] = 3
  state.equipmentByHero[heroes[1].id] = [{ itemId: items[0].id, level: 2 }, null, null]
  state.arcanaByHero[heroes[1].id] = reduceArcana(EMPTY_ARCANA, { type: 'place', arcanaId: 5, slot: 4 }, abilities)
  const restored = restoreBuild(serializeBuild(state), heroes, byId, heroes[0].id)
  assert.equal(restored.selectedHeroId, heroes[1].id)
  assert.equal(restored.heroLevels[heroes[1].id], 3)
  assert.deepEqual(restored.arcanaByHero[heroes[1].id], state.arcanaByHero[heroes[1].id])
  assert.deepEqual(restored.equipmentByHero, state.equipmentByHero)
  assert.deepEqual(restoreBuild('broken', heroes, byId, heroes[0].id), createBuildState(heroes[0].id))
})

test('level formula uses signed fractional increments and reverses without accumulation', () => {
  const card = arcanaById.get(0)!
  assert.equal(getArcanaLevelBonus(card.attributes_bonus!, 1), -12)
  assert.equal(getArcanaLevelBonus(card.attributes_bonus!, 3), -9)
  assert.equal(getArcanaLevelBonus(card.abilities_bonus!, 15), 135)
  assert.equal(getArcanaLevelBonus(arcanaById.get(8)!.abilities_bonus!, 15), -40)
  assert.equal(getArcanaLevelBonus(arcanaById.get(35)!.attributes_bonus!, 7), 90)
  assert.equal(getArcanaLevelBonus(card.attributes_bonus!, 1), -12)
})

test('four neighbors sum temporary amplification without amplifying arcanas_bonus', () => {
  const slots = [...EMPTY_ARCANA]
  slots[5] = { arcanaId: 12, level: 2, randomTargetSlot: 1 }
  slots[1] = { arcanaId: 6, level: 2 }
  slots[4] = { arcanaId: 24, level: 1 }
  slots[6] = { arcanaId: 25, level: 1 }
  slots[9] = { arcanaId: 28, level: 1 }
  slots[0] = { arcanaId: 7, level: 1 }
  const amplification = temporaryAmplification(slots)
  assert.equal(amplification[5], 30 - 15 - 5 - 10)
  const resolved = resolvedArcanaBonuses(arcanaById.get(12)!, 2, amplification[5])
  assert.equal(resolved.arcanas_bonus, 15)
  assert.equal(resolved.attributes_bonus, 18)
  // With all four bonuses at different levels, only the source values matter.
  slots[1] = { arcanaId: 6, level: 3 }
  assert.equal(temporaryAmplification(slots)[5], 10)
  assert.equal(resolvedArcanaBonuses(arcanaById.get(12)!, 2, 10).arcanas_bonus, 15)
  assert.equal(resolvedArcanaBonuses(arcanaById.get(12)!, 2, 10).attributes_bonus, 19.8)
})

test('movement and removal update neighbors without diagonal or empty targets', () => {
  let slots: ArcanaSlots = [...EMPTY_ARCANA]
  slots = reduceArcana(slots, { type: 'place', slot: 0, arcanaId: 6 }, abilities)
  slots = reduceArcana(slots, { type: 'place', slot: 1, arcanaId: 7 }, abilities)
  // Card 7 grants 6 dodge; card 6 amplifies adjacent cards by 20%.
  assert.ok(Math.abs(calculateArcanaModifiers(slots).attributes.dodge! - 7.2) < 1e-12)
  slots = reduceArcana(slots, { type: 'move', from: 1, to: 5 }, abilities)
  assert.equal(calculateArcanaModifiers(slots).attributes.dodge, 6)
  slots = reduceArcana(slots, { type: 'move', from: 5, to: 4 }, abilities)
  assert.ok(Math.abs(calculateArcanaModifiers(slots).attributes.dodge! - 7.2) < 1e-12)
  slots = reduceArcana(slots, { type: 'remove', slot: 0 }, abilities)
  assert.equal(calculateArcanaModifiers(slots).attributes.dodge, 6)
})

test('random target is a neighboring slot and survives removal or replacement of its occupant', () => {
  const slots = [...EMPTY_ARCANA]
  slots[5] = { arcanaId: 12, level: 1 }
  slots[1] = { arcanaId: 7, level: 1 }
  slots[4] = { arcanaId: 30, level: 1 }
  let calls = 0
  const fixed = reconcileArcanaTargets(slots, () => { calls++; return 0 })
  assert.equal(calls, 1)
  assert.equal(fixed[5]?.randomTargetSlot, 1)
  const result = calculateArcanaModifiers(fixed)
  assert.equal(result.amplification[1], 10)
  assert.equal(result.amplification[4], 0)
  assert.deepEqual(calculateArcanaModifiers(fixed), result)
  assert.deepEqual(reconcileArcanaTargets(fixed, () => { throw Error('A valid target must stay fixed') }), fixed)
  const moved = reduceArcana(fixed, { type: 'move', from: 1, to: 11 }, abilities)
  assert.equal(reconcileArcanaTargets(moved, () => { throw Error('Empty slot stays targeted') })[5]?.randomTargetSlot, 1)
  assert.equal(temporaryAmplification(moved)[11], 0, 'influence does not follow the moved card')
  const alone = reduceArcana(moved, { type: 'remove', slot: 4 }, abilities)
  assert.equal(reconcileArcanaTargets(alone, () => { throw Error('Target stays fixed') })[5]?.randomTargetSlot, 1)
  const replacement = reduceArcana(alone, { type: 'place', slot: 1, arcanaId: 0 }, abilities)
  assert.equal(temporaryAmplification(replacement)[1], 10)
  assert.equal(temporaryAmplification(replacement)[11], 0)
  assert.deepEqual(restoreArcana(fixed, abilities), fixed)
  assert.equal(restoreArcana(moved, abilities)[5]?.randomTargetSlot, 1)
  const sourceMoved = reduceArcana(alone, { type: 'move', from: 5, to: 10 }, abilities)
  assert.equal(reconcileArcanaTargets(sourceMoved, () => 0)[10]?.randomTargetSlot, 6)
})

test('empty neighbors are eligible targets and legacy card targets migrate to slots', () => {
  const slots = [...EMPTY_ARCANA]
  slots[5] = { arcanaId: 12, level: 1 }
  for (const [random, target] of [[0, 1], [.25, 4], [.5, 6], [.99, 9]]) {
    const resolved = reconcileArcanaTargets(slots, () => random)
    assert.equal(resolved[5]?.randomTargetSlot, target)
    assert.ok(temporaryAmplification(resolved).every((value) => value === 0))
    assert.deepEqual(restoreArcana(resolved, abilities), resolved)
  }
  const legacy = [...slots]
  legacy[4] = { arcanaId: 7, level: 1 }
  const saved = legacy.map((entry, index) => index === 5 ? { ...entry, randomTargetArcanaId: 7 } : entry)
  assert.equal(restoreArcana(saved, abilities)[5]?.randomTargetSlot, 4)
  const invalid = [...slots]
  invalid[5] = { arcanaId: 12, level: 1, randomTargetSlot: 11 }
  assert.equal(restoreArcana(invalid, abilities)[5]?.randomTargetSlot, 1)
})

test('selected ability bonus is inactive until confirmed and transfers to the new target', () => {
  const hero = heroes[0]
  const skill = hero.skills[0]
  const other = hero.skills[1]
  let slots: ArcanaSlots = [...EMPTY_ARCANA]
  slots = reduceArcana(slots, { type: 'place', arcanaId: 0, slot: 0 }, abilities)
  assert.deepEqual(calculateArcanaModifiers(slots).abilityBonuses, {})
  const ids = new Set(hero.skills.map((entry) => entry.skill_image))
  slots = reduceArcana(slots, { type: 'ability', slot: 0, abilityId: skill.skill_image }, ids)
  assert.deepEqual(calculateArcanaModifiers(slots).abilityBonuses, { [skill.skill_image]: { Spell_duration: 30 } })
  slots = reduceArcana(slots, { type: 'ability', slot: 0, abilityId: other.skill_image }, ids)
  assert.deepEqual(calculateArcanaModifiers(slots).abilityBonuses, { [other.skill_image]: { Spell_duration: 30 } })
})

test('all supported ability fields modify existing parameters and leave source immutable', () => {
  const skill = { ...heroes[0].skills[0], damage: 10, cooldown: 20, range: 100, duration: 5,
    skill_values: [10, 20, 30], additional_effects: [{ name: 'Effect', info: '${value1}', skill_effect_image: 'effect.png', effects_values: [10, 20] }] }
  const source = structuredClone(skill)
  const result = skillAtLevel(skill, 1, { spell_damage: 20, spell_cooldown: -10, abilityBonuses: {
    '*': { All_values: 10, Spell_duration: 20 },
    [skill.skill_image]: { Spell_damage: 30, Spell_cooldown: -20, Spell_radius: 50, First_value: 20, Last_value: -10, Additional_effect_value: 50 },
  } })
  assert.equal(result.damage, 15)
  assert.equal(result.cooldown, 14)
  assert.equal(result.duration, 6)
  assert.equal(result.range, 150)
  assert.deepEqual(result.skill_values, [13, 22, 30])
  assert.deepEqual(result.additional_effects![0].effects_values, [15, 30])
  assert.deepEqual(skill, source)
  const passive = { ...skill, damage: undefined, duration: undefined, range: undefined, cooldown: undefined, skill_values: [] }
  const missing = skillAtLevel(passive, 1, { abilityBonuses: { '*': { Spell_damage: 100, Spell_duration: 100 } } })
  assert.equal(missing.damage, undefined)
  assert.equal(missing.duration, undefined)
  assert.deepEqual(missing.skill_values, [])
})

test('equipment and arcana modifiers combine before limits are applied once', () => {
  const item: EquipmentItem = { ...items[0], attributes_list: { attributes_name: ['Physical_defense'], attributes_bonus: [20] } }
  const byId = new Map([[item.id, item]])
  const base = { ...heroes[0].base_attributes, physical_defense: 80 }
  const final = calculateHeroAttributes(base, [{ itemId: item.id, level: 1 }, null, null], byId, { physical_defense: -30 })
  assert.equal(final.physical_defense, 70)
  assert.equal(base.physical_defense, 80)
  assert.deepEqual(calculateHeroAttributes(base, EMPTY_SLOTS, byId), base)
})

test('unique effects describe effective levels and removal restores the original calculation', () => {
  const slots = [...EMPTY_ARCANA]
  slots[0] = { arcanaId: 9, level: 2 }
  slots[1] = { arcanaId: 11, level: 15 }
  const original = structuredClone(slots)
  const result = calculateArcanaModifiers(slots)
  assert.deepEqual(result.attributes, {})
  assert.equal(result.effects.length, 2)
  assert.equal(result.effects[0].description,
    'Уровень 10\nКаждая единица здоровья героя даёт ему +0.46% магического и физического сопротивления')
  assert.deepEqual(result.amplification, Array(12).fill(0))
  assert.deepEqual(calculateArcanaModifiers(slots), result)
  assert.deepEqual(slots, original)
  assert.equal(calculateArcanaModifiers(EMPTY_ARCANA).effects.length, 0)
  const star = arcanaById.get(21)!.abilities_bonus!
  assert.equal(star.bonus_type, 'unique')
  if (star.bonus_type === 'unique') assert.doesNotMatch(uniqueDescription(star, -10), /--10/)
})

test('global spell bonuses are included in hero totals once and respect existing cooldown limits', () => {
  const slots = [...EMPTY_ARCANA]
  slots[0] = { arcanaId: 18, level: 1 }
  slots[1] = { arcanaId: 8, level: 15 }
  const arcana = calculateArcanaModifiers(slots)
  assert.equal(arcana.attributes.spell_damage, 7.5)
  assert.equal(arcana.attributes.spell_cooldown, -40)
  assert.deepEqual(arcana.abilityBonuses, {})
  const skill = { ...heroes[0].skills[0], damage: 100, cooldown: 20 }
  assert.equal(skillAtLevel(skill, 1, arcana.attributes).damage, 107.5)
  assert.equal(skillAtLevel(skill, 1, { spell_cooldown: -90 }).cooldown, 5)
})
