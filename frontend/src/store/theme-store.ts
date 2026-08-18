import { create } from "zustand"

export type ThemePreset = "aurora" | "ocean" | "sunset" | "forest" | "midnight"
export type ThemeMode = "light" | "dark"
export type LayoutDensity = "comfortable" | "compact"
export type MotionPreference = "full" | "reduced"

interface ThemePresetConfig {
  id: ThemePreset
  name: string
  feeling: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  isDark?: boolean
}

export const THEME_PRESETS: ThemePresetConfig[] = [
  {
    id: "aurora",
    name: "Aurora Learning",
    feeling: "Creative • Modern • Educational",
    primaryColor: "#E8653A",
    secondaryColor: "#3B82F6",
    accentColor: "#F59E0B",
  },
  {
    id: "ocean",
    name: "Ocean Breeze",
    feeling: "Calm • Professional • Focused",
    primaryColor: "#2563EB",
    secondaryColor: "#0D9488",
    accentColor: "#10B981",
  },
  {
    id: "sunset",
    name: "Sunset Studio",
    feeling: "Warm • Creative • Friendly",
    primaryColor: "#EA580C",
    secondaryColor: "#F59E0B",
    accentColor: "#F43F5E",
  },
  {
    id: "forest",
    name: "Forest Focus",
    feeling: "Natural • Calm • Productive",
    primaryColor: "#059669",
    secondaryColor: "#16A34A",
    accentColor: "#EAB308",
  },
  {
    id: "midnight",
    name: "Midnight Pro",
    feeling: "Professional • Focused • Dark",
    primaryColor: "#6366F1",
    secondaryColor: "#10B981",
    accentColor: "#E8653A",
    isDark: true,
  },
]

interface ThemeState {
  theme: ThemeMode
  preset: ThemePreset
  density: LayoutDensity
  motion: MotionPreference
  
  setTheme: (mode: ThemeMode) => void
  toggleTheme: () => void
  setPreset: (preset: ThemePreset) => void
  setDensity: (density: LayoutDensity) => void
  setMotion: (motion: MotionPreference) => void
}

const applyThemeToDOM = (
  mode: ThemeMode,
  preset: ThemePreset,
  density: LayoutDensity,
  motion: MotionPreference
) => {
  if (typeof window === "undefined") return
  const root = window.document.documentElement

  // Mode
  root.classList.remove("light", "dark")
  if (mode === "dark" || preset === "midnight") {
    root.classList.add("dark")
  } else {
    root.classList.add("light")
  }

  // Preset, Density, Motion
  root.setAttribute("data-preset", preset)
  root.setAttribute("data-density", density)
  root.setAttribute("data-motion", motion)
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const getInitialState = () => {
    if (typeof window === "undefined") {
      return {
        theme: "light" as ThemeMode,
        preset: "aurora" as ThemePreset,
        density: "comfortable" as LayoutDensity,
        motion: "full" as MotionPreference,
      }
    }

    const savedMode = (localStorage.getItem("studyos-theme-mode") as ThemeMode) || "light"
    const savedPreset = (localStorage.getItem("studyos-theme-preset") as ThemePreset) || "aurora"
    const savedDensity = (localStorage.getItem("studyos-density") as LayoutDensity) || "comfortable"
    const savedMotion = (localStorage.getItem("studyos-motion") as MotionPreference) || "full"

    applyThemeToDOM(savedMode, savedPreset, savedDensity, savedMotion)

    return {
      theme: savedMode,
      preset: savedPreset,
      density: savedDensity,
      motion: savedMotion,
    }
  }

  const initialState = getInitialState()

  return {
    ...initialState,

    setTheme: (mode) => {
      localStorage.setItem("studyos-theme-mode", mode)
      const current = get()
      applyThemeToDOM(mode, current.preset, current.density, current.motion)
      set({ theme: mode })
    },

    toggleTheme: () => {
      const current = get()
      const nextMode: ThemeMode = current.theme === "light" ? "dark" : "light"
      localStorage.setItem("studyos-theme-mode", nextMode)
      applyThemeToDOM(nextMode, current.preset, current.density, current.motion)
      set({ theme: nextMode })
    },

    setPreset: (preset) => {
      localStorage.setItem("studyos-theme-preset", preset)
      const current = get()
      const mode = preset === "midnight" ? "dark" : current.theme
      applyThemeToDOM(mode, preset, current.density, current.motion)
      set({ preset, theme: mode })
    },

    setDensity: (density) => {
      localStorage.setItem("studyos-density", density)
      const current = get()
      applyThemeToDOM(current.theme, current.preset, density, current.motion)
      set({ density })
    },

    setMotion: (motion) => {
      localStorage.setItem("studyos-motion", motion)
      const current = get()
      applyThemeToDOM(current.theme, current.preset, current.density, motion)
      set({ motion })
    },
  }
})
