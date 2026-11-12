import type { CSSProperties } from 'react'
import { uiAsset } from '../../utils/characterAssets'

export function LevelStars({ level, onChange }: { level: number; onChange: (level: number) => void }) {
  return <div className="level-stars" data-level={level} role="group" aria-label={`Уровень героя: ${level}`}
    style={{ '--star-image': `url("${uiAsset('item_rarity/level_star.png')}")` } as CSSProperties}>
    {[1, 2, 3, 4, 5].map((value) => <button type="button" key={value}
      aria-label={`Уровень ${value}`} aria-pressed={level === value}
      onClick={() => onChange(value)} title={`Уровень ${value}`}>
      <span className="star" data-active={value <= level} />
    </button>)}
  </div>
}
