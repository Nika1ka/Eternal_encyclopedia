import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { formatSkillDescription, heroStatColumns, skillParameters } from '../src/utils/formatAttributes.ts'
import type { Character } from '../src/types/character.ts'
import { nextSkillVariant, orderedSkills, skillVariant } from '../src/utils/skillVariants.ts'
import { skillAtLevel } from '../src/utils/skillLevels.ts'
import { descriptionParts } from '../src/utils/skillDescription.ts'

const { heroes } = JSON.parse(readFileSync(new URL('../src/data/Characters.json', import.meta.url), 'utf8')) as { heroes: Character[] }
const hero = (name: string) => heroes.find((entry) => entry.name === name)!
const asset = (path: string) => new URL(`../public/assets/${path}`, import.meta.url)

test('all seven heroes have five complete base skill descriptions and existing artwork', () => {
  assert.equal(heroes.length, 7)
  assert.equal(new Set(heroes.map((entry) => entry.id)).size, 7)
  for (const entry of heroes) {
    assert.equal(entry.skills.length, 5, entry.name)
    assert.ok(existsSync(asset(`Game_images/Characters/Portraits/${entry.icon_name}`)))
    assert.ok(existsSync(asset(`Game_images/Characters/Models/${entry.model_name}`)))
    for (const skill of entry.skills) {
      assert.ok(existsSync(asset(`Game_images/Characters/Skills/${skill.skill_image}`)), skill.skill_image)
      assert.doesNotMatch(formatSkillDescription(skill), /\$\{/, skill.name)
      for (const effect of skill.additional_effects ?? []) {
        assert.ok(!formatSkillDescription(skill).includes(effect.info), `Additional effect leaked: ${effect.name}`)
      }
    }
  }
})

test('Ghost stats preserve negative resistance, attack-speed scaling and critical chance', () => {
  const [left, right] = heroStatColumns(hero('Ghost').base_attributes)
  assert.deepEqual(left.map((stat) => stat.value), ['0%', '-30%', '12%', '50', '1.1', '+20% (3%)'])
  assert.deepEqual(right.map((stat) => stat.value), ['240', '0%', '0%', '0%', '0%', '0%'])
})

test('explicit secondary stats override only the five allowed defaults', () => {
  const [left, right] = heroStatColumns({ ...hero('Fairy').base_attributes, attack_spead: 92,
    spell_damage: 12.5, spell_cooldown: 10, building_damage: -5, slow_effectiveness: 8, effect_resistance: 15 })
  assert.equal(left[4].value, '0.9')
  assert.deepEqual(right.map((stat) => stat.value), ['220', '12.5%', '10%', '-5%', '8%', '15%'])
})

test('skill interpolation handles decimals, repetition and zero without inventing values', () => {
  assert.equal(formatSkillDescription({ info: '${value1} / ${value2} / ${value1}', skill_values: [0, 2.5] }), '0 / 2.5 / 0')
  assert.equal(formatSkillDescription({ info: '${value1}', skill_values: [] }), '${value1}')
  assert.deepEqual(skillParameters(hero('Fairy').skills[4]), [])
})

test('every stat icon and explicitly mapped background exists, including unusual filenames', () => {
  for (const entry of heroes) {
    for (const stat of heroStatColumns(entry.base_attributes).flat()) {
      assert.ok(existsSync(asset(`ui/stats_icon/hero_stats/${stat.icon}.png`)), stat.icon)
    }
  }
  const source = readFileSync(new URL('../src/utils/characterAssets.ts', import.meta.url), 'utf8')
  const backgrounds = [...source.matchAll(/background: '([^']+)'/g)]
  assert.equal(backgrounds.length, 7)
  for (const [, file] of backgrounds) assert.ok(existsSync(asset(`Game_images/Characters/Backgrounds/${file}`)), file)
})

test('passive occupies slot 0, followed by the three active abilities and dash', () => {
  for (const entry of heroes) {
    const originalOrder = entry.skills.map((skill) => skill.skill_image)
    const ordered = orderedSkills(entry.skills)
    assert.match(ordered[0].skill_image, /_passive\.png$/)
    assert.deepEqual(ordered.slice(1), entry.skills.slice(0, 4))
    assert.deepEqual(entry.skills.map((skill) => skill.skill_image), originalOrder)
  }
})

test('variant arrows cycle in both directions and passive/dash remain base-only', () => {
  for (const entry of heroes) {
    for (const skill of entry.skills.slice(0, 3)) {
      assert.equal(nextSkillVariant(skill, 0, 1), 1)
      assert.equal(nextSkillVariant(skill, 1, 1), 2)
      assert.equal(nextSkillVariant(skill, 2, 1), 0)
      assert.equal(nextSkillVariant(skill, 0, -1), 2)
      assert.equal(nextSkillVariant(skill, 2, -1), 1)
      assert.equal(nextSkillVariant(skill, 1, -1), 0)
    }
    for (const skill of entry.skills.slice(3)) {
      assert.equal(nextSkillVariant(skill, 0, 1), 0)
      assert.equal(nextSkillVariant(skill, 0, -1), 0)
    }
  }
})

test('selected variant appends only its effect with substituted values and matching artwork', () => {
  for (const entry of heroes) {
    for (const skill of entry.skills) {
      const base = formatSkillDescription(skill)
      assert.equal(skillVariant(skill, 0).name, skill.name)
      assert.equal(skillVariant(skill, 0).description, base)
      for (const [index, effect] of (skill.additional_effects ?? []).entries()) {
        const variant = skillVariant(skill, index + 1)
        assert.equal(variant.name, effect.name)
        const extra = formatSkillDescription({ info: effect.info, skill_values: effect.effects_values })
        assert.equal(variant.description, `${base}\n\n${effect.name}\n${extra}`)
        assert.doesNotMatch(variant.description, /\$\{/)
        assert.equal(variant.image, effect.skill_effect_image)
        assert.ok(existsSync(asset(`Game_images/Characters/${variant.folder}/${variant.image}`)))
      }
    }
  }
})

test('levels 1–5 cumulatively unlock exactly the first four upgrades', () => {
  const skill = hero('Wizard').skills[0]
  assert.deepEqual(skillAtLevel(skill, 1), skill)
  assert.deepEqual(skillAtLevel(skill, 2).skill_values, [9, 3, 4])
  assert.deepEqual(skillAtLevel(skill, 3).skill_values, [9, 3, 5])
  assert.deepEqual(skillAtLevel(skill, 4).skill_values, [17, 3, 5])
  const max = skillAtLevel(skill, 5)
  assert.deepEqual(max.skill_values, [17, 3, 5])
  assert.equal(max.damage, skill.damage! + 15)
  assert.equal(max.skill_values[1], skill.skill_values[1], 'the fifth upgrade is unavailable')
  assert.deepEqual(skillAtLevel(skill, 6), max)
})

test('duration and signed value bonuses update descriptions and parameter rows', () => {
  const thorns = hero('Fairy').skills[1]
  const upgraded = skillAtLevel(thorns, 5)
  assert.equal(upgraded.duration, thorns.duration! + 3)
  assert.equal(upgraded.damage, thorns.damage! + 25)
  assert.equal(formatSkillDescription(upgraded).includes('1.9'), true)
  assert.ok(skillParameters(upgraded).some((parameter) => parameter.label === 'Длительность' && parameter.value === `${upgraded.duration} с`))
  const kingdom = hero('Fairy').skills[2]
  assert.equal(Number(skillAtLevel(kingdom, 5).skill_values[2].toFixed(6)), 1)
  assert.equal(skillAtLevel(kingdom, 5).duration, kingdom.duration, 'fifth duration upgrade remains locked')
})

test('level recalculation leaves source data and additional effects unchanged', () => {
  for (const entry of heroes) {
    for (const skill of entry.skills) {
      const source = structuredClone(skill)
      const upgraded = skillAtLevel(skill, 5)
      assert.deepEqual(skill, source)
      assert.deepEqual(skillAtLevel(skill, 1), source)
      assert.notEqual(upgraded.skill_values, skill.skill_values)
      assert.deepEqual(upgraded.additional_effects, source.additional_effects)
      for (let variantIndex = 1; variantIndex <= (skill.additional_effects?.length ?? 0); variantIndex++) {
        const variant = skillVariant(upgraded, variantIndex)
        assert.ok(variant.description.startsWith(formatSkillDescription(upgraded)))
        assert.equal(variant.name, skill.additional_effects![variantIndex - 1].name)
        assert.doesNotMatch(variant.description, /\$\{/)
      }
    }
  }
})

test('positive cooldown bonuses reduce cooldown cumulatively', () => {
  const skill = hero('Ghost').skills[3]
  assert.equal(skillAtLevel(skill, 1).cooldown, skill.cooldown)
  assert.equal(skillAtLevel(skill, 2).cooldown, skill.cooldown! - 0.2)
  assert.equal(Number(skillAtLevel(skill, 5).cooldown!.toFixed(6)), Number((skill.cooldown! - 1.4).toFixed(6)))
  assert.equal(skillAtLevel(skill, 5).range, skill.range! + 25)
  assert.equal(skillAtLevel(skill, 3).range, skill.range)
})

test('rich descriptions expose final values, percentages and accumulated signed bonuses', () => {
  assert.deepEqual(descriptionParts('Урон ${value1}%, время ${value2} с, до 10 раз.', [17, 1.2], [5, 2]), [
    { kind: 'text', text: 'Урон ' },
    { kind: 'value', value: 17, unit: '%', bonus: 12 },
    { kind: 'text', text: ', время ' },
    { kind: 'value', value: 1.2, unit: '', bonus: -0.8 },
    { kind: 'text', text: ' с, до ' },
    { kind: 'value', value: 10, unit: '', bonus: 0 },
    { kind: 'text', text: ' раз.' },
  ])
})

test('Magic Explosions and Chaotic Spheres keep base bonuses separate from effect values', () => {
  const base = hero('Wizard').skills[2]
  const upgraded = skillAtLevel(base, 3)
  const numbers = descriptionParts(upgraded.info, upgraded.skill_values, base.skill_values).filter((part) => part.kind === 'value')
  assert.deepEqual(numbers, [{ kind: 'value', value: 0.8, bonus: 0.3, unit: '' }])
  assert.equal(upgraded.cooldown, 17.5)
  assert.equal(upgraded.range, 220)
  const effect = base.additional_effects![1]
  assert.deepEqual(descriptionParts(effect.info, effect.effects_values).filter((part) => part.kind === 'value'), [
    { kind: 'value', value: 4, bonus: 0, unit: '' },
    { kind: 'value', value: 10, bonus: 0, unit: '' },
  ])
})

test('rich descriptions reconstruct all source descriptions without losing text or placeholders', () => {
  for (const entry of heroes) {
    for (const base of entry.skills) {
      const skill = skillAtLevel(base, 5)
      const parts = descriptionParts(skill.info, skill.skill_values, base.skill_values)
      const reconstructed = parts.map((part) => part.kind === 'text' ? part.text : `${Number(part.value.toFixed(6))}${part.unit}`).join('')
      assert.equal(reconstructed, formatSkillDescription(skill))
    }
  }
  assert.deepEqual(descriptionParts('${value2}', [1]), [{ kind: 'text', text: '${value2}' }])
})
