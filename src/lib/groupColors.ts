const GROUP_BORDER_COLORS = [
  'border-l-blue-500',
  'border-l-emerald-500',
  'border-l-violet-500',
  'border-l-amber-500',
  'border-l-rose-500',
  'border-l-cyan-500',
]

export function getGroupBorderColor(index: number): string {
  return GROUP_BORDER_COLORS[index % GROUP_BORDER_COLORS.length]
}
