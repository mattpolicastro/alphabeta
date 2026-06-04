import type { ReactNode } from 'react'
import {
  BoardContext,
  useBoardState,
  type UseBoardStateOptions,
} from './useBoardState'

interface BoardProviderProps extends UseBoardStateOptions {
  children: ReactNode
}

export function BoardProvider({ children, ...options }: BoardProviderProps) {
  const value = useBoardState(options)
  return (
    <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
  )
}
