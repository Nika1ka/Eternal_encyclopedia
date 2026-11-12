export function getAdjacentSlots(index: number): number[] {
  if (!Number.isInteger(index) || index < 0 || index >= 12) return []
  const row = Math.floor(index / 4)
  const col = index % 4
  return [[row - 1, col], [row, col - 1], [row, col + 1], [row + 1, col]]
    .filter(([r, c]) => r >= 0 && r < 3 && c >= 0 && c < 4).map(([r, c]) => r * 4 + c)
}
