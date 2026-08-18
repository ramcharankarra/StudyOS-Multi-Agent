import React from "react"
import { motion } from "framer-motion"
import { 
  Check, 
  Sun, 
  Moon, 
  Sparkles, 
  Sliders, 
  Zap, 
  Palette,
  Maximize2,
  Minimize2
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { 
  useThemeStore, 
  THEME_PRESETS
} from "@/store/theme-store"
import type {
  ThemePreset, 
  MotionPreference 
} from "@/store/theme-store"
import { useToast } from "@/components/ui/toast"

export const AppearanceSettings: React.FC = () => {
  const { 
    theme, 
    preset, 
    density, 
    motion: motionPref, 
    setTheme, 
    setPreset, 
    setDensity, 
    setMotion 
  } = useThemeStore()
  
  const { showToast } = useToast()

  const handlePresetSelect = (selectedPreset: ThemePreset, name: string) => {
    setPreset(selectedPreset)
    showToast(`Applied "${name}" theme preset`, "success")
  }

  return (
    <div className="space-y-6 text-left select-none">
      
      {/* ======================================================== */}
      {/* THEME PRESET CARDS GRID                                  */}
      {/* ======================================================== */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Theme Presets
            </CardTitle>
            <CardDescription>
              Select a curated visual theme for StudyOS. All colors & tokens update dynamically.
            </CardDescription>
          </div>
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20">
            5 Presets Available
          </span>
        </CardHeader>

        <CardContent className="border-t border-border/20 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {THEME_PRESETS.map((p) => {
              const isSelected = preset === p.id

              return (
                <motion.div
                  key={p.id}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handlePresetSelect(p.id, p.name)}
                  className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/[0.04] shadow-md shadow-primary/10 ring-2 ring-primary/20"
                      : "border-border/60 bg-card hover:border-border hover:bg-muted/30"
                  }`}
                >
                  {/* Selected checkmark badge */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="absolute top-4 right-4 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/30 z-10"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </motion.div>
                  )}

                  {/* Header info */}
                  <div className="space-y-1 mb-4 pr-6">
                    <h4 className="font-bold text-base text-foreground font-heading">{p.name}</h4>
                    <p className="text-[11px] font-semibold text-muted-foreground">{p.feeling}</p>
                  </div>

                  {/* Swatch circles */}
                  <div className="flex items-center gap-2 mb-4">
                    <div 
                      className="h-6 w-6 rounded-full border border-black/10 shadow-xs" 
                      style={{ backgroundColor: p.primaryColor }}
                      title="Primary Color"
                    />
                    <div 
                      className="h-6 w-6 rounded-full border border-black/10 shadow-xs" 
                      style={{ backgroundColor: p.secondaryColor }}
                      title="Secondary Color"
                    />
                    <div 
                      className="h-6 w-6 rounded-full border border-black/10 shadow-xs" 
                      style={{ backgroundColor: p.accentColor }}
                      title="Accent Color"
                    />
                  </div>

                  {/* Mini Dashboard Preview */}
                  <div 
                    className="p-3 rounded-xl border border-border/40 space-y-2 overflow-hidden shadow-inner text-[10px]"
                    style={{ backgroundColor: p.isDark ? "#1A1D24" : "#FAF8F5" }}
                  >
                    {/* Top navbar bar */}
                    <div className="flex items-center justify-between px-2 py-1 rounded-md bg-card border border-border/40">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.primaryColor }} />
                        <span className="font-bold text-[9px] text-foreground">StudyOS</span>
                      </div>
                      <div className="h-1.5 w-8 rounded-full bg-muted" />
                    </div>

                    {/* Content area split */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <div 
                        className="p-2 rounded-lg text-white font-bold flex flex-col justify-between"
                        style={{ backgroundColor: p.primaryColor }}
                      >
                        <span className="text-[8px] opacity-90">Course</span>
                        <span className="text-xs">01</span>
                      </div>

                      <div className="p-2 rounded-lg bg-card border border-border/40 flex flex-col justify-between">
                        <span className="text-[8px] text-muted-foreground">Tasks</span>
                        <span className="text-xs font-bold text-foreground" style={{ color: p.secondaryColor }}>0</span>
                      </div>

                      <div className="p-2 rounded-lg bg-card border border-border/40 flex flex-col justify-between">
                        <span className="text-[8px] text-muted-foreground">Score</span>
                        <span className="text-xs font-bold" style={{ color: p.accentColor }}>100%</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* LIGHT / DARK MODE & DISPLAY OPTIONS                     */}
      {/* ======================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" />
            Display & Mode Options
          </CardTitle>
          <CardDescription>Customize dark mode, layout density, and motion preferences.</CardDescription>
        </CardHeader>

        <CardContent className="border-t border-border/20 pt-6 space-y-6">
          
          {/* Light / Dark Mode toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-border/10">
            <div className="space-y-0.5">
              <label className="text-sm font-bold text-foreground flex items-center gap-2">
                {theme === "dark" ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-amber-500" />}
                Appearance Mode
              </label>
              <p className="text-xs text-muted-foreground">Switch between light warm mode and dark slate mode.</p>
            </div>

            <div className="flex items-center gap-2 p-1 bg-muted/60 rounded-xl border border-border/60 shrink-0">
              <Button
                variant={theme === "light" ? "primary" : "ghost"}
                size="sm"
                onClick={() => {
                  setTheme("light")
                  showToast("Switched to Light mode", "info")
                }}
                className="text-xs font-bold gap-1.5"
              >
                <Sun className="h-3.5 w-3.5" />
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "primary" : "ghost"}
                size="sm"
                onClick={() => {
                  setTheme("dark")
                  showToast("Switched to Dark mode", "info")
                }}
                className="text-xs font-bold gap-1.5"
              >
                <Moon className="h-3.5 w-3.5" />
                Dark
              </Button>
            </div>
          </div>

          {/* Layout Density */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-border/10">
            <div className="space-y-0.5">
              <label className="text-sm font-bold text-foreground flex items-center gap-2">
                <Maximize2 className="h-4 w-4 text-primary" />
                Layout Density
              </label>
              <p className="text-xs text-muted-foreground">Choose comfortable spacing or compact data density.</p>
            </div>

            <div className="flex items-center gap-2 p-1 bg-muted/60 rounded-xl border border-border/60 shrink-0">
              <Button
                variant={density === "comfortable" ? "primary" : "ghost"}
                size="sm"
                onClick={() => {
                  setDensity("comfortable")
                  showToast("Comfortable density applied", "info")
                }}
                className="text-xs font-bold gap-1.5"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Comfortable
              </Button>
              <Button
                variant={density === "compact" ? "primary" : "ghost"}
                size="sm"
                onClick={() => {
                  setDensity("compact")
                  showToast("Compact density applied", "info")
                }}
                className="text-xs font-bold gap-1.5"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                Compact
              </Button>
            </div>
          </div>

          {/* Motion Preference */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <label className="text-sm font-bold text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Full Animation Motion
              </label>
              <p className="text-xs text-muted-foreground">Enable spring card transitions and fluid UI motion effects.</p>
            </div>
            
            <Switch
              checked={motionPref === "full"}
              onCheckedChange={(checked) => {
                const next: MotionPreference = checked ? "full" : "reduced"
                setMotion(next)
                showToast(checked ? "Full UI motion enabled" : "Reduced motion enabled", "info")
              }}
            />
          </div>

        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* LIVE COLOR TOKENS INSPECTOR                             */}
      {/* ======================================================== */}
      <Card className="bg-gradient-to-r from-card via-primary/[0.02] to-secondary/[0.02]">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="font-bold text-sm text-foreground">Centralized Design Token Engine Active</h4>
              <p className="text-xs text-muted-foreground">All components consume CSS variables dynamically without hardcoded colors.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-primary px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <span>[data-preset="{preset}"]</span>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
export default AppearanceSettings
