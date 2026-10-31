import { useEffect, useLayoutEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { EquipmentInspection, EquipmentItem, EquipmentSlots, ItemLevel } from '../../types/equipment'
import { equipmentAtLevel } from '../../engine/equipmentModifiers'
import { equipmentAttributes, modifierTone } from '../../utils/equipmentAttributes'
import { equipmentById, rarities, resourceImage } from '../../utils/equipmentData'
import { EquipmentAbilityCard, EquipmentSignedValue } from './EquipmentAbilityCard'
import { uiAsset } from '../../utils/characterAssets'
import { EquipmentIcon, EquipmentImage } from './EquipmentIcon'
import { EquipmentLevelSelector } from './EquipmentLevelSelector'
import { canEquipItem } from '../../store/buildStore'

export function EquipmentDetailsPanel({ item, level, bonusLevels = 0, inspection, slots, onLevelChange, onEquip, onRemove, onClose }: {
  item: EquipmentItem; level: ItemLevel; inspection: EquipmentInspection; slots: EquipmentSlots
  bonusLevels?: number
  onLevelChange: (level: ItemLevel) => void; onEquip: (slot: number) => void
  onRemove: () => void; onClose: () => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const { attributes, baseAttributes, values } = equipmentAtLevel(item, level + bonusLevels)
  useLayoutEffect(() => {
    const element = panel.current
    if (!element) return
    const place = () => {
      const width = element.offsetWidth, height = element.offsetHeight
      const preferred = inspection.anchor.right + 16
      const left = preferred + width < window.innerWidth - 12 ? preferred : inspection.anchor.left - width - 16
      element.style.left = `${Math.max(12, Math.min(left, window.innerWidth - width - 12))}px`
      element.style.top = `${Math.max(12, Math.min(inspection.anchor.top, window.innerHeight - height - 12))}px`
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(element)
    window.addEventListener('resize', place)
    return () => { observer.disconnect(); window.removeEventListener('resize', place) }
  }, [inspection.anchor])
  useEffect(() => {
    const previousFocus = document.activeElement
    closeButton.current?.focus()
    return () => { if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus() }
  }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest('.equipment-details, [data-equipment-inspect], [data-loadout]')) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('hashchange', onClose)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('hashchange', onClose)
    }
  }, [onClose])
  return createPortal(<div ref={panel} className="equipment-details" role="dialog" aria-labelledby="equipment-details-title"
    style={{ '--rarity': rarities[item.rarity].color } as CSSProperties}>
    <header className="equipment-details-header">
      <EquipmentIcon item={item} />
      <h2 id="equipment-details-title">{item.name}</h2>
      <button ref={closeButton} type="button" className="equipment-close" aria-label="Закрыть карточку предмета" onClick={onClose}>×</button>
      <div className="equipment-details-meta">
        <EquipmentLevelSelector level={level} onChange={onLevelChange} />
        {bonusLevels > 0 && <span>Итоговый уровень: {level + bonusLevels} (+{bonusLevels})</span>}
        <span className="equipment-cost" title="Золото">{item.craft_price.cost}<EquipmentImage src={resourceImage('Gols')} alt="Золото" /></span>
        {item.craft_price.components.map((material, index) => <span className="equipment-cost" title={material} key={material}>
          {item.craft_price.components_amount[index]}<EquipmentImage src={resourceImage(material)} alt={material} />
        </span>)}
      </div>
    </header>
    <div className="equipment-details-body">
      <dl className="equipment-attributes">{Object.entries(attributes).map(([name, value]) => {
        const definition = equipmentAttributes[name]
        const bonus = value - (baseAttributes[name] ?? 0)
        const unit = definition?.percent ? '%' : ''
        return <div key={name}>
          <dt>{definition && <img src={uiAsset(`stats_icon/hero_stats/${definition.icon}.png`)} alt="" />}{definition?.label ?? name}:</dt>
          <dd><EquipmentSignedValue value={value} unit={unit} lowerIsBetter={definition?.lowerIsBetter} />
            {bonus !== 0 && <> <span className={`equipment-${modifierTone(bonus, definition?.lowerIsBetter)}`}>(<EquipmentSignedValue value={bonus} unit={unit} lowerIsBetter={definition?.lowerIsBetter} />)</span></>}
          </dd>
        </div>
      })}</dl>
      {item.item_abilities.map((ability, index) => <EquipmentAbilityCard key={`${ability.ability_image}-${index}`}
        ability={ability} item={item} values={values} />)}
      <details className="equipment-lore"><summary>История предмета</summary><p>{item.game_description}</p></details>
    </div>
    <footer className="equipment-details-actions">
      {inspection.slot !== null ? <>
        <span>Экипирован в слот {inspection.slot + 1}</span>
        <button type="button" onClick={onRemove}>Снять предмет</button>
      </> : <>
        <span>Экипировать в слот:</span>
        {[0, 1, 2].map((slot) => <button type="button" key={slot} onClick={() => onEquip(slot)}
          disabled={!canEquipItem(equipmentById, slots, item.id, slot)}
          aria-label={`Экипировать ${item.name} в слот ${slot + 1}`}
          title={!canEquipItem(equipmentById, slots, item.id, slot) ? 'Предмет этой группы уже надет в другом слоте' : slots[slot] ? `Заменить: ${equipmentById.get(slots[slot]!.itemId)?.name}` : 'Пустой слот'}>{slot + 1}</button>)}
      </>}
    </footer>
  </div>, document.body)
}
