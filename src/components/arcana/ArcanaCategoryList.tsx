import type { CSSProperties } from 'react'
import type { ArcanaCategory, ArcanaSlots } from '../../types/arcana'
import { arcanaCards, arcanaCategories, categoryImagePath, categoryPresentation } from '../../utils/arcanaData'
import { assetUrl } from '../../utils/characterAssets'
import { ArcanaCardImage } from './ArcanaCardImage'
import { ARCANA_DRAG_TYPE } from '../../utils/arcanaDrag'

export function ArcanaCategoryList({ category, onCategory, selectedId, onInspect, slots, onDrag }: {
  category: ArcanaCategory | null; onCategory: (category: ArcanaCategory | null) => void
  selectedId: number | null; onInspect: (id: number) => void; slots: ArcanaSlots; onDrag: (id: number | null) => void
}) {
  return <nav className="arcana-categories" aria-label="Категории Таро">
    {arcanaCategories.map((entry) => <div className="arcana-category" key={entry}
      style={{ '--arcana-color': categoryPresentation[entry].color } as CSSProperties}>
      <button className="arcana-category-button" type="button" aria-label={categoryPresentation[entry].name}
        aria-expanded={category === entry} aria-controls={`arcana-category-${entry}`} title={categoryPresentation[entry].name}
        onClick={() => onCategory(category === entry ? null : entry)}>
        <span className="hero-portrait"><img src={assetUrl(categoryImagePath(entry))} alt="" /></span>
      </button>
      <div id={`arcana-category-${entry}`} className="arcana-category-panel" data-open={category === entry}
        inert={category !== entry} aria-hidden={category !== entry}>
      <div className="arcana-category-panel-content"><div className="arcana-mini-grid">
        {arcanaCards.filter((card) => card.category === entry).map((card) => {
          const equipped = slots.some((slot) => slot?.arcanaId === card.id)
          return <button type="button" key={card.id} className="arcana-mini" draggable={!equipped}
            aria-label={`${card.name}${equipped ? ', установлен' : ''}`} aria-pressed={selectedId === card.id}
            title={card.name} onClick={() => onInspect(card.id)}
            onDragStart={(event) => { onDrag(card.id); event.dataTransfer.setData(ARCANA_DRAG_TYPE, String(card.id)); event.dataTransfer.effectAllowed = 'copy' }}
            onDragEnd={() => onDrag(null)}>
            <ArcanaCardImage card={card} />{equipped && <span className="arcana-equipped" aria-hidden="true">✓</span>}
          </button>
        })}
      </div></div></div>
    </div>)}
  </nav>
}
