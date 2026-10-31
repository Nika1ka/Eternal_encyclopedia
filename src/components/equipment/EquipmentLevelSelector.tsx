import type { CSSProperties } from 'react'
import type { ItemLevel } from '../../types/equipment'
import { uiAsset } from '../../utils/characterAssets'

export function EquipmentLevelSelector({ level, onChange, label = 'Уровень предмета' }: {
  level: ItemLevel; onChange: (level: ItemLevel) => void; label?: string
}) {
  return <div className="item-level-stars" role="group" aria-label={label}
    style={{ '--star-image': `url("${uiAsset('item_rarity/level_star.png')}")` } as CSSProperties}>
    {([1, 2, 3] as const).map((value) => <button type="button" key={value} aria-label={`${label}: ${value}`}
      aria-pressed={value === level} onClick={() => onChange(value)}>
      <span className={`star ${value <= level ? 'star-gold' : ''}`} />
    </button>)}
  </div>
}
