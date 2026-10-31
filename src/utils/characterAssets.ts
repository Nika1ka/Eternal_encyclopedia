import type { Character } from '../types/character'

export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`
export const uiAsset = (path: string) => assetUrl(`ui/${path}`)
export const characterAsset = (folder: string, file: string) => assetUrl(`Game_images/Characters/${folder}/${file}`)

// UI translations keyed by the names in Characters.json; filenames remain untouched.
const presentation: Record<string, { label: string; background: string }> = {
  Wizard: { label: 'Волшебница', background: 'Wizard_backgound.png' },
  Necromancer: { label: 'Некромант', background: 'Necromancer_background.png' },
  Hunter: { label: 'Охотница', background: 'Hunter_background.png' },
  Demon: { label: 'Демон', background: 'Demon_background.png' },
  Fairy: { label: 'Фея', background: 'Fairy_background.png' },
  Summoner: { label: 'Призыватель', background: 'Summoner_background.png.png' },
  Ghost: { label: 'Призрак', background: 'Ghost_background.png.png' },
}

export const heroName = (hero: Character) => presentation[hero.name]?.label ?? hero.name
export const heroBackground = (hero: Character) => {
  const file = presentation[hero.name]?.background
  return file ? characterAsset('Backgrounds', file) : undefined
}
