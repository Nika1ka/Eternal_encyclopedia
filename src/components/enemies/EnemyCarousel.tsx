import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Enemy } from '../../types/enemy'
import { uiAsset } from '../../utils/characterAssets'
import { enemyImage, enemyPresentation } from '../../utils/enemyAssets'
import { nextEnemyId } from '../../utils/enemyData'
import { EnemySkillsArc } from './EnemySkillsArc'

function EnemyModel({ enemy }: { enemy: Enemy }) {
  const [failed, setFailed] = useState(false)
  return <div className="enemy-model" style={enemyPresentation[enemy.id]}>
    {enemyImage(enemy) && !failed ? <img src={enemyImage(enemy)} alt={enemy.name} onError={() => setFailed(true)} /> :
      <p className="enemy-image-fallback">Изображение недоступно</p>}
  </div>
}

export function EnemyCarousel({ enemy, enemies, onSelect }: {
  enemy: Enemy; enemies: readonly Enemy[]; onSelect: (id: number) => void
}) {
  const [transition, setTransition] = useState<{ previous: Enemy; direction: -1 | 1 } | null>(null)
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const alive = useRef(true)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const previousId = nextEnemyId(enemies, enemy.id, -1)
  const nextId = nextEnemyId(enemies, enemy.id, 1)
  const previousSrc = enemyImage(enemies.find((entry) => entry.id === previousId) ?? enemy)
  const nextSrc = enemyImage(enemies.find((entry) => entry.id === nextId) ?? enemy)
  useEffect(() => {
    for (const src of new Set([previousSrc, nextSrc])) if (src) { const image = new Image(); image.src = src }
  }, [previousSrc, nextSrc])
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; clearTimeout(timer.current) }
  }, [])
  const handleMove = async (direction: -1 | 1) => {
    if (locked.current || enemies.length < 2) return
    locked.current = true
    setBusy(true)
    const target = enemies.find((entry) => entry.id === nextEnemyId(enemies, enemy.id, direction))!
    const src = enemyImage(target)
    if (src) {
      const image = new Image()
      image.src = src
      await image.decode().catch(() => undefined)
    }
    if (!alive.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduced) setTransition({ previous: enemy, direction })
    onSelect(target.id)
    const finish = () => { setTransition(null); setBusy(false); locked.current = false }
    if (reduced) finish()
    else timer.current = setTimeout(finish, 400)
  }
  return <section className="enemy-display" aria-label={`Противник: ${enemy.name}`} tabIndex={0}
    aria-busy={busy} style={{ '--slide-direction': transition?.direction ?? 1 } as CSSProperties}
    onKeyDown={(event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        void handleMove(event.key === 'ArrowLeft' ? -1 : 1)
      }
    }}>
    <div className="enemy-model-viewport">
      {transition && <div className="enemy-model-layer enemy-leaving" aria-hidden="true"><EnemyModel enemy={transition.previous} /></div>}
      <div key={enemy.id} className={`enemy-model-layer ${transition ? 'enemy-entering' : ''}`}><EnemyModel enemy={enemy} /></div>
    </div>
    <EnemySkillsArc enemy={enemy} />
    {enemies.length > 1 && <>
      <button type="button" className="enemy-arrow enemy-arrow-left" aria-label="Предыдущий противник"
        aria-disabled={busy} onClick={() => void handleMove(-1)}>
        <img src={uiAsset('additional_icons/change_skill_button.png')} alt="" />
      </button>
      <button type="button" className="enemy-arrow enemy-arrow-right" aria-label="Следующий противник"
        aria-disabled={busy} onClick={() => void handleMove(1)}>
        <img src={uiAsset('additional_icons/change_skill_button.png')} alt="" />
      </button>
    </>}
  </section>
}
