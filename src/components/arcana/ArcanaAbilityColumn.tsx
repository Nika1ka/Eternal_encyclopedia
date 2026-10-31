import type { Character } from '../../types/character'
import { SkillSlot } from '../heroes/HeroDisplay'
import { characterAsset, uiAsset } from '../../utils/characterAssets'
import { nextSkillVariant, orderedSkills, skillVariant } from '../../utils/skillVariants'

export function ArcanaAbilityColumn({ hero, level, choosing = false, selectedAbility, onSelect, variants = {}, onVariant, eligibleIds }: {
  hero: Character; level: number; choosing?: boolean; selectedAbility?: string; onSelect: (id: string) => void
  variants?: Record<string, number>; onVariant?: (id: string, variant: number) => void; eligibleIds?: ReadonlySet<string>
}) {
  return <div className="arcana-skill-column" role="group" aria-label={choosing ? 'Выберите способность для Аркана' : 'Способности героя'}>
    {orderedSkills(hero.skills).map((skill, index) => choosing ? <div key={skill.skill_image} className="arc-slot">
      <img className="slot-frame" src={uiAsset('additional_icons/skill_frame.png')} alt="" />
      <button type="button" className="skill-choice" aria-label={skill.name} aria-pressed={selectedAbility === skill.skill_image}
        disabled={eligibleIds ? !eligibleIds.has(skill.skill_image) : false}
        title={eligibleIds && !eligibleIds.has(skill.skill_image) ? 'Нет нужного ненулевого атрибута' : skill.name} onClick={() => onSelect(skill.skill_image)}>
        <img src={characterAsset(skillVariant(skill, variants[skill.skill_image] ?? 0).folder, skillVariant(skill, variants[skill.skill_image] ?? 0).image)} alt="" />
      </button>
      {!!skill.additional_effects?.length && ([-1, 1] as const).map((direction) => <button key={direction} type="button"
        className={`slot-flourish slot-flourish-${direction === -1 ? 'left' : 'right'}`}
        aria-label={`${direction === -1 ? 'Предыдущий' : 'Следующий'} вариант: ${skill.name}`}
        onClick={() => onVariant?.(skill.skill_image, nextSkillVariant(skill, variants[skill.skill_image] ?? 0, direction))}>
        <img src={uiAsset('additional_icons/change_skill_button.png')} alt="" />
      </button>)}
    </div> : <SkillSlot key={skill.skill_image} skill={skill} index={index} level={level} selectedVariant={variants[skill.skill_image] ?? 0} onVariant={(variant) => onVariant?.(skill.skill_image, variant)} />)}
  </div>
}
