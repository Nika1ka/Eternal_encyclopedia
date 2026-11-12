import type { Enemy, GameLocation } from '../../types/enemy'
import { uiAsset } from '../../utils/characterAssets'
import { descriptionParagraphs, enemyStatColumns, getLocationEffects } from '../../utils/enemyData'
import { effectImage } from '../../utils/enemyAssets'
import { HeroDescription, HeroHealthShield, HeroStats } from '../heroes/HeroInfoPanel'
import { TooltipTrigger } from '../heroes/SkillTooltip'

export function EnemyInfoPanel({ enemy }: { enemy: Enemy }) {
  return <>
    <h1 id="enemy-panel-title" aria-live="polite">{enemy.name}</h1>
    <HeroHealthShield attributes={enemy.base_attributes} />
    <HeroStats attributes={enemy.base_attributes} columns={enemyStatColumns(enemy)} />
    <img className="hero-divider" src={uiAsset('additional_icons/frame delim.png')} alt="" />
    <HeroDescription key={enemy.id} paragraphs={descriptionParagraphs(enemy.game_description)} label="Описание противника" />
  </>
}
export function LocationInfoPanel({ location }: { location: GameLocation }) {
  const effects = getLocationEffects(location)
  return <>
    <h1 id="enemy-panel-title" aria-live="polite">{location.name}</h1>
    {!!effects.length && <div className="location-effects" role="group" aria-label="Эффекты локации">
      {effects.map((effect, index) => <TooltipTrigger key={`${location.id}-${index}`} className="location-effect"
        content={{ id: `location-${location.id}-effect-${index}`, title: effect.name, description: effect.info,
          image: effectImage(effect), enemySkill: effect }}>
        {effectImage(effect) ? <img src={effectImage(effect)} alt={effect.name} /> : <span className="missing-effect-icon" aria-hidden="true">?</span>}
      </TooltipTrigger>)}
    </div>}
    <img className="hero-divider" src={uiAsset('additional_icons/frame delim.png')} alt="" />
    <HeroDescription key={location.id} paragraphs={descriptionParagraphs(location.description)} label="Описание локации" />
  </>
}
