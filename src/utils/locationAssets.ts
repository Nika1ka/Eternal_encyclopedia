// Explicit IDs from Locations.json and verified directories; never rely on directory order.
export const locationFolders: Record<number, string> = {
  0: '01. Poisonous Mire',
  1: '02. Blood Catacombs',
  2: '03. Caldera',
  3: '04. Demonic Forge',
  4: '05. Ancient Ruins',
  5: '06. Crystal Archive',
  6: '07. Eternal Celestial City',
  7: '08. Shattered Abyss',
}
export const locationAssetPath = (id: number, file: string) => `Game_images/Enemies/${locationFolders[id]}/${file}`

// These exact filenames exist outside their enemy's location directory.
export const skillAssetOverrides: Record<string, string> = {
  '29/Forge_crash.png': 'Game_images/Enemies/03. Caldera/Skill_images/Forge_crash.png',
  '29/Return_lava_hammer.png': 'Game_images/Enemies/03. Caldera/Skill_images/Return_lava_hammer.png',
  '39/Incorporeality.png': 'Game_images/Location_effects/Incorporeality.png',
}
