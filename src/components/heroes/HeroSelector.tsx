import type { Character } from '../../types/character'
import { characterAsset, heroName } from '../../utils/characterAssets'

interface Props {
  heroes: Character[]
  selectedHeroId: number
  onSelect: (id: number) => void
}

export function HeroSelector({ heroes, selectedHeroId, onSelect }: Props) {
  return <nav className="hero-selector" aria-label="Выбор героя">
    {heroes.map((hero) => <button key={hero.id} className="hero-selector-item" type="button"
      aria-label={heroName(hero)} aria-pressed={hero.id === selectedHeroId}
      title={heroName(hero)} onClick={() => onSelect(hero.id)}>
      <span className="hero-portrait"><img src={characterAsset('Portraits', hero.icon_name)} alt="" /></span>
    </button>)}
  </nav>
}
