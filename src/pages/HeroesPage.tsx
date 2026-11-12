import { useEffect, useMemo, useReducer, useState } from 'react'
import type { CSSProperties } from 'react'
import { HeroSelector } from '../components/heroes/HeroSelector'
import { HeroDisplay } from '../components/heroes/HeroDisplay'
import { HeroInfoPanel } from '../components/heroes/HeroInfoPanel'
import { HeroTooltipScope } from '../components/heroes/SkillTooltip'
import { TopNavigation } from '../components/navigation/TopNavigation'
import { heroes, activeEffects } from '../utils/characterData'
import { assetUrl, heroBackground, uiAsset } from '../utils/characterAssets'
import { CrossfadeImage } from '../components/heroes/CrossfadeImage'
import { EquipmentCatalog } from '../components/equipment/EquipmentCatalog'
import { EquipmentDetailsPanel } from '../components/equipment/EquipmentDetailsPanel'
import { equipmentItems, equipmentById } from '../utils/equipmentData'
import { canEquipItem, createBuildReducer, createBuildState, EMPTY_SLOTS } from '../store/buildStore'
import { calculateHeroBuild } from '../engine/heroBuild'
import type { EquipmentInspection, ItemLevel } from '../types/equipment'
import { ArcanaPage } from './ArcanaPage'
import { EMPTY_ARCANA } from '../store/arcanaStore'
import { BUILD_STORAGE_KEY, restoreBuild, serializeBuild } from '../store/buildPersistence'
import type { ArcanaSlots } from '../types/arcana'
import { EnemiesPage } from './EnemiesPage'
import { getLocations } from '../utils/enemyData'
import { locationImage } from '../utils/enemyAssets'
import { useEquipmentOutsideDrop } from '../hooks/useEquipmentOutsideDrop'

const reducer = createBuildReducer(equipmentById, new Set(heroes.map((hero) => hero.id)))
const initialHeroId = heroes.find((hero) => hero.name === 'Fairy')?.id ?? heroes[0].id
function loadBuild(heroId: number) {
  try { return restoreBuild(localStorage.getItem(BUILD_STORAGE_KEY), heroes, equipmentById, heroId) }
  catch { return createBuildState(heroId) }
}

