// SPDX-License-Identifier: Apache-2.0

/** Returns '/kopikas' when embedded in Spl1t, '' when standalone */
export function useKopikasBasePath(): string {
  const host = window.location.hostname
  if (host.startsWith('kopikas.')) return ''
  if ((host === 'localhost' || host === '127.0.0.1') && localStorage.getItem('kopikas:dev-mode') === 'true') return ''
  return '/kopikas'
}
