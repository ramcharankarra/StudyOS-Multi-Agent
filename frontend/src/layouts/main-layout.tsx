import React from "react"
import { useThemeStore } from "@/store/theme-store"
import { Sun, Moon, GraduationCap } from "lucide-react"

interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground flex flex-col transition-colors duration-300">
      
      {/* Header */}
      <header className="h-16 border-b border-border/40 bg-card/65 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight select-none">
            Study<span className="text-primary">OS</span>
          </span>
        </div>

        <button
          onClick={toggleTheme}
          className="flex h-9.5 w-9.5 items-center justify-center rounded-xl border border-border/60 bg-background/50 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 bg-education-grid/10">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-border/20 text-center select-none shrink-0">
        <p className="text-xs text-muted-foreground/60">
          &copy; {new Date().getFullYear()} StudyOS Learning Systems. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
export default MainLayout
