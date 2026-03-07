import type { Participant } from '@/types/participant'

export function getShortName(p: Pick<Participant, 'name' | 'nickname'>): string {
  if (p.nickname) return p.nickname
  return p.name.split(' ')[0]
}

type NameableParticipant = Pick<Participant, 'id' | 'name' | 'nickname'>

/** Pre-compute short display names, using full name when short names collide. */
export function buildShortNameMap(participants: NameableParticipant[]): Map<string, string> {
  const map = new Map<string, string>()

  // First pass: compute short names (same logic as getShortName)
  const entries = participants.map(p => ({
    id: p.id,
    short: p.nickname || p.name.split(' ')[0],
    full: p.name,
  }))

  // Count short name occurrences
  const counts = new Map<string, number>()
  for (const { short } of entries) {
    counts.set(short, (counts.get(short) || 0) + 1)
  }

  // Use full name when short name is ambiguous
  for (const { id, short, full } of entries) {
    map.set(id, (counts.get(short) || 0) > 1 ? full : short)
  }

  return map
}
