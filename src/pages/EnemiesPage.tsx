import { useEffect, useRef, useState } from 'react'
import { TopNavigation } from '../components/navigation/TopNavigation'
import { CrossfadeImage } from '../components/heroes/CrossfadeImage'
import { HeroTooltipScope } from '../components/heroes/SkillTooltip'
import { LocationSelector } from '../components/enemies/LocationSelector'
import { EnemyCarousel } from '../components/enemies/EnemyCarousel'
import { EnemyInfoPanel, LocationInfoPanel } from '../components/enemies/EnemyInfoPanel'
import { getEncountersByLocation, getEnemyById, getLocationById, getLocations, selectLocation, switchEnemyMode } from '../utils/enemyData'
import { enemyImage, locationImage, locationButtonColors } from '../utils/enemyAssets'
import type { EnemyPageState } from '../types/enemy'

const noop = () => {}
export function EnemiesPage({ hidden = false, embedded = false, active = true, onBackgroundChange }: {
  hidden?: boolean; embedded?: boolean; active?: boolean; onBackgroundChange?: (src: string) => void
}) {
  const [state, setState] = useState(() => selectLocation(getLocations()[0].id))
  const [fading, setFading] = useState(false)
  const request = useRef(0)
  const desired = useRef(state)
  useEffect(() => () => { request.current++ }, [])
  const changeScene = async (next: EnemyPageState) => {
    desired.current = next
    const ticket = ++request.current
    const target = getEnemyById(next.selectedEnemyId)
    const sources = [locationImage(next.selectedLocationId), next.mode === 'enemy' && target ? enemyImage(target) : ''].filter(Boolean)
    await Promise.all(sources.map(async (src) => {
      const image = new Image()
      image.src = src
      await image.decode().catch(() => undefined)
    }))
    if (ticket !== request.current) return
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFading(true)
      await new Promise((resolve) => setTimeout(resolve, 180))
    }
    if (ticket !== request.current) return
    setState(next)
    setFading(false)
  }
  const location = getLocationById(state.selectedLocationId)!
  useEffect(() => { onBackgroundChange?.(locationImage(location.id)) }, [location.id, onBackgroundChange])
  const enemies = getEncountersByLocation(location.id)
  const enemy = getEnemyById(state.selectedEnemyId)
  const enemyMode = state.mode === 'enemy' && !!enemy
  const content = <>
    <div className="scene-menu" data-active={active} inert={!active} aria-hidden={!active}>
    <LocationSelector locations={getLocations()} selectedId={location.id}
      onSelect={(id) => { if (id !== desired.current.selectedLocationId) void changeScene(selectLocation(id, desired.current.mode)) }} />
    </div>
    <div className="enemy-scene" data-active={active} data-fading={fading} inert={fading || !active} aria-hidden={!active}>
    <HeroTooltipScope key={`${location.id}-${state.mode}`} heroId={enemyMode ? enemy.id : -location.id - 1} level={1} onLevelChange={noop}>
      {enemyMode && <EnemyCarousel key={location.id} enemy={enemy} enemies={enemies}
        onSelect={(id) => {
          // A location/mode request takes precedence over an in-flight carousel image load.
          if (desired.current.selectedLocationId !== location.id || desired.current.mode !== state.mode) return
          desired.current = { ...state, selectedEnemyId: id }
          setState(desired.current)
        }} />}
      <aside className="hero-info-panel enemy-info-panel" aria-labelledby="enemy-panel-title">
        {enemyMode ? <EnemyInfoPanel enemy={enemy} /> : <LocationInfoPanel location={location} />}
        <button type="button" className="enemy-mode-button" style={{ backgroundColor: locationButtonColors[location.id] }}
          disabled={!enemyMode && !enemies.length} onClick={() => void changeScene(switchEnemyMode(desired.current))}>
          {enemyMode ? 'К описанию локации' : enemies.length ? 'К описанию противников' : 'В этой локации нет противников'}
        </button>
      </aside>
    </HeroTooltipScope>
    </div>
  </>
  return embedded ? content : <main className="enemies-page" hidden={hidden}>
    <CrossfadeImage className="enemy-background" src={locationImage(location.id)} priority />
    <TopNavigation activePath="/enemies" />
    {content}
  </main>
}
