import type { CSSProperties } from 'react'
import type { ArcanaCard, ArcanaInstance } from '../../types/arcana'
import { assetUrl, uiAsset } from '../../utils/characterAssets'
import { arcanaImagePath, bonusSections, bonusTitles, categoryPresentation, needsAbility, isArcanaLevelProtected } from '../../utils/arcanaData'
import { HeroDescription } from '../heroes/HeroInfoPanel'
import { formatNumber } from '../../utils/formatAttributes'
import { descriptionParts } from '../../utils/skillDescription'

export interface ArcanaBonusView { title?: string; text: string; value?: number; unit?: string; tone?: 'positive' | 'negative' | 'neutral' }
export function ArcanaDetails({ card, instance, level, effectiveLevel = level, bonuses, onLevel, onPlace, onClose, onAbility, targetName, amplification = 0 }: {
  card: ArcanaCard; instance?: ArcanaInstance; level: number
  bonuses: Partial<Record<typeof bonusSections[number], ArcanaBonusView>>
  onLevel: (level: number) => void; onPlace: () => void; onClose: () => void; onAbility: () => void; targetName?: string
  amplification?: number
  effectiveLevel?: number
}) {
  const category = categoryPresentation[card.category]
  return <aside className="hero-info-panel arcana-details" aria-labelledby="arcana-name" style={{ '--arcana-color': category.color } as CSSProperties}>
    <h1 id="arcana-name">{card.card_type === 'Major_Arcana' ? 'Старший Аркан' : 'Аркан'} {category.genitive}</h1>
    <div className="arcana-details-scroll">
      <div className="arcana-bonus-card">
        <header className="arcana-detail-header"><img src={assetUrl(arcanaImagePath(card))} alt="" />
          <div><h2>{card.name}</h2><span>Уровень {effectiveLevel}{effectiveLevel > level && ` (${level} + ${effectiveLevel - level})`}</span></div>
        </header>
        {bonusSections.map((section) => {
          const bonus = bonuses[section]
          if (!bonus) return null
          return <section className="arcana-bonus-block" key={section}>
            <h3>{bonus.title ?? bonusTitles[section]}</h3>
            <p>{card[section]?.bonus_type === 'unique' ? descriptionParts(bonus.text, []).map((part, index) =>
              part.kind === 'text' ? part.text : <strong key={index} className="arcana-neutral">{formatNumber(part.value)}{part.unit}</strong>) : bonus.text}
              {bonus.value !== undefined && <> <strong className={`arcana-${bonus.tone ?? 'neutral'}`}>{bonus.value > 0 ? '+' : ''}{formatNumber(bonus.value)}{bonus.unit ?? ''}</strong></>}</p>
          </section>
        })}
      </div>
      {amplification !== 0 && <p>Временное усиление: <strong className={amplification > 0 ? 'arcana-positive' : 'arcana-negative'}>{amplification > 0 ? '+' : ''}{formatNumber(amplification)}%</strong></p>}
      {targetName && <p className="arcana-target">Цель: {targetName}</p>}
      {isArcanaLevelProtected(card.id) && <p>Не получает бонусные уровни от других Арканов.</p>}
      <div className="arcana-level-controls">
        <button className="arcana-action" type="button" disabled={level <= 1} onClick={() => onLevel(level - 1)}>Уменьшить уровень</button>
        <button className="arcana-action" type="button" disabled={level >= 15} onClick={() => onLevel(level + 1)}>Добавить уровень</button>
      </div>
      <div className="arcana-detail-actions">
        {!instance && <button type="button" className="arcana-action" onClick={onPlace}>Установить в расклад</button>}
        {instance && needsAbility(card) && <button type="button" className="arcana-action" onClick={onAbility}>Выбрать способность</button>}
        <button type="button" className="arcana-action" onClick={onClose}>К герою</button>
      </div>
      <img className="hero-divider" src={uiAsset('additional_icons/frame delim.png')} alt="" />
      <HeroDescription label="Описание Аркана" paragraphs={card.game_description.split(/\r?\n/)} />
    </div>
  </aside>
}
