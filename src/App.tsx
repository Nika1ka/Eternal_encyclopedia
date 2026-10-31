import { useSyncExternalStore } from 'react'
import { TopNavigation } from './components/navigation/TopNavigation'
import { sections } from './utils/navigation'
import { HeroesPage } from './pages/HeroesPage'
import './styles/heroes.css'
import './styles/tooltips.css'
import './styles/equipment.css'
import './styles/enemies.css'
import './styles/arcana.css'
import './styles/transitions.css'

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

export default function App() {
  const route = useSyncExternalStore(subscribe, () => window.location.hash.slice(1) || '/heroes', () => '/heroes')
  const section = sections.find((item) => item.path === route)
  const sceneActive = ['/heroes', '/equipment', '/upgrades', '/enemies'].includes(route)
  const mode = route === '/enemies' ? 'enemies' : route === '/upgrades' ? 'upgrades' : route === '/equipment' ? 'equipment' : 'heroes'
  return <>
    <HeroesPage mode={mode} hidden={!sceneActive} />
    {!sceneActive && <main className="section-placeholder">
      <TopNavigation activePath={route} />
      <section>
        <h1>{section?.label ?? 'Страница не найдена'}</h1>
        <p>{section ? 'Этот раздел энциклопедии появится позже.' : 'Такого раздела пока нет.'}</p>
        <a href="#/heroes">Вернуться к героям</a>
      </section>
    </main>}
  </>
}
