import type { Skill } from '../../types/character'
import type { ReactNode } from 'react'
import type { EnemySkill } from '../../types/enemy'
import { descriptionParts } from '../../utils/skillDescription'
import { formatNumber } from '../../utils/formatAttributes'
import { skillAtLevel } from '../../utils/skillLevels'
import type { SpellModifiers } from '../../utils/skillLevels'
import { skillVariant } from '../../utils/skillVariants'
import { characterAsset, uiAsset } from '../../utils/characterAssets'
import { LevelStars } from './LevelStars'
import { CrossfadeImage } from './CrossfadeImage'

function SkillValue({ value, base = value, unit = '', lowerIsBetter = false, decimals = 2 }: { value: number; base?: number; unit?: string; lowerIsBetter?: boolean; decimals?: 1 | 2 }) {
  const bonus = Number((value - base).toFixed(6))
  return <span className="skill-value-group"><strong className="skill-value">{formatNumber(value, decimals)}{unit}</strong>
    {bonus !== 0 && <> <strong className={`skill-bonus ${(lowerIsBetter ? bonus > 0 : bonus < 0) ? 'skill-bonus-negative' : ''}`}>({bonus > 0 ? '+' : ''}{formatNumber(bonus, decimals)}{unit})</strong></>}
  </span>
}

function SkillDescription({ info, values, baseValues = values }: {
  info: string; values: readonly number[]; baseValues?: readonly number[]
}) {
  return <p className="skill-card-description">{descriptionParts(info, values, baseValues).map((part, index) =>
    part.kind === 'text' ? <span key={index}>{part.text}</span> :
      <SkillValue key={index} value={part.value} base={part.value - part.bonus} unit={part.unit} />)}</p>
}

export function SkillTooltipCard({ base, variantIndex, level, onLevelChange, modifiers, resolved, comparisonBase = base, titleId = 'skill-card-title', parameterDecimals = 2 }: {
  base: Skill; variantIndex: number; level: number; onLevelChange: (level: number) => void
  modifiers?: SpellModifiers
  resolved?: Skill; comparisonBase?: Skill; titleId?: string; parameterDecimals?: 1 | 2
}) {
  const skill = resolved ?? skillAtLevel(base, level, modifiers)
  const variant = skillVariant(skill, variantIndex)
  const effect = variantIndex > 0 ? skill.additional_effects?.[variantIndex - 1] : undefined
  return <SkillCardContent parameterDecimals={parameterDecimals} skill={skill} comparisonBase={comparisonBase} title={base.name} titleId={titleId}
    image={characterAsset(variant.folder, variant.image)} levelControl={<><LevelStars level={level} onChange={onLevelChange} />
      {(skill.effective_level ?? level) > level && <span>Уровень {skill.effective_level} (+{skill.effective_level! - level})</span>}</>}
    effect={effect} effectBaseValues={comparisonBase.additional_effects?.[variantIndex - 1]?.effects_values} />
}

type DisplaySkill = Pick<Skill, 'info' | 'skill_values' | 'cooldown' | 'range' | 'damage' | 'duration'>

export function EnemySkillTooltipCard({ skill, image }: { skill: EnemySkill; image?: string }) {
  const display = { ...skill, skill_values: [] }
  return <SkillCardContent skill={display} comparisonBase={display} title={skill.name} titleId="enemy-skill-card-title" image={image} />
}

function SkillCardContent({ skill, comparisonBase, title, titleId, image, levelControl, effect, effectBaseValues, parameterDecimals = 2 }: {
  skill: DisplaySkill; comparisonBase: DisplaySkill; title: string; titleId: string
  effectBaseValues?: readonly number[]; parameterDecimals?: 1 | 2
  image?: string; levelControl?: ReactNode; effect?: NonNullable<Skill['additional_effects']>[number]
}) {
  const hasValue = (value: number | undefined): value is number => value !== undefined && value !== 0
  return <>
    <header className="skill-card-header">
      {image && <CrossfadeImage className="skill-card-icon" src={image} />}
      <h2 id={titleId}>{title}</h2>
      <div className="skill-card-meta">
        {levelControl}
        {skill.cooldown !== undefined && <span className="skill-card-stat" title="Перезарядка" aria-label="Перезарядка">
          <SkillValue decimals={parameterDecimals} value={skill.cooldown} base={comparisonBase.cooldown} lowerIsBetter />
          <img src={uiAsset('stats_icon/cd_icon.png')} alt="сек." />
        </span>}
        {hasValue(skill.range) && <span className="skill-card-stat" title="Радиус действия" aria-label="Радиус действия">
          <SkillValue decimals={parameterDecimals} value={skill.range} base={comparisonBase.range} />
          <img src={uiAsset('stats_icon/range_icon.png')} alt="Радиус" />
        </span>}
      </div>
    </header>
    <SkillDescription info={skill.info} values={skill.skill_values} baseValues={comparisonBase.skill_values} />
    {(hasValue(skill.damage) || hasValue(skill.duration)) && <div className="skill-card-parameters">
      {hasValue(skill.damage) && <div>Урон: <SkillValue decimals={parameterDecimals} value={skill.damage} base={comparisonBase.damage} /></div>}
      {hasValue(skill.duration) && <div>Длительность: <SkillValue value={skill.duration} base={comparisonBase.duration} unit=" сек." /></div>}
    </div>}
    {effect && <section className="skill-card-effect" aria-label={effect.name}>
      <h3>{effect.name}</h3>
      <SkillDescription info={effect.info} values={effect.effects_values} baseValues={effectBaseValues} />
    </section>}
  </>
}
