import type { Skill } from '../../types/character'
import { SkillTooltipCard } from '../heroes/SkillTooltipCard'
import { uiAsset } from '../../utils/characterAssets'

export function ArcanaAbilityComparison({ skill, before, after, level, onLevel, onConfirm, onCancel, variant = 0, eligible = true }: {
  skill: Skill; before: Skill; after: Skill; level: number; onLevel: (level: number) => void; onConfirm: () => void; onCancel: () => void
  variant?: number; eligible?: boolean
}) {
  return <section className="arcana-comparison" aria-label="Выбор способности для Аркана">
    <h2>Улучшение способности</h2>
    {!eligible && <p role="status">У этой способности нет нужного ненулевого атрибута. Выберите другую способность.</p>}
    <div className="arcana-comparison-scroll">
      <span className="arcana-comparison-label">Сейчас</span>
      <div className="skill-tooltip-rich"><SkillTooltipCard base={skill} resolved={before} comparisonBase={before}
        variantIndex={variant} level={level} onLevelChange={onLevel} titleId="arcana-before-title" /></div>
      <img className="arcana-comparison-arrow" src={uiAsset('additional_icons/change_skill_button.png')} alt="" />
      <span className="arcana-comparison-label">После выбора</span>
      <div className="skill-tooltip-rich"><SkillTooltipCard base={skill} resolved={after} comparisonBase={before}
        variantIndex={variant} level={level} onLevelChange={onLevel} titleId="arcana-after-title" /></div>
    </div>
    <div className="arcana-comparison-actions">
      <button className="arcana-action" type="button" disabled={!eligible} onClick={onConfirm}>Подтвердить выбор</button>
      <button className="arcana-action" type="button" onClick={onCancel}>Отмена</button>
    </div>
  </section>
}
