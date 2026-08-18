import React from "react"
import { useTheme } from "@/components/theme-provider"
import { Sun, Moon, GraduationCap, Sparkles, BookOpen, ShieldCheck } from "lucide-react"
import { motion } from "framer-motion"

interface AuthLayoutProps {
  children: React.ReactNode
  headline?: string
  subheadline?: string
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children,
  headline = "Where learning comes alive",
  subheadline = "AI-powered courses, assignments, and study tools — built for students and teachers."
}) => {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground flex flex-col lg:flex-row transition-colors duration-300">
      {/* ======================================================== */}
      {/* LEFT EDITORIAL BRAND PANEL (Desktop 50%)                 */}
      {/* ======================================================== */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-amber-500/5 via-primary/5 to-emerald-500/5 p-12 flex-col justify-between overflow-hidden border-r border-border/40">
        {/* Soft floating background ambient shapes */}
        <motion.div 
          animate={{ scale: [1, 1.08, 1], rotate: [0, 5, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"
        />
        <motion.div 
          animate={{ scale: [1, 1.12, 1], rotate: [0, -8, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-12 right-12 w-[420px] h-[420px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none"
        />
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight">
              Study<span className="text-primary">OS</span>
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-md border border-border/60 text-xs font-semibold text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>AI Learning Platform</span>
          </div>
        </div>

        {/* Editorial Narrative */}
        <div className="relative z-10 my-auto py-12 max-w-lg space-y-6 text-left">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              Handcrafted for Education
            </span>
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.12] text-foreground font-heading">
              {headline}
            </h1>
            <p className="text-base xl:text-lg text-muted-foreground leading-relaxed font-sans">
              {subheadline}
            </p>
          </div>

          {/* Abstract Learning Illustration Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="p-6 rounded-2xl bg-card/80 backdrop-blur-md border border-border/60 shadow-xl shadow-black/5 relative overflow-hidden space-y-4"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-sm text-foreground">Interactive AI Learning</h4>
                <p className="text-xs text-muted-foreground">Personalized study plans, instant quizzes & intelligent feedback</p>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 pt-2">
              {["Smart Courses", "Quiz Engine", "AI Tutor", "Analytics"].map((tag) => (
                <span 
                  key={tag} 
                  className="px-2.5 py-1 rounded-lg bg-secondary/15 text-foreground text-[11px] font-semibold border border-border/40"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Footer Trust Badges */}
        <div className="relative z-10 flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-6">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Role-Based Secure Access</span>
          </div>
          <span>&copy; {new Date().getFullYear()} StudyOS</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT AUTH FORM PANEL                                     */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 relative bg-background">
        {/* Top Controls */}
        <div className="flex items-center justify-between lg:justify-end z-20 w-full mb-6">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight">
              Study<span className="text-primary">OS</span>
            </span>
          </div>

          <button
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-all duration-200 shadow-xs"
            title="Toggle Light/Dark Theme"
          >
            {theme === "dark" ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-4">
          {children}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground/60 pt-6 lg:hidden">
          &copy; {new Date().getFullYear()} StudyOS Learning Systems
        </div>
      </div>
    </div>
  )
}
