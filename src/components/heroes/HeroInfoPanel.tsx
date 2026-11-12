import type { BaseAttributes, Character, HeroEffect } from '../../types/character'
import { heroName, uiAsset } from '../../utils/characterAssets'
import { formatNumber, heroStatColumns } from '../../utils/formatAttributes'
import { TooltipTrigger } from './SkillTooltip'
import { LevelStars } from './LevelStars'

export function HeroLevelSelector({ level, onChange }: { level: number; onChange: (level: number) => void }) {
  return <div className="hero-level" role="group" aria-label={`Уровень героя: ${level}`}>
    <span>Уровень:</span>
    <LevelStars level={level} onChange={onChange} />
  </div>
}
export function HeroHealthShield({ attributes, decimals = 2 }: { attributes: BaseAttributes; decimals?: 1 | 2 }) {
  const shield = formatNumber(attributes.shield, decimals)
  const health = formatNumber(attributes.hp, decimals)
  return <div className="hero-health" aria-label={`Щит: ${shield}. Здоровье: ${health}`}>
    <img src={uiAsset('stats_icon/hero_stats/health.png')} alt="" />
    <div className="health-bars"><span className="shield-bar" title="Щит">{shield}</span>
      <span className="health-bar" title="Здоровье">{health}</span></div>
  </div>
}
export function HeroStats({ attributes, columns = heroStatColumns(attributes) }: { attributes: BaseAttributes; columns?: ReturnType<typeof heroStatColumns> }) {
  return <div className="hero-stats" aria-label="Базовые характеристики">
    {columns.map((column, index) => <dl key={index} className="stats-column">
      {column.map((stat) => <div key={stat.icon} className="stat" title={stat.label}>
        <dt><img src={uiAsset(`stats_icon/hero_stats/${stat.icon}.png`)} alt={stat.label} /></dt>
        <dd>{stat.value}</dd>
      </div>)}
    </dl>)}
  </div>
}
export function HeroEffects({ effects }: { effects: readonly HeroEffect[] }) {
  if (!effects.length) return null
  return <div className="hero-effects" role={effects.length ? 'group' : undefined} aria-label={effects.length ? 'Активные эффекты' : undefined}>
    {effects.map((effect) => <TooltipTrigger key={effect.id} className="effect-icon"
      content={{ id: effect.id, title: effect.name, description: effect.description, equipment: effect.equipment,
        arcana: effect.arcana, image: effect.arcana ? effect.image : undefined }}>
      <img src={effect.image} alt="" />
    </TooltipTrigger>)}
  </div>
}
export function HeroDescription({ paragraphs, label = 'История героя' }: { paragraphs: string[]; label?: string }) {
  return <div className="hero-description" tabIndex={0} role="region" aria-label={label}>
    {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
  </div>
}
export function HeroInfoPanel({ hero, level, onLevelChange, effects, attributes = hero.base_attributes }: {
  hero: Character; level: number; onLevelChange: (level: number) => void
  effects: readonly HeroEffect[]
  attributes?: BaseAttributes
}) {
  return <aside className="hero-info-panel" aria-labelledby="hero-name">
    <HeroLevelSelector level={level} onChange={onLevelChange} />
    <h1 id="hero-name" aria-live="polite">{heroName(hero)}</h1>
    <HeroHealthShield attributes={attributes} decimals={1} />
    <HeroStats attributes={attributes} />
    <HeroEffects effects={effects} />
    <img className="hero-divider" src={uiAsset('additional_icons/frame delim.png')} alt="" />
    <HeroDescription paragraphs={hero.game_description} />
  </aside>
}
