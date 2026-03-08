// SPDX-License-Identifier: Apache-2.0

/**
 * Per-participant avatar color palette for expense split pickers.
 * Cycles through 8 colors via index % 8.
 * Selected chips use a uniform slate background; only avatars are colorful.
 */
export const PARTICIPANT_CHIP_COLORS = [
  { avatar: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { avatar: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { avatar: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  { avatar: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { avatar: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  { avatar: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' },
  { avatar: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300' },
  { avatar: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
] as const

export function getParticipantColor(index: number) {
  return PARTICIPANT_CHIP_COLORS[index % PARTICIPANT_CHIP_COLORS.length]
}
