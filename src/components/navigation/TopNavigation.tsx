import { uiAsset } from '../../utils/characterAssets'
import { sections } from '../../utils/navigation'

export function TopNavigation({ activePath = '/heroes' }: { activePath?: string }) {
  return <nav className="top-navigation" aria-label="Разделы энциклопедии">
    {sections.map((section) => <a key={section.path} href={`#${section.path}`} aria-label={section.label}
      title={section.label} aria-current={activePath === section.path ? 'page' : undefined}>
      <img src={uiAsset(`nav_menu_icons/${section.icon}`)} alt="" />
    </a>)}
  </nav>
}