/** Heroes, equipment and Tarot share one persistent build and calculation pipeline. */
export function HeroesPage({ hidden = false, mode = 'heroes' }: { hidden?: boolean; mode?: 'heroes' | 'equipment' | 'upgrades' | 'enemies' }) {
  const [enemyBackground, setEnemyBackground] = useState(() => locationImage(getLocations()[0].id))
  const [build, dispatch] = useReducer(reducer, initialHeroId, loadBuild)
  useEffect(() => {
    try { localStorage.setItem(BUILD_STORAGE_KEY, serializeBuild(build)) } catch { /* Storage can be disabled by the browser. */ }
  }, [build])
  const [inspection, setInspection] = useState<EquipmentInspection | null>(null)
  const [draggingItemId, setDraggingItemId] = useState<number | null>(null)
  const hero = heroes.find((character) => character.id === build.selectedHeroId) ?? heroes[0]
  const [draggingEquipment, setDraggingEquipment] = useState<{ heroId: number; slot: number } | null>(null)
  useEquipmentOutsideDrop((mode === 'heroes' || mode === 'equipment') && draggingEquipment?.heroId === hero.id ? draggingEquipment.slot : null, (slot) => {
    dispatch({ type: 'unequip', slot }); setDraggingEquipment(null); setInspection(null)
  })
  const selectedHeroLevel = build.heroLevels[hero.id] ?? 1
  const variants = build.variantsByHero[hero.id] ?? {}
  const onVariant = (skillId: string, variant: number) => dispatch({ type: 'skillVariant', skillId, variant })
  const slots = build.equipmentByHero[hero.id] ?? EMPTY_SLOTS
  const arcanaSlots = build.arcanaByHero[hero.id] ?? EMPTY_ARCANA
  const calculated = useMemo(() => calculateHeroBuild(hero, selectedHeroLevel, slots, arcanaSlots, equipmentById), [hero, selectedHeroLevel, slots, arcanaSlots])
  const { attributes, modifiers, arcana } = calculated
  const effects = useMemo(() => [...activeEffects, ...calculated.effects.map((effect) => ({ ...effect, image: assetUrl(effect.image) }))], [calculated])
  const getModifiers = (candidate: ArcanaSlots) => calculateHeroBuild(hero, selectedHeroLevel, slots, candidate, equipmentById).modifiers
  const background = mode === 'enemies' ? enemyBackground : mode === 'upgrades' ? uiAsset('additional_icons/taro_cards_page_background.png') : heroBackground(hero)
  const style = {
    '--star-image': `url("${uiAsset('item_rarity/level_star.png')}")`,
  } as CSSProperties
  const onLevelChange = (level: number) => dispatch({ type: 'heroLevel', level })
  const onEquip = (itemId: number, slot: number) => {
    if (!canEquipItem(equipmentById, slots, itemId, slot)) return
    dispatch({ type: 'equip', itemId, slot })
    setDraggingItemId(null)
    setInspection(null)
  }
  const onItemLevel = (slot: number, level: ItemLevel) => dispatch({ type: 'itemLevel', slot, level })
  const inspectedInstance = inspection?.slot !== null && inspection?.slot !== undefined ? slots[inspection.slot] : null
  const inspectedItem = inspection && equipmentById.get(inspectedInstance?.itemId ?? inspection.itemId)
  const inspectionLevel = inspectedInstance?.level ?? inspection?.previewLevel ?? 1
  return <main className={`heroes-page ${mode === 'enemies' ? 'enemies-page' : mode === 'equipment' ? 'equipment-page' : mode === 'upgrades' ? 'arcana-page' : ''}`} hidden={hidden} style={style}>
    {background && <CrossfadeImage className="hero-background" src={background} priority />}
    <TopNavigation activePath={`/${mode}`} />
    <EnemiesPage embedded active={mode === 'enemies'} onBackgroundChange={setEnemyBackground} />
    <div className="scene-menu" data-active={mode === 'heroes'} inert={mode !== 'heroes'} aria-hidden={mode !== 'heroes'}>
    <HeroSelector heroes={heroes} selectedHeroId={hero.id} onSelect={(heroId) => {
      dispatch({ type: 'selectHero', heroId }); setInspection(null); setDraggingItemId(null)
    }} /></div>
    <div className="scene-menu" data-active={mode === 'equipment'} inert={mode !== 'equipment'} aria-hidden={mode !== 'equipment'}>
    <EquipmentCatalog items={equipmentItems} selectedId={inspection?.itemId}
      onInspect={(itemId, anchor) => setInspection({ itemId, anchor, slot: null, previewLevel: 1 })}
      onDragChange={(id) => { setDraggingItemId(id); if (id !== null) setInspection(null) }} /></div>
    <HeroTooltipScope heroId={hero.id} level={selectedHeroLevel} onLevelChange={onLevelChange} modifiers={modifiers}>
      <ArcanaPage key={hero.id} hero={hero} level={selectedHeroLevel} slots={arcanaSlots} active={mode === 'upgrades'} variants={variants} onVariant={onVariant}
        attributes={attributes} effects={effects} onLevel={onLevelChange} onChange={(next) => dispatch({ type: 'arcana', slots: next })}
        getModifiers={getModifiers} arcanaModifiers={arcana} />
      {mode !== 'upgrades' && mode !== 'enemies' ? <>
      <HeroDisplay hero={hero} equipment={slots} level={selectedHeroLevel} variants={variants} onVariant={onVariant} equipmentActions={{ draggingItemId, onEquip, onItemLevel,
        onDragSlot: (slot) => {
          setDraggingEquipment(slot === null ? null : { heroId: hero.id, slot })
          if (slot !== null) { setInspection(null); setDraggingItemId(null) }
        },
        canEquip: (itemId, slot) => canEquipItem(equipmentById, slots, itemId, slot),
        onInspectSlot: (slot, anchor) => {
          const instance = slots[slot]
          if (instance) setInspection({ itemId: instance.itemId, slot, anchor, previewLevel: 1 })
          else window.location.hash = '/equipment'
        },
      }} />
      <HeroInfoPanel hero={hero} level={selectedHeroLevel} effects={effects} attributes={attributes}
        onLevelChange={onLevelChange} />
      </> : null}
    </HeroTooltipScope>
    {!hidden && mode !== 'upgrades' && mode !== 'enemies' && inspection && inspectedItem && <EquipmentDetailsPanel key={`${hero.id}-${inspection.slot ?? 'catalog'}-${inspection.itemId}`}
      item={inspectedItem} level={inspectionLevel} bonusLevels={inspectedInstance ? arcana.equipmentLevelBonus : 0} inspection={inspection} slots={slots}
      onClose={() => setInspection(null)} onEquip={(slot) => onEquip(inspectedItem.id, slot)}
      onRemove={() => {
        if (inspection.slot !== null) dispatch({ type: 'unequip', slot: inspection.slot })
        setInspection(null)
      }} onLevelChange={(level) => {
        if (inspection.slot !== null) onItemLevel(inspection.slot, level)
        else setInspection((current) => current ? { ...current, previewLevel: level } : current)
      }} />}
  </main>
}
