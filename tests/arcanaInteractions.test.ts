import { test } from 'node:test'
import assert from 'node:assert/strict'
import { arcanaCards, needsRandomNeighbor } from '../src/utils/arcanaData.ts'
import { arcanaInteractions, temporaryAmplification } from '../src/utils/arcanaCalculator.ts'
import { reduceArcana } from '../src/store/arcanaStore.ts'
import type { ArcanaInstance } from '../src/types/arcana.ts'

const basic = arcanaCards.filter((card) => card.arcanas_bonus?.bonus_type === 'basic' && !needsRandomNeighbor(card))
const positive = basic.find((card) => card.arcanas_bonus!.bonus_type === 'basic' && card.arcanas_bonus.attribute_bonus > 0)!
const negative = basic.find((card) => card.arcanas_bonus!.bonus_type === 'basic' && card.arcanas_bonus.attribute_bonus < 0)!
const neutral = arcanaCards.find((card) => !card.arcanas_bonus)!
const empty = () => Array<ArcanaInstance | null>(12).fill(null)

test('directed links preserve positive, negative, asymmetric and absent influences', () => {
  for (const a of [positive, negative, neutral]) for (const b of [positive, negative, neutral]) {
    const slots = empty()
    slots[0] = { arcanaId: a.id, level: 1 }
    slots[1] = { arcanaId: b.id, level: 1 }
    const links = arcanaInteractions(slots)
    assert.equal(links.length, Number(a !== neutral) + Number(b !== neutral))
    for (const link of links) {
      const source = link.from === 0 ? a : b
      assert.equal(Math.sign(link.value), source === positive ? 1 : -1)
      assert.equal(link.to, link.from === 0 ? 1 : 0)
    }
    const totals = temporaryAmplification(slots)
    for (let i = 0; i < 12; i++) assert.equal(totals[i], links.filter((link) => link.to === i).reduce((sum, link) => sum + link.value, 0))
  }
})

test('links exclude empty slots, diagonals and wrapped rows; previews do not mutate the layout', () => {
  const slots = empty()
  slots[3] = { arcanaId: positive.id, level: 1 }
  assert.deepEqual(arcanaInteractions(slots), [])
  slots[4] = { arcanaId: negative.id, level: 1 }
  slots[6] = { arcanaId: neutral.id, level: 1 }
  assert.deepEqual(arcanaInteractions(slots), [])
  const original = JSON.stringify(slots)
  const preview = reduceArcana(slots, { type: 'move', from: 3, to: 5 }, new Set())
  assert.equal(arcanaInteractions(preview).length, 3)
  assert.equal(JSON.stringify(slots), original)
})

test('random links use only the stored occupied adjacent slot, never guess a preview target', () => {
  const random = arcanaCards.find((card) => card.arcanas_bonus?.bonus_type === 'basic' && needsRandomNeighbor(card))!
  const slots = empty()
  slots[5] = { arcanaId: random.id, level: 1 }
  slots[4] = { arcanaId: neutral.id, level: 1 }
  assert.deepEqual(arcanaInteractions(slots), [])
  slots[5] = { ...slots[5]!, randomTargetSlot: 4 }
  assert.equal(arcanaInteractions(slots).length, 1)
  slots[4] = null
  assert.deepEqual(arcanaInteractions(slots), [])
})
