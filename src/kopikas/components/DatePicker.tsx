// SPDX-License-Identifier: Apache-2.0

interface DatePickerProps {
  selected: string // YYYY-MM-DD
  onSelect: (date: string) => void
}

const DAY_ABBR = ['P', 'E', 'T', 'K', 'N', 'R', 'L'] as const // Sun=0..Sat=6
const MONTHS = [
  'jaanuar', 'veebruar', 'märts', 'aprill', 'mai', 'juuni',
  'juuli', 'august', 'september', 'oktoober', 'november', 'detsember',
] as const

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getLabel(date: Date, today: string, yesterday: string): string {
  const iso = formatDate(date)
  if (iso === today) return 'Täna'
  if (iso === yesterday) return 'Eile'
  const dayAbbr = DAY_ABBR[date.getDay()]
  const month = MONTHS[date.getMonth()]
  return `${dayAbbr}, ${date.getDate()}. ${month}`
}

export function DatePicker({ selected, onSelect }: DatePickerProps) {
  const now = new Date()
  const today = formatDate(now)
  const yesterdayDate = new Date(now)
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = formatDate(yesterdayDate)

  const days: { iso: string; label: string }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    days.push({ iso: formatDate(d), label: getLabel(d, today, yesterday) })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {days.map(({ iso, label }) => (
        <button
          key={iso}
          type="button"
          onClick={() => onSelect(iso)}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
            selected === iso
              ? 'bg-primary/20 border border-primary text-primary'
              : 'bg-muted text-muted-foreground border border-transparent'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
