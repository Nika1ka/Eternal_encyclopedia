export type DescriptionPart =
  | { kind: 'text'; text: string }
  | { kind: 'value'; value: number; unit: string; bonus: number }

/** Keep text as React text nodes, and annotate values without injecting HTML. */
export function descriptionParts(info: string, values: readonly number[], baseValues = values): DescriptionPart[] {
  const parts: DescriptionPart[] = []
  const pattern = /\$\{value(\d+)\}(%?)|(-?\d+(?:[.,]\d+)?)(%?)/g
  let offset = 0
  for (const match of info.matchAll(pattern)) {
    const start = match.index
    if (start > offset) parts.push({ kind: 'text', text: info.slice(offset, start) })
    const index = match[1] ? Number(match[1]) - 1 : undefined
    const value = index === undefined ? Number(match[3].replace(',', '.')) : values[index]
    if (value === undefined) parts.push({ kind: 'text', text: match[0] })
    else parts.push({ kind: 'value', value, unit: match[2] || match[4] || '',
      bonus: index === undefined ? 0 : Number((value - (baseValues[index] ?? value)).toFixed(6)) })
    offset = start + match[0].length
  }
  if (offset < info.length) parts.push({ kind: 'text', text: info.slice(offset) })
  return parts
}
