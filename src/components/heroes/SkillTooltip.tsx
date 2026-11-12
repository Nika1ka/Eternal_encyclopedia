import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { HeroEffect, Skill } from '../../types/character'
import { EquipmentAbilityCard } from '../equipment/EquipmentAbilityCard'
import { equipmentById } from '../../utils/equipmentData'
import { equipmentAtLevel } from '../../engine/equipmentModifiers'
import type { SpellModifiers } from '../../utils/skillLevels'
import { EnemySkillTooltipCard, SkillTooltipCard } from './SkillTooltipCard'
import type { EnemySkill } from '../../types/enemy'
import { ArcanaEffectCard } from '../arcana/ArcanaEffectCard'

export interface TooltipContent {
  id: string
  title: string
  description: string
  image?: string
  parameters?: { label: string; value: string }[]
  skill?: { base: Skill; variantIndex: number }
  enemySkill?: EnemySkill
  equipment?: HeroEffect['equipment']
  arcana?: HeroEffect['arcana']
}
interface ActiveTooltip extends TooltipContent { anchor: DOMRect; pinned: boolean }
export interface TooltipControls {
  activeTooltip: ActiveTooltip | null
  show: (content: TooltipContent, anchor: HTMLElement, pin?: boolean) => void
  hide: () => void
  update: (content: TooltipContent) => void
}

const TooltipContext = createContext<TooltipControls | null>(null)

export function TooltipTrigger({ content, children, className = '' }: {
  content: TooltipContent; children: ReactNode; className?: string
}) {
  const tooltip = useContext(TooltipContext)
  const update = tooltip?.update
  useLayoutEffect(() => { update?.(content) }, [content, update])
  if (!tooltip) throw new Error('TooltipTrigger requires HeroTooltipScope')
  const open = tooltip.activeTooltip?.id === content.id
  return <button type="button" className={className} data-tooltip-trigger
    aria-label={content.title} aria-describedby={open && !content.skill ? 'hero-tooltip' : undefined}
    aria-haspopup={content.skill ? 'dialog' : undefined}
    aria-expanded={content.skill ? open : undefined} aria-controls={open && content.skill ? 'hero-tooltip' : undefined}
    onKeyDown={(event) => {
      if (open && content.skill && event.key === 'ArrowDown') {
        event.preventDefault()
        document.querySelector<HTMLButtonElement>('#hero-tooltip button')?.focus()
      }
    }}
    onMouseEnter={(event) => tooltip.show(content, event.currentTarget)} onMouseLeave={tooltip.hide}
    onFocus={(event) => tooltip.show(content, event.currentTarget)} onBlur={tooltip.hide}
    onClick={(event) => tooltip.show(content, event.currentTarget, true)}>{children}</button>
}

