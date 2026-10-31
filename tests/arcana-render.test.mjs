import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

test('Tarot page, inspection and ability comparison render with real data', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { HeroesPage } = await server.ssrLoadModule('/src/pages/HeroesPage.tsx')
    const page = renderToString(createElement(HeroesPage, { mode: 'upgrades' }))
    assert.equal((page.match(/class="arcana-slot"/g) ?? []).length, 12)
    assert.equal((page.match(/class="arcana-category-button"/g) ?? []).length, 7)
    assert.match(page, /taro_cards_page_background.png/)
    assert.match(page, /aria-label="Способности героя"/)
    assert.match(page, /aria-current="page"[^>]*|aria-current="page"/)
    const { ArcanaDetails } = await server.ssrLoadModule('/src/components/arcana/ArcanaDetails.tsx')
    const { arcanaById } = await server.ssrLoadModule('/src/utils/arcanaData.ts')
    const noop = () => {}
    const { EnemySkillTooltipCard } = await server.ssrLoadModule('/src/components/heroes/SkillTooltipCard.tsx')
    const enemyCard = renderToString(createElement(EnemySkillTooltipCard, {
      skill: { name: 'Навык противника', info: 'Эффект длится 1.7592 секунды', damage: 0, range: 0, duration: 0, cooldown: 2.457 },
      image: '/enemy-skill.png',
    })).replaceAll('<!-- -->', '')
    assert.match(enemyCard, /class="skill-card-header"/)
    assert.match(enemyCard, /class="[^"]*\bskill-card-icon\b/)
    assert.match(enemyCard, /class="skill-value">1.75<\/strong>/)
    assert.match(enemyCard, /class="skill-value">2.45<\/strong>/)
    assert.doesNotMatch(enemyCard, /level-stars|<button|Урон:|Радиус действия|Длительность:|skill-card-parameters/)
    const populatedEnemyCard = renderToString(createElement(EnemySkillTooltipCard, {
      skill: { name: 'Навык', info: '', damage: 10, range: 20, duration: 3 },
    }))
    assert.match(populatedEnemyCard, /Урон:/)
    assert.match(populatedEnemyCard, /Радиус действия/)
    assert.match(populatedEnemyCard, /Длительность:/)
    const missingEnemyCard = renderToString(createElement(EnemySkillTooltipCard, {
      skill: { name: 'Навык', info: '' },
    }))
    assert.doesNotMatch(missingEnemyCard, /Урон:|Радиус действия|Длительность:|skill-card-parameters/)
    const details = renderToString(createElement(ArcanaDetails, {
      card: arcanaById.get(35), instance: { arcanaId: 35, level: 15 }, level: 15,
      bonuses: { attributes_bonus: { text: 'В конце каждой локации восстанавливает 170% здоровья герою' },
        arcanas_bonus: { title: 'Влияет на Дьявол', text: 'Бонусы соседних Арканов' },
        abilities_bonus: { title: 'Влияет на Поток эссенции', text: 'Урон способности' } },
      onLevel: noop, onPlace: noop, onClose: noop, onAbility: noop,
    }))
    assert.match(details, /Старший Аркан.*жадности/)
    assert.match(details.replaceAll('<!-- -->', ''), /<strong class="arcana-neutral">170%<\/strong>/)
    assert.match(details, /disabled="">Добавить уровень/)
    const boostedDetails = renderToString(createElement(ArcanaDetails, {
      card: arcanaById.get(7), instance: { arcanaId: 7, level: 15 }, level: 15, effectiveLevel: 20,
      bonuses: {}, onLevel: noop, onPlace: noop, onClose: noop, onAbility: noop,
    })).replaceAll('<!-- -->', '')
    assert.match(boostedDetails, /Уровень 20 \(15 \+ 5\)/)
    assert.match(boostedDetails, /disabled="">Добавить уровень/)
    assert.ok(details.indexOf('Уменьшить уровень') < details.indexOf('Добавить уровень'))
    assert.doesNotMatch(details, /Снять Аркан|Переместить|Установить в расклад/)
    assert.match(details, /<h3>Влияет на Дьявол<\/h3>/)
    assert.match(details, /<h3>Влияет на Поток эссенции<\/h3>/)
    const { ArcanaAbilityComparison } = await server.ssrLoadModule('/src/components/arcana/ArcanaAbilityComparison.tsx')
    const { heroes } = await server.ssrLoadModule('/src/utils/characterData.ts')
    const skill = heroes[0].skills[0]
    const { SkillTooltipCard } = await server.ssrLoadModule('/src/components/heroes/SkillTooltipCard.tsx')
    const fractionalSkill = { ...skill, info: 'Эффект ${value1}', skill_values: [1.7592],
      damage: 39.2625, cooldown: 2.457, range: 120.789, duration: 3.456 }
    const fractionalCard = (parameterDecimals) => renderToString(createElement(SkillTooltipCard, {
      base: fractionalSkill, resolved: fractionalSkill, variantIndex: 0, level: 1,
      onLevelChange: noop, parameterDecimals,
    })).replaceAll('<!-- -->', '')
    const heroTooltip = fractionalCard(1)
    for (const value of ['39.2', '2.4', '120.7', '3.45 сек.', '1.75']) {
      assert.ok(heroTooltip.includes(`class="skill-value">${value}</strong>`), value)
    }
    const comparisonTooltip = fractionalCard(undefined)
    for (const value of ['39.26', '2.45', '120.78']) {
      assert.ok(comparisonTooltip.includes(`class="skill-value">${value}</strong>`), value)
    }
    const boostedSkill = renderToString(createElement(SkillTooltipCard, {
      base: skill, variantIndex: 0, level: 5, onLevelChange: noop,
      modifiers: { skillLevelBonuses: { [skill.skill_image]: 1 } },
    })).replaceAll('<!-- -->', '')
    assert.match(boostedSkill, /Уровень 6 \(\+1\)/)
    const comparison = renderToString(createElement(ArcanaAbilityComparison, {
      skill, before: skill, after: skill, level: 1, onLevel: noop, onConfirm: noop, onCancel: noop,
    }))
    assert.match(comparison, /Подтвердить выбор/)
    assert.match(comparison, /id="arcana-before-title"/)
    assert.match(comparison, /id="arcana-after-title"/)
    assert.doesNotMatch(comparison, /arcana-variant-select|<select/)
    const { ArcanaAbilityColumn } = await server.ssrLoadModule('/src/components/arcana/ArcanaAbilityColumn.tsx')
    const ability = heroes[0].skills.find((entry) => entry.additional_effects?.length)
    const column = renderToString(createElement(ArcanaAbilityColumn, {
      hero: heroes[0], level: 1, choosing: true, selectedAbility: ability.skill_image,
      eligibleIds: new Set([ability.skill_image]), variants: { [ability.skill_image]: 1 }, onSelect: noop, onVariant: noop,
    }))
    assert.equal((column.match(/class="slot-flourish slot-flourish-left"/g) ?? []).length, 3)
    assert.equal((column.match(/class="slot-flourish slot-flourish-right"/g) ?? []).length, 3)
    assert.ok(column.includes(ability.additional_effects[0].skill_effect_image))
    assert.equal((column.match(/disabled=""/g) ?? []).length, 4)
    const heroesPage = renderToString(createElement(HeroesPage, { mode: 'heroes' }))
    const equipmentPage = renderToString(createElement(HeroesPage, { mode: 'equipment' }))
    assert.match(heroesPage, /hero-display/)
    assert.match(equipmentPage, /equipment-page/)
    assert.doesNotMatch(heroesPage, /class="arcana-slot"/)
    const enemiesPage = renderToString(createElement(HeroesPage, { mode: 'enemies' }))
    assert.equal((enemiesPage.match(/<main\b/g) ?? []).length, 1)
    assert.equal((enemiesPage.match(/class="top-navigation"/g) ?? []).length, 1)
    assert.match(enemiesPage, /heroes-page enemies-page/)
    assert.match(enemiesPage, /class="enemy-scene" data-active="true"/)
    assert.match(heroesPage, /class="enemy-scene" data-active="false"/)
    assert.match(enemiesPage, /class="scene-menu" data-active="true"[^>]*><nav class="location-selector"/)
  } finally {
    await server.close()
  }
})
