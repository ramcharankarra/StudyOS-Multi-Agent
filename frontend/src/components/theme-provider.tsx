import React, { createContext, useContext } from "react"
import { useThemeStore } from "@/store/theme-store"
import type { ThemeMode } from "@/store/theme-store"

interface ThemeProviderState {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode; defaultTheme?: string; storageKey?: string }) {
  const { theme, setTheme, toggleTheme } = useThemeStore()

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (!context) {
    const store = useThemeStore()
    return {
      theme: store.theme,
      setTheme: store.setTheme,
      toggleTheme: store.toggleTheme,
    }
  }
  return context
}
