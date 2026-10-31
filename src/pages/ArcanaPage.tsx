import { useEffect, useState } from 'react'
import type { BaseAttributes, Character, HeroEffect } from '../types/character'
import type { ArcanaAction, ArcanaCategory, ArcanaSlots } from '../types/arcana'
import { ArcanaCategoryList } from '../components/arcana/ArcanaCategoryList'
import { ArcanaGrid } from '../components/arcana/ArcanaGrid'
import { ArcanaDetails } from '../components/arcana/ArcanaDetails'
import type { ArcanaBonusView } from '../components/arcana/ArcanaDetails'
import { ArcanaAbilityColumn } from '../components/arcana/ArcanaAbilityColumn'
import { ArcanaAbilityComparison } from '../components/arcana/ArcanaAbilityComparison'
import { HeroInfoPanel } from '../components/heroes/HeroInfoPanel'
import { arcanaById, bonusSections, categoryPresentation, needsAbility, needsRandomNeighbor } from '../utils/arcanaData'
import { canAssignArcanaAbility } from '../utils/arcanaAbilityEligibility'
import { useArcanaOutsideDrop } from '../hooks/useArcanaOutsideDrop'
import { abilityLabels, arcanaAttributeDefinitions, resolvedArcanaBonuses, calculateArcanaModifiers, uniqueDescription } from '../utils/arcanaCalculator'
import { reduceArcana, reconcileArcanaTargets } from '../store/arcanaStore'
import { skillAtLevel } from '../utils/skillLevels'
import type { SpellModifiers } from '../utils/skillLevels'
import { modifierTone } from '../utils/equipmentAttributes'
import type { CSSProperties } from 'react'