export function SkillTooltip({ active, onEnter, onLeave, level, onLevelChange, modifiers }: {
  active: ActiveTooltip | null; onEnter: () => void; onLeave: () => void
  level: number; onLevelChange: (level: number) => void
  modifiers?: SpellModifiers
}) {
  const element = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!active || !element.current) return
    const tip = element.current
    const { anchor } = active
    const width = tip.offsetWidth
    const height = tip.offsetHeight
    const right = anchor.right + 40
    const left = right + width <= window.innerWidth - 12 ? right : anchor.left - width - 40
    tip.style.left = `${Math.max(12, Math.min(left, window.innerWidth - width - 12))}px`
    tip.style.top = `${Math.max(12, Math.min(anchor.top, window.innerHeight - height - 12))}px`
  }, [active, level, modifiers])
  if (!active) return null
  const item = active.equipment && equipmentById.get(active.equipment.itemId)
  const ability = item && active.equipment && item.item_abilities[active.equipment.abilityIndex]
  return createPortal(<div ref={element} id="hero-tooltip" role={active.skill ? 'dialog' : 'tooltip'}
    aria-labelledby={active.skill ? 'skill-card-title' : undefined}
    className={`skill-tooltip ${active.skill || active.enemySkill ? 'skill-tooltip-rich' : ''} ${ability || active.arcana ? 'equipment-effect-tooltip' : ''}`}
    onMouseEnter={onEnter} onMouseLeave={onLeave} onFocusCapture={onEnter}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onLeave() }}>
    {active.skill ? <SkillTooltipCard parameterDecimals={1} base={active.skill.base} variantIndex={active.skill.variantIndex}
      level={level} onLevelChange={onLevelChange} modifiers={modifiers} /> : active.enemySkill ?
      <EnemySkillTooltipCard skill={active.enemySkill} image={active.image} /> : item && ability && active.equipment ?
      <EquipmentAbilityCard item={item} ability={ability} values={equipmentAtLevel(item, active.equipment.level).values} /> : active.arcana ?
      <ArcanaEffectCard title={active.title} image={active.image} description={active.description} /> : <>
    {active.image && <img className="tooltip-image" src={active.image} alt="" />}
    <strong className="tooltip-title">{active.title}</strong><p>{active.description}</p>
    {!!active.parameters?.length && <dl>{active.parameters.map(({ label, value }) =>
      <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    </>}
  </div>, document.body)
}

// A single owner prevents stale tooltips when the selected hero changes.
export function HeroTooltipScope({ children, heroId, level, onLevelChange, modifiers }: {
  children: ReactNode; heroId: number; level: number; onLevelChange: (level: number) => void
  modifiers?: SpellModifiers
}) {
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null)
  const [previousHeroId, setPreviousHeroId] = useState(heroId)
  if (previousHeroId !== heroId) {
    setPreviousHeroId(heroId)
    setActiveTooltip(null)
  }
  const update = useCallback((content: TooltipContent) => {
    setActiveTooltip((current) => {
      if (!current || current.id !== content.id) return current
      if (current.title === content.title && current.description === content.description && current.image === content.image &&
        current.arcana?.level === content.arcana?.level &&
        current.enemySkill === content.enemySkill &&
        JSON.stringify(current.equipment) === JSON.stringify(content.equipment) &&
        JSON.stringify(current.parameters) === JSON.stringify(content.parameters) &&
        current.skill?.base === content.skill?.base && current.skill?.variantIndex === content.skill?.variantIndex) return current
      return { ...current, ...content }
    })
  }, [])
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const trigger = useRef<HTMLElement | null>(null)
  const cancelClose = () => clearTimeout(closeTimer.current)
  const hide = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => {
      if (document.getElementById('hero-tooltip')?.contains(document.activeElement)) return
      setActiveTooltip((current) => current?.pinned ? current : null)
    }, 240)
  }
  useEffect(() => {
    const dismiss = () => setActiveTooltip(null)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (document.getElementById('hero-tooltip')?.contains(document.activeElement)) trigger.current?.focus()
        dismiss()
      }
    }
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest('[data-tooltip-trigger], .slot-flourish, #hero-tooltip')) dismiss()
    }
    const onScroll = (event: Event) => {
      if (!(event.target instanceof Element && event.target.closest('#hero-tooltip'))) dismiss()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('resize', dismiss)
    window.addEventListener('hashchange', dismiss)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      clearTimeout(closeTimer.current)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('resize', dismiss)
      window.removeEventListener('hashchange', dismiss)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [])
  const show: TooltipControls['show'] = (content, anchor, pin = false) => {
    cancelClose()
    trigger.current = anchor
    const rect = anchor.getBoundingClientRect()
    setActiveTooltip((current) => {
      if (pin && current?.id === content.id && current.pinned) return null
      if (!pin && current?.id === content.id) return current
      return { ...content, anchor: rect, pinned: pin }
    })
  }
  return <>
    <TooltipContext value={{ activeTooltip, show, hide, update }}>{children}</TooltipContext>
    <SkillTooltip active={activeTooltip} onEnter={cancelClose} onLeave={hide} level={level} onLevelChange={onLevelChange} modifiers={modifiers} />
  </>
}
