import { useState } from 'react'
import type { Character, Skill } from '../../types/character'
import type { EquipmentSlots } from '../../types/equipment'
import { EquipmentSlot } from '../equipment/EquipmentSlot'
import type { EquipmentSlotActions } from '../equipment/EquipmentSlot'
import { characterAsset, heroName, uiAsset } from '../../utils/characterAssets'
import { nextSkillVariant, orderedSkills, skillVariant } from '../../utils/skillVariants'
import { skillAtLevel } from '../../utils/skillLevels'
import { TooltipTrigger } from './SkillTooltip'
import { CrossfadeImage } from './CrossfadeImage'

function SlotFrame() {
  return <img className="slot-frame" src={uiAsset('additional_icons/skill_frame.png')} alt="" aria-hidden="true" />
}
export function HeroEquipmentArc({ equipment, actions }: { equipment: EquipmentSlots; actions: EquipmentSlotActions }) {
  return <div className="equipment-arc" role="group" aria-label="Экипировка героя">
    <img className="skill-arc skill-arc-left" src={uiAsset('additional_icons/skill_arc.png')} alt="" />
    {equipment.map((instance, index) => <EquipmentSlot key={index} instance={instance} index={index} actions={actions} />)}
  </div>
}
export function SkillSlot({ skill: baseSkill, index, level, selectedVariant, onVariant }: { skill: Skill; index: number; level: number; selectedVariant?: number; onVariant?: (variant: number) => void }) {
  const [selection, setSelection] = useState({ skillId: baseSkill.skill_image, variantIndex: 0 })
  if (selection.skillId !== baseSkill.skill_image) {
    setSelection({ skillId: baseSkill.skill_image, variantIndex: 0 })
  }
  const variantIndex = selectedVariant ?? (selection.skillId === baseSkill.skill_image ? selection.variantIndex : 0)
  const skill = skillAtLevel(baseSkill, level)
  const variant = skillVariant(skill, variantIndex)
  const hasVariants = !!skill.additional_effects?.length
  return <div className={`arc-slot skill-slot skill-slot-${index}`}>
    <SlotFrame />
    <TooltipTrigger className="skill-button"
      content={{ id: skill.skill_image, title: skill.name, description: variant.description, skill: { base: baseSkill, variantIndex } }}>
      <CrossfadeImage src={characterAsset(variant.folder, variant.image)} />
    </TooltipTrigger>
    {hasVariants && <>
      {([-1, 1] as const).map((direction) => <button key={direction} type="button"
        className={`slot-flourish slot-flourish-${direction === -1 ? 'left' : 'right'}`}
        aria-label={`${direction === -1 ? 'Предыдущий' : 'Следующий'} вариант: ${skill.name}`}
        title={skillVariant(skill, nextSkillVariant(skill, variantIndex, direction)).name}
        onClick={() => { const next = nextSkillVariant(skill, variantIndex, direction); if (onVariant) onVariant(next); else setSelection((current) => ({ ...current, variantIndex: next })) }}>
        <img src={uiAsset('additional_icons/change_skill_button.png')} alt="" />
      </button>)}
      <span className="sr-only" aria-live="polite">{skill.name}: {variant.name}</span>
    </>}
  </div>
}

export function HeroSkillsArc({ hero, level, variants = {}, onVariant }: { hero: Character; level: number; variants?: Record<string, number>; onVariant?: (id: string, variant: number) => void }) {
  return <div className="skills-arc" role="group" aria-label="Способности героя">
    <img className="skill-arc skill-arc-right" src={uiAsset('additional_icons/skill_arc.png')} alt="" />
    {orderedSkills(hero.skills).map((skill, index) => <SkillSlot key={index} skill={skill} index={index} level={level} selectedVariant={variants[skill.skill_image]} onVariant={onVariant ? (variant) => onVariant(skill.skill_image, variant) : undefined} />)}
  </div>
}
export function HeroDisplay({ hero, equipment, level, equipmentActions, variants, onVariant }: {
  hero: Character; equipment: EquipmentSlots; level: number; equipmentActions: EquipmentSlotActions
  variants?: Record<string, number>; onVariant?: (id: string, variant: number) => void
}) {
  return <section className="hero-display" aria-label={`Персонаж: ${heroName(hero)}`}>
    <CrossfadeImage className="hero-model" src={characterAsset('Models', hero.model_name)}
      alt={heroName(hero)} priority />
    <HeroEquipmentArc equipment={equipment} actions={equipmentActions} />
    <HeroSkillsArc hero={hero} level={level} variants={variants} onVariant={onVariant} />
  </section>
}
