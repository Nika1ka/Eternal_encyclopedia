import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { EquipmentItem } from '../../types/equipment'
import { itemImage, rarities } from '../../utils/equipmentData'
import { uiAsset } from '../../utils/characterAssets'

export function EquipmentImage({ src, alt = '', className = '', lazy = false }: {
  src: string; alt?: string; className?: string; lazy?: boolean
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  return failedSrc === src ? <span className={`equipment-image-fallback ${className}`} role="img" aria-label={alt || 'Нет изображения'}>?</span>
    : <img className={className} src={src} alt={alt} loading={lazy ? 'lazy' : undefined} draggable={false} onError={() => setFailedSrc(src)} />
}
export function EquipmentIcon({ item, lazy = false }: { item: EquipmentItem; lazy?: boolean }) {
  return <span className="equipment-icon" style={{ '--rarity': rarities[item.rarity].color } as CSSProperties}>
    <EquipmentImage className="equipment-art" src={itemImage(item)} lazy={lazy} />
    <img className="equipment-rarity-mark" src={uiAsset(`item_rarity/item_rarity_${item.rarity + 1}.png`)} alt="" draggable={false} />
  </span>
}
