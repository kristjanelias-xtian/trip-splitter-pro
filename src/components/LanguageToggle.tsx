// SPDX-License-Identifier: Apache-2.0
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useUserPreferences } from '@/contexts/UserPreferencesContext'

interface LanguageToggleProps {
  size?: 'default' | 'compact'
  onGradient?: boolean
}

export function LanguageToggle({ size = 'default', onGradient = false }: LanguageToggleProps) {
  const { i18n } = useTranslation()
  const { user } = useAuth()
  const { saveLanguagePreference } = useUserPreferences()

  const isCompact = size === 'compact'
  const currentLang = i18n.language?.startsWith('et') ? 'et' : 'en'

  const handleChange = (lang: 'en' | 'et') => {
    i18n.changeLanguage(lang)
    if (user) saveLanguagePreference(lang)
  }

  const languages = [
    { value: 'en' as const, label: 'EN' },
    { value: 'et' as const, label: 'ET' },
  ]

  return (
    <div className={`flex items-center rounded-lg p-0.5 gap-0.5 w-fit ${
      onGradient ? 'bg-white/10' : 'border border-border bg-muted/50'
    }`}>
      {languages.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => handleChange(value)}
          className={`rounded-md transition-colors font-medium ${
            isCompact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs'
          } ${
            currentLang === value
              ? onGradient
                ? 'bg-white/20 text-white shadow-sm'
                : 'bg-card text-foreground shadow-sm ring-1 ring-border'
              : onGradient
                ? 'text-white/60 hover:text-white'
                : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