export function ArcanaPage({ hero, level, slots, attributes, effects, onLevel, onChange, getModifiers, variants = {}, onVariant, active = true, arcanaModifiers = calculateArcanaModifiers(slots) }: {
  hero: Character; level: number; slots: ArcanaSlots; attributes: BaseAttributes; effects: readonly HeroEffect[]
  onLevel: (level: number) => void; onChange: (slots: ArcanaSlots) => void; getModifiers: (slots: ArcanaSlots) => SpellModifiers
  variants?: Record<string, number>; onVariant?: (id: string, variant: number) => void; active?: boolean
  arcanaModifiers?: ReturnType<typeof calculateArcanaModifiers>
}) {
  const [category, setCategory] = useState<ArcanaCategory | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [previewLevel, setPreviewLevel] = useState(1)
  const [placement, setPlacement] = useState<number | null>(null)
  const [dragId, setDragId] = useState<number | null>(null)
  const [choice, setChoice] = useState<{ slot: number; abilityId: string } | null>(null)
  const [message, setMessage] = useState('')
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setSelectedId(null); setChoice(null); setPlacement(null); setDragId(null)
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [])
  const card = selectedId === null ? undefined : arcanaById.get(selectedId)
  const selectedSlot = slots.findIndex((entry) => entry?.arcanaId === selectedId)
  const instance = selectedSlot >= 0 ? slots[selectedSlot]! : undefined
  const cardLevel = instance?.level ?? previewLevel
  const effectiveLevel = selectedSlot >= 0 ? arcanaModifiers.levels[selectedSlot] : cardLevel
  const amplification = selectedSlot >= 0 ? arcanaModifiers.amplification[selectedSlot] : 0
  const targetSlot = instance?.randomTargetSlot
  const targetInstance = targetSlot !== undefined ? slots[targetSlot] : null
  const targetName = targetInstance ? arcanaById.get(targetInstance.arcanaId)?.name : undefined
  const targetDirection = targetSlot === undefined ? '' : targetSlot === selectedSlot - 4 ? 'сверху'
    : targetSlot === selectedSlot + 4 ? 'снизу' : targetSlot < selectedSlot ? 'слева' : 'справа'
  const inspect = (id: number) => { setSelectedId(id); setPreviewLevel(1); setChoice(null); setPlacement(null) }
  const concreteSkills = hero.skills.map((skill) => skillAtLevel(skill, level, { skillLevelBonuses: arcanaModifiers.skillLevelBonuses }))
  const firstEligible = (id: number) => concreteSkills.find((skill) => canAssignArcanaAbility(arcanaById.get(id)!, skill))?.skill_image ?? hero.skills[0].skill_image
  const commit = (action: ArcanaAction) => {
    const next = reduceArcana(slots, action, new Set(hero.skills.map((skill) => skill.skill_image)), concreteSkills)
    if (next === slots) return false
    // Randomness is resolved once per committed change and persisted with the build.
    onChange(reconcileArcanaTargets(next, Math.random))
    return true
  }
  useArcanaOutsideDrop(slots, dragId, (slot) => {
    commit({ type: 'remove', slot }); setDragId(null); setChoice(null); setPlacement(null)
    setMessage('Аркан снят с расклада')
  })
  const chooseAbility = (slot: number) => {
    setPlacement(null)
    setChoice({ slot, abilityId: slots[slot]?.selectedAbilityId ?? firstEligible(slots[slot]!.arcanaId) })
  }
  const place = (id: number, index: number) => {
    const source = slots.findIndex((entry) => entry?.arcanaId === id)
    const success = commit(source >= 0 ? { type: 'move', from: source, to: index } : { type: 'place', arcanaId: id, slot: index })
    if (!success) { setMessage('Эта ячейка занята. Выберите пустую ячейку.'); return }
    setPlacement(null); setSelectedId(id); setMessage('Карта размещена в ячейке ' + (index + 1))
    const placedCard = arcanaById.get(id)!
    if (source < 0 && needsAbility(placedCard)) setChoice({ slot: index, abilityId: firstEligible(id) })
  }
  const bonuses: Partial<Record<typeof bonusSections[number], ArcanaBonusView>> = {}
  if (card) {
    const values = resolvedArcanaBonuses(card, effectiveLevel, amplification, instance ? arcanaModifiers.efficiency : {})
    for (const key of bonusSections) {
      const bonus = card[key]
      if (!bonus) continue
      const value = values[key]!
      if (bonus.bonus_type === 'unique') bonuses[key] = { text: uniqueDescription(bonus, value) }
      else {
        const definition = arcanaAttributeDefinitions[bonus.attribute_name]
        bonuses[key] = { text: (key === 'arcanas_bonus' ? needsRandomNeighbor(card) ? 'Бонусы одного из Аркан' : 'Бонусы соседних Арканов' : key === 'abilities_bonus' ? abilityLabels[bonus.attribute_name] : definition?.label ?? bonus.attribute_name),
          value, unit: key !== 'attributes_bonus' || definition?.percent ? '%' : '', tone: modifierTone(value, bonus.attribute_name === 'Spell_cooldown') }
      }
      if (key === 'arcanas_bonus' && needsRandomNeighbor(card)) bonuses[key]!.title = targetSlot !== undefined
        ? targetName ? `Влияет на ${targetName}` : `Влияет на аркан ${targetDirection}` : 'Влияет на один случайный соседний аркан'
      if (key === 'arcanas_bonus' && card.id === 37) bonuses[key]!.title = targetSlot === undefined
        ? 'Влияет на один случайный слот расклада' : targetName ? `Влияет на ${targetName}` : `Влияет на ячейку ${targetSlot + 1}`
      if (key === 'abilities_bonus' && needsAbility(card)) bonuses[key]!.title = instance?.selectedAbilityId
        ? `Влияет на ${hero.skills.find((skill) => skill.skill_image === instance.selectedAbilityId)?.name}` : 'Влияет на одну способность на выбор'
    }
  }
  const selectedSkill = choice ? hero.skills.find((skill) => skill.skill_image === choice.abilityId) : undefined
  const choiceCard = choice && slots[choice.slot] ? arcanaById.get(slots[choice.slot]!.arcanaId) : undefined
  const eligibleIds = new Set(concreteSkills.filter((skill) => choiceCard && canAssignArcanaAbility(choiceCard, skill)).map((skill) => skill.skill_image))
  const candidate = choice ? reduceArcana(slots, { type: 'ability', slot: choice.slot, abilityId: choice.abilityId }, new Set(hero.skills.map((skill) => skill.skill_image)), concreteSkills) : slots
  return <div className="arcana-content" style={{ '--arcana-color': card ? categoryPresentation[card.category].color : '#66852b' } as CSSProperties}>
    <div className="scene-menu" data-active={active} inert={!active} aria-hidden={!active}>
      <ArcanaCategoryList category={category} onCategory={setCategory} selectedId={selectedId} onInspect={inspect} slots={slots} onDrag={setDragId} />
    </div>
    {active && <>
    {choice && selectedSkill ? <ArcanaAbilityComparison key={selectedSkill.skill_image} skill={selectedSkill}
      before={skillAtLevel(selectedSkill, level, getModifiers(slots))} after={skillAtLevel(selectedSkill, level, getModifiers(candidate))}
      level={level} onLevel={onLevel} variant={variants[selectedSkill.skill_image] ?? 0} eligible={eligibleIds.has(selectedSkill.skill_image)}
      onConfirm={() => { if (commit({ type: 'ability', slot: choice.slot, abilityId: choice.abilityId })) setChoice(null) }}
      onCancel={() => setChoice(null)} /> : <ArcanaGrid slots={slots} selectedId={selectedId} placement={placement} dragId={dragId}
        onDrag={setDragId} onInspect={inspect} onPlace={place} onCancel={() => setPlacement(null)} />}
    <ArcanaAbilityColumn hero={hero} level={level} choosing={!!choice} selectedAbility={choice?.abilityId}
      variants={variants} eligibleIds={eligibleIds} onVariant={(id, variant) => {
        onVariant?.(id, variant)
        if (eligibleIds.has(id)) setChoice((current) => current ? { ...current, abilityId: id } : null)
      }}
      onSelect={(id) => setChoice((current) => current ? { ...current, abilityId: id } : null)} />
    {card ? <ArcanaDetails card={card} instance={instance} level={cardLevel} effectiveLevel={effectiveLevel} bonuses={bonuses} amplification={amplification}
      targetName={targetName}
      onLevel={(next) => { if (instance) commit({ type: 'level', slot: selectedSlot, level: next }); else setPreviewLevel(next) }}
      onPlace={() => { setPlacement(card.id); setChoice(null) }}
      onClose={() => { setSelectedId(null); setChoice(null); setPlacement(null) }} onAbility={() => chooseAbility(selectedSlot)} /> :
      <HeroInfoPanel hero={hero} level={level} attributes={attributes} effects={effects} onLevelChange={onLevel} />}
    <span className="sr-only" role="status">{message}</span>
    </>}
  </div>
}
