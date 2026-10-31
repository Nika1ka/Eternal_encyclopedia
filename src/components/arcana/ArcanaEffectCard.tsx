import { EquipmentImage } from '../equipment/EquipmentIcon'
import { descriptionParts } from '../../utils/skillDescription'
import { formatNumber } from '../../utils/formatAttributes'

export function ArcanaEffectCard({ title, image, description }: {
  title: string; image?: string; description: string
}) {
  return <section className="equipment-ability">
    <header>{image && <EquipmentImage src={image} />}<h3>{title}</h3></header>
    {description.split('\n').map((paragraph, index) => <p key={index}>
      {descriptionParts(paragraph, []).map((part, i) => part.kind === 'text' ? part.text :
        <strong className="equipment-number" key={i}>{formatNumber(part.value)}{part.unit}</strong>)}
    </p>)}
  </section>
}
