import type { Participant } from '@/types/participant'

interface ParticipantAvatarProps {
  participant: Pick<Participant, 'name' | 'avatar_url'>
  size?: 'sm' | 'md'
  forceInitials?: boolean
}

const sizes = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
}

export function ParticipantAvatar({ participant, size = 'md', forceInitials }: ParticipantAvatarProps) {
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
        className={`${sizeClass} rounded-full shrink-0 object-cover`}
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <div className={`${sizeClass} rounded-full shrink-0 flex items-center justify-center font-medium bg-primary/10 text-primary`}>
      {initials}
    </div>
  )
}
