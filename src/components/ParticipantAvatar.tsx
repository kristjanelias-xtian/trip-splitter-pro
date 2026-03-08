// SPDX-License-Identifier: Apache-2.0
import { Baby } from 'lucide-react'
import type { Participant } from '@/types/participant'

interface ParticipantAvatarProps {
  participant: Pick<Participant, 'name' | 'avatar_url'> & { is_adult?: boolean }
  size?: 'sm' | 'md'
  forceInitials?: boolean
  className?: string
}

const sizes = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
}

const babyIconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
}

export function ParticipantAvatar({ participant, size = 'md', forceInitials, className }: ParticipantAvatarProps) {
  const sizeClass = sizes[size]

  const initials = participant.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (participant.avatar_url && !forceInitials) {
    return (
      <img
        src={participant.avatar_url}
        alt={participant.name}
        className={`${sizeClass} rounded-full shrink-0 object-cover ${className ?? ''}`}
        referrerPolicy="no-referrer"
      />
    )
  }

  if (participant.is_adult === false) {
    return (
      <div className={`${sizeClass} rounded-full shrink-0 flex items-center justify-center bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 ${className ?? ''}`}>
        <Baby className={babyIconSizes[size]} />
      </div>
    )
  }

  return (
    <div className={`${sizeClass} rounded-full shrink-0 flex items-center justify-center font-medium bg-primary/10 text-primary ${className ?? ''}`}>
      {initials}
    </div>
  )
}
