import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import bossesJson from '../src/data/Bosses.json' with { type: 'json' }
import { descriptionParagraphs, enemySkillParameters, enemyStatColumns, getEnemiesByLocation, getEnemyById,
  getEnemySkills, getLocationById, getLocationEffects, getLocations, nextEnemyId, selectLocation, skillArcPositions, switchEnemyMode,
  getBossesByLocation, getEncountersByLocation } from '../src/utils/enemyData.ts'
import { locationAssetPath, locationFolders, skillAssetOverrides } from '../src/utils/locationAssets.ts'

const assetExists = (path: string) => existsSync(new URL(`../public/assets/${path}`, import.meta.url))

test('all eight locations preserve source order and resolve their explicit backgrounds and posters', () => {
  assert.deepEqual(getLocations().map((location) => location.id), [0, 1, 2, 3, 4, 5, 6, 7])
  for (const location of getLocations()) {
    assert.equal(locationFolders[location.id].slice(4), location.location_name)
    assert.equal(getLocationById(location.id), location)
    assert.ok(assetExists(locationAssetPath(location.id, 'Background.png')))
    assert.ok(assetExists(locationAssetPath(location.id, 'Location_poster.png')))
  }
})
test('76 enemies are filtered by location ID, retain order and all models exist', () => {
  let total = 0
  for (const location of getLocations()) {
    const enemies = getEnemiesByLocation(location.id)
    total += enemies.length
    for (const enemy of enemies) {
      assert.equal(enemy.enemy_location_id, location.id)
      assert.equal(getEnemyById(enemy.id), enemy)
      assert.ok(assetExists(locationAssetPath(location.id, `Enemies/${enemy.model_name}`)))
    }
  }
  assert.equal(total, 76)
})
test('location changes select its first enemy and preserve the chosen mode', () => {
  for (const location of getLocations()) {
    for (const mode of ['enemy', 'location'] as const) {
      assert.deepEqual(selectLocation(location.id, mode), {
        selectedLocationId: location.id, selectedEnemyId: getEnemiesByLocation(location.id)[0].id, mode,
      })
    }
  }
})
test('next, previous and wraparound work independently in every location', () => {
  for (const location of getLocations()) {
    const enemies = getEnemiesByLocation(location.id)
    assert.equal(nextEnemyId(enemies, enemies[0].id, 1), enemies[1].id)
    assert.equal(nextEnemyId(enemies, enemies[1].id, -1), enemies[0].id)
    assert.equal(nextEnemyId(enemies, enemies.at(-1)!.id, 1), enemies[0].id)
    assert.equal(nextEnemyId(enemies, enemies[0].id, -1), enemies.at(-1)!.id)
    assert.equal(nextEnemyId([enemies[0]], enemies[0].id, 1), enemies[0].id)
  }
})
test('mode round trip preserves the selected enemy and location', () => {
  const state = { ...selectLocation(2), selectedEnemyId: getEnemiesByLocation(2)[3].id }
  const locationMode = switchEnemyMode(state)
  assert.equal(locationMode.mode, 'location')
  assert.equal(locationMode.selectedEnemyId, state.selectedEnemyId)
  assert.deepEqual(switchEnemyMode(locationMode), state)
})
test('empty locations remain in location mode with no selected enemy', () => {
  const state = selectLocation(999, 'enemy', [])
  assert.equal(state.selectedEnemyId, null)
  assert.equal(state.mode, 'location')
  assert.deepEqual(switchEnemyMode(state), state)
  assert.equal(nextEnemyId([], null, 1), null)
  assert.deepEqual(getEnemiesByLocation(999), [])
})
test('zero through seven skills fit along a symmetric arc without overlapping', () => {
  assert.deepEqual(skillArcPositions(0), [])
  assert.deepEqual(skillArcPositions(1), [{ left: '85%', top: '50%' }])
  for (let count = 2; count <= 7; count++) {
    const positions = skillArcPositions(count)
    assert.equal(positions.length, count)
    const iconHeight = (count > 5 ? 8.5 : 11.5) * 1.42
    for (let index = 1; index < count; index++) {
      assert.ok(parseFloat(positions[index].top) - parseFloat(positions[index - 1].top) > iconHeight)
    }
    assert.equal(positions[0].left, positions.at(-1)!.left)
    assert.ok(Math.abs(parseFloat(positions[0].top) + parseFloat(positions.at(-1)!.top) - 100) < .001)
  }
  const enemy = getEnemiesByLocation(0)[0]
  assert.deepEqual(getEnemySkills({ ...enemy, skills: undefined }), [])
  assert.equal(getEnemySkills({ ...enemy, skills: Array(7).fill(enemy.skills![0]) }).length, 7)
})
test('enemy stats preserve direct attack speed, zeros and missing secondary values', () => {
  const source = getEnemiesByLocation(0)[0]
  const base = { ...source, base_attributes: { ...source.base_attributes, physical_defense: 0, magic_resistance: 0, dodge: 0,
    damage: 50, attack_spead: 1, critical_damage: 75, critical_chance: 15, speed: 200,
    attack_lifesteal: 0, slow_effectiveness: 0, effect_resistance: 0, stun_resistance: 0 } }
  const columns = enemyStatColumns(base)
  assert.deepEqual(columns[0].map((stat) => stat.value), ['0%', '0%', '0%', '50', '1', '+75% (15%)'])
  assert.deepEqual(columns[1].map((stat) => stat.value), ['200', '0', '0%', '0%', '0%'])
  assert.deepEqual(columns[1].map((stat) => stat.icon), ['movement_speed', 'attack_lifesteal', 'slow_effectiveness', 'effect_resistance', 'stun_resistance'])
  const custom = enemyStatColumns({ ...base, base_attributes: { ...base.base_attributes,
    attack_lifesteal: 17.759, stun_resistance: 50, effect_resistance: undefined } })
  assert.deepEqual(custom[1].map((stat) => stat.value), ['200', '17.75', '0%', '-', '50%'])
  for (const column of columns) for (const stat of column) assert.ok(assetExists(`ui/stats_icon/hero_stats/${stat.icon}.png`))
})
test('skill parameters preserve explicit zero values and never invent missing fields', () => {
  assert.deepEqual(enemySkillParameters({ name: 'Test', info: '', damage: 0, duration: 2 }), [
    { label: 'Урон', value: '0' }, { label: 'Длительность', value: '2 с' },
  ])
})
test('descriptions keep paragraphs and line breaks, with a neutral empty state', () => {
  assert.deepEqual(descriptionParagraphs(['Первый\nВторой', 'Третий']), ['Первый', 'Второй', 'Третий'])
  assert.deepEqual(descriptionParagraphs('Первый\r\nВторой'), ['Первый', 'Второй'])
  assert.equal(descriptionParagraphs(undefined).length, 1)
})
test('all skill assets resolve including three explicit cross-folder mappings', () => {
  for (const location of getLocations()) for (const enemy of getEnemiesByLocation(location.id)) {
    for (const skill of getEnemySkills(enemy)) {
      const path = skillAssetOverrides[`${enemy.id}/${skill.skill_image}`] ?? locationAssetPath(location.id, `Skill_images/${skill.skill_image}`)
      assert.ok(assetExists(path), path)
    }
  }
})
test('location effects retain all entries and every icon including Toxic Marshes exists', () => {
  const missing: string[] = []
  for (const location of getLocations()) for (const effect of getLocationEffects(location)) {
    if (!assetExists(`Game_images/Location_effects/${effect.skill_image}`)) missing.push(effect.skill_image!)
  }
  assert.deepEqual(missing, [])
  assert.ok(assetExists('Game_images/Location_effects/Toxic Marshes.png'))
  assert.equal(getLocationEffects(getLocationById(6)!).length, 5)
  assert.deepEqual(getLocationEffects({ ...getLocationById(0)!, location_effects: undefined }), [])
})

