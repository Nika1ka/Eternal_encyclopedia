import { test } from 'node:test'
import assert from 'node:assert/strict'
import characters from '../src/data/Characters.json' with { type: 'json' }
import equipment from '../src/data/Equipment.json' with { type: 'json' }
import type { Character } from '../src/types/character.ts'
import type { ArcanaSlots } from '../src/types/arcana.ts'
import { EMPTY_ARCANA, reconcileArcanaTargets, reduceArcana, restoreArcana } from '../src/store/arcanaStore.ts'
import { EMPTY_SLOTS } from '../src/store/buildStore.ts'
import { calculateArcanaModifiers, effectiveArcanaLevels, resolvedArcanaBonuses } from '../src/utils/arcanaCalculator.ts'
import { arcanaById } from '../src/utils/arcanaData.ts'
import { calculateHeroBuild } from '../src/engine/heroBuild.ts'
import { equipmentAtLevel } from '../src/engine/equipmentModifiers.ts'
import { skillAtLevel } from '../src/utils/skillLevels.ts'
import { arcanaConnectionViews } from '../src/utils/arcanaConnectionViews.ts'

const items = new Map(equipment.items.map(item => [item.id, item]))
const hero = (name: string) => characters.heroes.find(hero => hero.name === name)! as Character
const slots = (...entries: [number, number, number, number?][]): ArcanaSlots => {
  const result = [...EMPTY_ARCANA]
  for (const [slot, arcanaId, level, randomTargetSlot] of entries) result[slot] = { arcanaId, level, randomTargetSlot }
  return result
}
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`)

test('level grants floor fractional bonuses, respect adjacency, cap at 20 and never mutate manual levels', () => {
  const layout = slots([5, 11, 2], [1, 7, 15], [0, 9, 15], [6, 16, 15, 1])
  const saved = structuredClone(layout)
  assert.equal(effectiveArcanaLevels(layout)[1], 16)
  assert.equal(effectiveArcanaLevels(layout)[0], 15)
  assert.equal(effectiveArcanaLevels(layout)[6], 15)
  const higher = reduceArcana(layout, { type: 'level', slot: 5, level: 3 }, new Set())
  assert.equal(effectiveArcanaLevels(higher)[1], 17)
  const capped = slots([5, 11, 15], [1, 7, 15], [0, 16, 15, 1])
  assert.equal(effectiveArcanaLevels(capped)[1], 20)
  assert.deepEqual(layout, saved)
  assert.equal(effectiveArcanaLevels(reduceArcana(layout, { type: 'remove', slot: 5 }, new Set()))[1], 15)
})

test('Emperor keeps exactly one persisted slot across level changes and changes of occupant', () => {
  const layout = reconcileArcanaTargets(slots([0, 37, 1]), () => .99)
  assert.equal(layout[0]?.randomTargetSlot, 11)
  const upgraded = reduceArcana(layout, { type: 'level', slot: 0, level: 15 }, new Set())
  assert.deepEqual(reconcileArcanaTargets(upgraded, () => { throw Error('must retain target') }), upgraded)
  assert.deepEqual(restoreArcana(upgraded, new Set()), upgraded)
  const occupied = reduceArcana(upgraded, { type: 'place', slot: 11, arcanaId: 7 }, new Set())
  assert.equal(effectiveArcanaLevels(occupied)[11], 19)
  assert.equal(effectiveArcanaLevels(slots([0, 37, 15, 11], [11, 11, 1]))[11], 1)
})

test('Chariot grants all ordinary cards one level and itself one, excluding other level granters', () => {
  const layout = slots([0, 39, 1], [1, 11, 1], [2, 16, 1], [3, 37, 1, 4], [4, 7, 15])
  assert.deepEqual(effectiveArcanaLevels(layout).slice(0, 5), [3, 1, 1, 1, 20])
  const wizard = hero('Wizard')
  const result = calculateHeroBuild(wizard, 1, EMPTY_SLOTS, slots([0, 39, 1]), items)
  close(result.attributes.hp, wizard.base_attributes.hp * .9)
  close(result.attributes.speed, wizard.base_attributes.speed * .9)
  assert.equal(result.arcana.levels[0], 2)
})

test('Chariot receives Lovers, Judgement and Emperor levels, with visible links and a cap of 20', () => {
  const layout = slots([5, 39, 1], [1, 11, 3], [4, 16, 1, 5], [11, 37, 1, 5])
  assert.equal(effectiveArcanaLevels(layout)[5], 11) // manual 1 + own 1 + 2 + 3 + 4
  assert.equal(calculateArcanaModifiers(layout).allAttributesPercent, 26)
  assert.equal(arcanaConnectionViews(layout).find(edge => edge.from === 1 && edge.to === 5)?.value, 2)
  assert.equal(arcanaConnectionViews(layout).find(edge => edge.from === 4 && edge.to === 5)?.value, 3)
  assert.equal(effectiveArcanaLevels(slots([5, 39, 15], [1, 11, 15]))[5], 20)
  assert.equal(effectiveArcanaLevels(slots([5, 39, 1]))[5], 2)
  assert.equal(layout[5]?.level, 1)
})

test('Blood River grants flat lifesteal from equipped group zero items and stacks with Necromancer', () => {
  const wizard = hero('Wizard'), necro = hero('Necromancer')
  for (const [itemId, expected] of [[0, .1], [1, .15], [2, .15]]) {
    const gear = [{ itemId, level: 3 as const }, null, null] as const
    const result = calculateHeroBuild(wizard, 1, gear, EMPTY_ARCANA, items)
    close(result.attributes.attack_lifesteal!, expected)
    close(calculateHeroBuild(necro, 1, gear, EMPTY_ARCANA, items).attributes.attack_lifesteal!, expected + .2)
    const chariot = calculateHeroBuild(wizard, 1, gear, slots([0, 39, 1]), items)
    close(chariot.attributes.attack_lifesteal!, expected * .9)
  }
  assert.equal(calculateHeroBuild(wizard, 1, EMPTY_SLOTS, EMPTY_ARCANA, items).attributes.attack_lifesteal, undefined)
  const upgraded = structuredClone(items.get(0)!)
  upgraded.upgrade_bonuses.skill_value_tags = ['value1']
  upgraded.upgrade_bonuses.skill_bonus = [.05]
  const customItems = new Map(items).set(0, upgraded)
  const fortune = calculateHeroBuild(wizard, 1, [{ itemId: 0, level: 3 }, null, null], slots([0, 29, 1]), customItems)
  close(fortune.attributes.attack_lifesteal!, .25)
  const withoutEffect = { ...upgraded, item_abilities: [] }
  assert.equal(calculateHeroBuild(wizard, 1, [{ itemId: 0, level: 3 }, null, null], EMPTY_ARCANA,
    new Map(items).set(0, withoutEffect)).attributes.attack_lifesteal, undefined)
})

test('Temperance grants only the confirmed skill one level, up to six, unaffected by bonus amplification', () => {
  const necro = hero('Necromancer')
  const passive = necro.skills.find(skill => skill.skill_image === 'Necromancer_passive.png')!
  const layout = [...slots([0, 5, 15], [1, 6, 15])]
  assert.deepEqual(calculateArcanaModifiers(layout, necro.skills).skillLevelBonuses, {})
  layout[0] = { ...layout[0]!, selectedAbilityId: passive.skill_image }
  const arcana = calculateArcanaModifiers(layout, necro.skills, { abilities: 100 })
  const sixth = skillAtLevel(passive, 5, arcana)
  assert.equal(sixth.effective_level, 6)
  close(sixth.skill_values[0], 40)
  const build = calculateHeroBuild(necro, 5, EMPTY_SLOTS, layout, items)
  close(build.attributes.hp, Math.max(3, (necro.base_attributes.hp + build.arcana.attributes.hp!) * .6))
  assert.deepEqual(skillAtLevel(passive, 5, { skillLevelBonuses: { [passive.skill_image]: 100 } }), sixth)
  assert.equal(resolvedArcanaBonuses(arcanaById.get(5)!, 15, 500, { abilities: 100 }).abilities_bonus, 1)
})

test('Fortune upgrades equipped items beyond three in stats and effect descriptions, removal reverses it', () => {
  const wizard = hero('Wizard')
  const gear = [{ itemId: 20, level: 3 as const }, null, null] as const
  const base = calculateHeroBuild(wizard, 1, gear, EMPTY_ARCANA, items)
  const result = calculateHeroBuild(wizard, 1, gear, slots([0, 29, 1]), items)
  assert.equal(result.arcana.equipmentLevelBonus, 1)
  assert.equal(result.attributes.critical_damage - base.attributes.critical_damage, 25)
  assert.equal(result.effects.find(effect => effect.equipment)?.equipment?.level, 4)
  assert.equal(equipmentAtLevel(items.get(20)!, 4).attributes.Critical_hit_amount, 150)
  assert.equal(gear[0].level, 3)
  assert.deepEqual(calculateHeroBuild(wizard, 1, gear, EMPTY_ARCANA, items), base)
})

test('Strength uses total health and Magician sums effective adjacent levels only', () => {
  const wizard = hero('Wizard')
  const gear = [{ itemId: 33, level: 1 as const }, null, null] as const
  const base = calculateHeroBuild(wizard, 1, gear, EMPTY_ARCANA, items)
  const strength = calculateHeroBuild(wizard, 1, gear, slots([0, 9, 2]), items)
  close(strength.attributes.magic_resistance - base.attributes.magic_resistance, base.attributes.hp * .14)
  const result = calculateArcanaModifiers(slots([5, 40, 1], [1, 7, 2], [4, 11, 1], [0, 9, 15]))
  // Lovers also raises Magician to level 2: (2 + 1) adjacent levels * 4.5 damage.
  assert.equal(result.attributes.damage, 13.5)
  assert.equal(result.attributes.spell_damage, 13.5)
})

test('Necromancer health and lifesteal, Demon slots and Ghost current shield affect hero attributes', () => {
  const necro = hero('Necromancer'), demon = hero('Demon'), ghost = hero('Ghost')
  const n = calculateHeroBuild(necro, 1, EMPTY_SLOTS, EMPTY_ARCANA, items)
  close(n.attributes.hp, Math.max(3, necro.base_attributes.hp * .3))
  close(n.attributes.attack_lifesteal!, .2)
  const d = calculateHeroBuild(demon, 1, EMPTY_SLOTS, EMPTY_ARCANA, items)
  close(d.attributes.physical_defense, demon.base_attributes.physical_defense + 12 * 2.2)
  const occupied = calculateHeroBuild(demon, 1, EMPTY_SLOTS, slots([0, 37, 1, 11]), items)
  close(occupied.attributes.damage, demon.base_attributes.damage + 1.5)
  close(occupied.attributes.physical_defense, demon.base_attributes.physical_defense + 11 * 2.2)
  const g = calculateHeroBuild(ghost, 1, EMPTY_SLOTS, EMPTY_ARCANA, items)
  close(g.attributes.magic_resistance, ghost.base_attributes.magic_resistance + ghost.base_attributes.shield * .8)
})

test('Fairy boosts attribute and ability magnitudes without increasing granted levels', () => {
  const fairy = hero('Fairy')
  const result = calculateHeroBuild(fairy, 1, EMPTY_SLOTS, slots([0, 5, 1], [1, 29, 1]), items)
  close(result.arcana.attributes.hp!, -7 * .9 * 1.15)
  assert.equal(result.arcana.equipmentLevelBonus, 1)
  assert.equal(result.arcana.efficiency.abilities, 15)
  const base = calculateArcanaModifiers(slots([0, 18, 1]))
  const buff = calculateHeroBuild(fairy, 1, EMPTY_SLOTS, slots([0, 18, 1]), items)
  close(buff.arcana.attributes.spell_damage!, base.attributes.spell_damage! * 1.15)
})

test('Fairy self-targeting is evaluated once and tooltips use the same passive values as calculations', () => {
  const fairy = hero('Fairy')
  const passive = fairy.skills.find(skill => skill.skill_image === 'Fairy_passive.png')!
  const layout = [...slots([0, 29, 1])]
  layout[0] = { ...layout[0]!, selectedAbilityId: passive.skill_image }
  const result = calculateHeroBuild(fairy, 1, EMPTY_SLOTS, layout, items)
  close(result.arcana.efficiency.abilities!, 12)
  close(skillAtLevel(passive, 1, result.modifiers).skill_values[0], result.arcana.efficiency.abilities!)
  assert.deepEqual(calculateHeroBuild(fairy, 1, EMPTY_SLOTS, layout, items), result)
})

test('dependent defenses use displayed health and shield, and attribute limits apply after all effects', () => {
  const ghost = hero('Ghost')
  const custom = { ...ghost, base_attributes: { ...ghost.base_attributes, hp: 100, shield: 50, magic_resistance: 0, physical_defense: 0 } }
  const result = calculateHeroBuild(custom, 1, EMPTY_SLOTS, slots([0, 39, 1], [11, 9, 1]), items)
  close(result.attributes.hp, 90)
  close(result.attributes.shield, 45)
  close(result.attributes.magic_resistance, (45 * .8 + 90 * .14) * .9)
  const capped = calculateHeroBuild({ ...custom, base_attributes: { ...custom.base_attributes, shield: 1000 } }, 1, EMPTY_SLOTS, EMPTY_ARCANA, items)
  assert.equal(capped.attributes.magic_resistance, 85)
})
