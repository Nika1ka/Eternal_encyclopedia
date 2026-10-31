import type { Enemy } from '../../types/enemy'
import { uiAsset } from '../../utils/characterAssets'
import { enemySkillImage } from '../../utils/enemyAssets'
import { getEnemySkills, skillArcPositions } from '../../utils/enemyData'
import { TooltipTrigger } from '../heroes/SkillTooltip'

export function EnemySkillsArc({ enemy }: { enemy: Enemy }) {
  const skills = getEnemySkills(enemy)
  if (!skills.length) return null
  const positions = skillArcPositions(skills.length)
  return <div className="enemy-skills" data-dense={skills.length > 5} role="group" aria-label="Способности противника">
    <img className="enemy-skill-arc" src={uiAsset('additional_icons/skill_arc.png')} alt="" />
    {skills.map((skill, index) => <div className="arc-slot enemy-skill-slot" key={`${enemy.id}-${index}`} style={positions[index]}>
      <img className="slot-frame" src={uiAsset('additional_icons/skill_frame.png')} alt="" />
      <TooltipTrigger className="skill-button" content={{ id: `enemy-${enemy.id}-skill-${index}`, title: skill.name,
        description: skill.info, image: enemySkillImage(enemy, skill), enemySkill: skill }}>
        {skill.skill_image ? <img src={enemySkillImage(enemy, skill)} alt={skill.name} /> : <span>?</span>}
      </TooltipTrigger>
    </div>)}
  </div>
}
