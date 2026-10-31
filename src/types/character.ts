export interface BaseAttributes {
  hp: number
  shield: number
  physical_defense: number
  magic_resistance: number
  dodge: number
  damage: number
  /** The source JSON spells this field attack_spead. */
  attack_spead: number
  critical_damage: number
  critical_chance: number
  speed: number
  spell_damage?: number
  spell_cooldown?: number
  building_damage?: number
  slow_effectiveness?: number
  effect_resistance?: number
  attack_lifesteal?: number
}

export interface Skill {
  effective_level?: number
  name: string
  info: string
  skill_image: string
  skill_values: number[]
  cooldown?: number
  range?: number
  damage?: number
  duration?: number
  additional_effects?: {
    name: string
    info: string
    skill_effect_image: string
    effects_values: number[]
  }[]
  upgrade_per_level_bonuses: {
    skill_per_level_value_tags: string[]
    skill_per_level_bonus: number[]
    skill_per_level_text: string[]
  }
}

export interface Character {
  id: number
  name: string
  icon_name: string
  model_name: string
  game_description: string[]
  base_attributes: BaseAttributes
  skills: Skill[]
}

/** Calculated effects displayed in the shared hero panel and tooltip. */
export interface HeroEffect {
  id: string
  name: string
  description: string
  image: string
  equipment?: { itemId: number; level: number; abilityIndex: number }
  arcana?: { level: number }
}

