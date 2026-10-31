import type { ArcanaCard } from '../../types/arcana'
import { assetUrl, uiAsset } from '../../utils/characterAssets'
import { arcanaImagePath } from '../../utils/arcanaData'

export function ArcanaCardImage({ card, framed = false }: { card?: ArcanaCard; framed?: boolean }) {
  return <span className={`arcana-art ${framed ? 'arcana-art-framed' : ''}`}>
    {(framed || !card) && <img className="arcana-frame" src={uiAsset(`card_covers/${card ? 'card_frame.png' : 'empty_card.png'}`)} alt="" draggable={false} />}
    {card && <img className="arcana-illustration" src={assetUrl(arcanaImagePath(card))} alt={card.name} draggable={false} loading="lazy" />}
  </span>
}
