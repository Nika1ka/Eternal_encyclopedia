import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatNumber, formatSkillDescription } from '../src/utils/formatAttributes.ts'
import { uniqueDescription } from '../src/utils/arcanaCalculator.ts'

test('optional tenths precision floors both signs and omits trailing zeros', () => {
  for (const [value, expected] of [[1.7592, '1.7'], [1.5, '1.5'], [-1.7592, '-1.8'],
    [2, '2'], [0.09, '0'], [-0.09, '-0.1'], [0.3 - 0.2, '0.1']] as const) {
    assert.equal(formatNumber(value, 1), expected)
  }
  assert.equal(formatNumber(1.7592), '1.75')
})

test('display numbers floor to hundredths without trailing zeros or floating-point artifacts', () => {
  for (const [value, expected] of [
    [1.5, '1.5'], [1.7592, '1.75'], [2.457, '2.45'], [39.2625, '39.26'],
    [-5.7375, '-5.74'], [1.15, '1.15'], [-1.15, '-1.15'],
    [0.29, '0.29'], [0, '0'], [-0, '0'], [2, '2'], [0.009, '0'], [-0.009, '-0.01'],
  ] as const) assert.equal(formatNumber(value), expected)
})

test('skill and unique arcana descriptions use the same display precision', () => {
  assert.equal(formatSkillDescription({ info: 'На ${value1} секунд', skill_values: [2.457] }), 'На 2.45 секунд')
  assert.equal(uniqueDescription({ bonus_type: 'unique', bonus_description: '-${bonus_value}%',
    bonus_value: 1.7592, upgrade_bonus: 0 }, 1.7592), '-1.76%')
})
