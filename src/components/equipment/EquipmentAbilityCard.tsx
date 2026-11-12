import type { EquipmentItem } from '../../types/equipment'
import { lowerIsBetterAbilityValues, modifierTone } from '../../utils/equipmentAttributes'
import { itemAbilityImage } from '../../utils/equipmentData'
import { formatNumber } from '../../utils/formatAttributes'
import { descriptionParts } from '../../utils/skillDescription'
import { EquipmentImage } from './EquipmentIcon'

export function EquipmentSignedValue({ value, unit = '', lowerIsBetter = false }: { value: number; unit?: string; lowerIsBetter?: boolean }) {
  return <strong className={`equipment-${modifierTone(value, lowerIsBetter)}`}>{value > 0 ? '+' : ''}{formatNumber(value)}{unit}</strong>
}

function AbilityDescription({ ability, item, values }: {
  ability: EquipmentItem['item_abilities'][number]; item: EquipmentItem; values: number[]
}) {
  return <p>{ability.info.split(/(\$\{value\d+\}%?)/g).map((text, index) => {
    const match = /^\$\{(value(\d+))\}(%?)$/.exec(text)
    if (!match) return <span key={index}>{descriptionParts(text, []).map((part, i) => part.kind === 'text'
      ? part.text : <strong className="equipment-number" key={i}>{formatNumber(part.value)}{part.unit}</strong>)}</span>
    const valueIndex = Number(match[2]) - 1
    const value = values[valueIndex]
    if (value === undefined) return <span key={index}>{text}</span>
    const bonus = Number((value - item.skill_values[valueIndex]).toFixed(6))
    const lowerIsBetter = lowerIsBetterAbilityValues[ability.ability_image]?.includes(match[1]) ?? false
    return <span key={index} className="equipment-value-group"><strong className="equipment-number">{formatNumber(value)}{match[3]}</strong>
      {bonus !== 0 && <> <span className={`equipment-${modifierTone(bonus, lowerIsBetter)}`}>(<EquipmentSignedValue value={bonus} unit={match[3]} lowerIsBetter={lowerIsBetter} />)</span></>}
    </span>
  })}</p>
}

export function EquipmentAbilityCard({ ability, item, values }: {
  ability: EquipmentItem['item_abilities'][number]; item: EquipmentItem; values: number[]
}) {
  return <section className="equipment-ability">
    <header><EquipmentImage src={itemAbilityImage(ability.ability_image)} /><h3>{ability.name}</h3></header>
    <AbilityDescription ability={ability} item={item} values={values} />
  </section>
}
