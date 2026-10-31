import { test } from 'node:test'
import assert from 'node:assert/strict'
import { arcanaConnectionViews } from '../src/utils/arcanaConnectionViews.ts'
import { temporaryAmplification } from '../src/utils/arcanaCalculator.ts'
import type { ArcanaInstance } from '../src/types/arcana.ts'

test('selected central card has four outgoing links, including neutral empty slots; borders have fewer', () => {
  const slots = Array<ArcanaInstance | null>(12).fill(null)
  slots[5] = { arcanaId: 11, level: 1 }
  assert.equal(arcanaConnectionViews(slots).filter((edge) => edge.from === 5).length, 4)
  assert.ok(arcanaConnectionViews(slots).every((edge) => edge.value === 0))
  slots[0] = slots[5]
  assert.equal(arcanaConnectionViews(slots).filter((edge) => edge.from === 0).length, 2)
})

test('unique neighbor level grants have visual links without adding percentage amplification', () => {
  const slots = Array<ArcanaInstance | null>(12).fill(null)
  slots[5] = { arcanaId: 11, level: 1 }
  slots[1] = { arcanaId: 0, level: 1 }
  slots[4] = { arcanaId: 1, level: 1 }
  assert.equal(arcanaConnectionViews(slots).filter((edge) => edge.from === 5 && edge.value > 0).length, 2)
  assert.equal(temporaryAmplification(slots)[1], 0)
  slots[5] = { arcanaId: 16, level: 1, randomTargetSlot: 4 }
  assert.deepEqual(arcanaConnectionViews(slots).filter((edge) => edge.from === 5 && edge.value > 0).map((edge) => edge.to), [4])
  slots[5] = { arcanaId: 37, level: 1 }
  assert.ok(arcanaConnectionViews(slots).filter((edge) => edge.from === 5).every((edge) => edge.value === 0))
})

test('neighbor influence changes from weakening to strengthening with source level', () => {
  const slots = Array<ArcanaInstance | null>(12).fill(null)
  slots[5] = { arcanaId: 28, level: 1 }
  slots[4] = { arcanaId: 0, level: 1 }
  assert.ok(arcanaConnectionViews(slots).find((edge) => edge.from === 5 && edge.to === 4)!.value < 0)
  slots[5] = { arcanaId: 28, level: 3 }
  assert.ok(arcanaConnectionViews(slots).find((edge) => edge.from === 5 && edge.to === 4)!.value > 0)
})
