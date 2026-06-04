import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { BoardProvider } from '@/components/strategy/hooks/BoardProvider'
import type { BoardState } from './types'

interface RenderWithBoardOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: BoardState
  disablePersistence?: boolean
}

export function renderWithBoard(
  ui: ReactElement,
  options: RenderWithBoardOptions = {},
) {
  const {
    initialState,
    disablePersistence = true,
    ...rest
  } = options
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <BoardProvider
        initialState={initialState}
        disablePersistence={disablePersistence}
      >
        {children}
      </BoardProvider>
    )
  }
  return render(ui, { wrapper: Wrapper, ...rest })
}
