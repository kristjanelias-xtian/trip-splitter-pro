// SPDX-License-Identifier: Apache-2.0

/**
 * Per-participant chip color palette for expense split pickers.
 * Cycles through 8 colors via index % 8.
 */
export const PARTICIPANT_CHIP_COLORS = [
  { chip: 'bg-blue-500 text-white border-blue-500', avatar: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { chip: 'bg-emerald-500 text-white border-emerald-500', avatar: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { chip: 'bg-violet-500 text-white border-violet-500', avatar: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  { chip: 'bg-amber-500 text-white border-amber-500', avatar: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { chip: 'bg-rose-500 text-white border-rose-500', avatar: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  { chip: 'bg-cyan-500 text-white border-cyan-500', avatar: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' },
  { chip: 'bg-fuchsia-500 text-white border-fuchsia-500', avatar: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300' },
  { chip: 'bg-teal-500 text-white border-teal-500', avatar: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
] as const

export function getParticipantColor(index: number) {
  return PARTICIPANT_CHIP_COLORS[index % PARTICIPANT_CHIP_COLORS.length]
}
