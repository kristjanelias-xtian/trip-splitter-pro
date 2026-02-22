type Event = 'auth-error' | 'api-success'
type Listener = () => void

const listeners: Record<Event, Set<Listener>> = {
  'auth-error': new Set(),
  'api-success': new Set(),
}

export const sessionHealthBus = {
  on(event: Event, fn: Listener) {
    listeners[event].add(fn)
    return () => { listeners[event].delete(fn) }
  },
  emit(event: Event) {
    listeners[event].forEach(fn => fn())
  },
}
