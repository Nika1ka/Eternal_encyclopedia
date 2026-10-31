import data from '../data/Characters.json'
import type { Character, HeroEffect } from '../types/character'

export const heroes: Character[] = data.heroes

// Reserved for effects from sources other than equipment.
export const activeEffects: readonly HeroEffect[] = []
