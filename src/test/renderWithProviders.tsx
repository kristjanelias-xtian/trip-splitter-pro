import { render, RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ReactElement } from 'react'

interface RenderWithRouterOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string
}

export function renderWithRouter(
  ui: ReactElement,
  { route = '/', ...options }: RenderWithRouterOptions = {}
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    ),
    ...options,
  })
}
