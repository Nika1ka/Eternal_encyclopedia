import type { GameLocation } from '../../types/enemy'
import { locationImage } from '../../utils/enemyAssets'

export function LocationSelector({ locations, selectedId, onSelect }: {
  locations: readonly GameLocation[]; selectedId: number; onSelect: (id: number) => void
}) {
  return <nav className="location-selector" aria-label="Локации">
    {locations.map((location) => <button key={location.id} type="button" className="location-selector-item"
      aria-label={location.name} aria-pressed={location.id === selectedId} title={location.name}
      onClick={() => onSelect(location.id)}>
      <span className="hero-portrait"><img src={locationImage(location.id, true)} alt={location.name} /></span>
      <span className="sr-only">{location.name}</span>
    </button>)}
  </nav>
}
