import type { Participant } from '@/types/participant'

export function getShortName(p: Pick<Participant, 'name' | 'nickname'>): string {
  if (p.nickname) return p.nickname
  return p.name.split(' ')[0]
}