test('every location appends its four bosses after regular enemies with distinct IDs', () => {
  const allIds = new Set<number>()
  for (const location of getLocations()) {
    const regular = getEnemiesByLocation(location.id)
    const bosses = getBossesByLocation(location.id)
    assert.deepEqual(bosses.map((boss) => boss.sourceId),
      bossesJson.enemies.filter((boss) => boss.enemy_location_id === location.id).map((boss) => boss.id))
    const entries = getEncountersByLocation(location.id)
    assert.equal(bosses.length, 4)
    assert.deepEqual(entries, [...regular, ...bosses])
    assert.equal(nextEnemyId(entries, regular.at(-1)!.id, 1), bosses[0].id)
    assert.equal(nextEnemyId(entries, bosses[0].id, -1), regular.at(-1)!.id)
    assert.equal(nextEnemyId(entries, bosses.at(-1)!.id, 1), regular[0].id)
    assert.equal(nextEnemyId(entries, regular[0].id, -1), bosses.at(-1)!.id)
    for (const entry of entries) {
      assert.ok(!allIds.has(entry.id))
      allIds.add(entry.id)
      assert.equal(getEnemyById(entry.id), entry)
    }
    for (const boss of bosses) {
      assert.equal(boss.id, -(boss.sourceId! + 1))
      assert.ok(assetExists(locationAssetPath(location.id, `Bosses/${boss.model_name}`)))
      for (const skill of getEnemySkills(boss)) assert.ok(assetExists(locationAssetPath(location.id, `Skill_images/${skill.skill_image}`)))
    }
  }
  assert.equal(allIds.size, 108)
})

test('boss selection survives a location-description round trip, including boss ID zero', () => {
  const boss = getBossesByLocation(0)[0]
  assert.equal(boss.sourceId, 0)
  const state = { ...selectLocation(0), selectedEnemyId: boss.id }
  assert.deepEqual(switchEnemyMode(switchEnemyMode(state)), state)
  assert.equal(getEnemyById(state.selectedEnemyId)?.name, 'Споровая масса')
  assert.equal(getEnemySkills(getBossesByLocation(4)[0]).length, 7)
})
