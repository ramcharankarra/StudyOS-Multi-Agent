import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { 
  GraduationCap, 
  Sparkles, 
  ArrowRight, 
  BookOpen, 
  ShieldCheck, 
  Globe, 
  Users, 
  CheckCircle2,
  LogIn,
  UserPlus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { GoogleOAuthButton } from "@/components/google-oauth-button"
import { useAuth } from "@/context/auth-context"

export const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const { googleAuth } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSuccess = async (token: string) => {
    setIsLoading(true)
    try {
      const res = await googleAuth(token) as any
      if (res && res.status === "needs_role") {
        navigate("/login")
      } else if (res && res.status === "success") {
        navigate(res.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard")
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between select-none relative overflow-hidden">
      {/* Background soft ambient blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight">
            Study<span className="text-primary">OS</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate("/login")} className="font-bold text-sm">
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Button>
          <Button onClick={() => navigate("/signup")} className="font-bold text-sm shadow-md shadow-primary/20">
            <UserPlus className="mr-2 h-4 w-4" />
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-12 md:py-20 text-center space-y-8 relative z-10 my-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
            <Sparkles className="h-4 w-4" />
            AI-Powered Learning Management System
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-heading leading-tight max-w-3xl mx-auto">
            Where education meets <span className="text-primary">intelligent technology</span>.
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-sans">
            StudyOS is built for teachers and students to manage courses, practice with AI tutors, and track real learning growth.
          </p>
        </motion.div>

        {/* Call-to-action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto pt-4"
        >
          <GoogleOAuthButton
            onSuccess={handleGoogleSuccess}
            isLoading={isLoading}
            className="w-full sm:w-auto min-w-[200px]"
          />

          <Button
            size="lg"
            onClick={() => navigate("/signup")}
            className="w-full sm:w-auto font-bold gap-2 text-sm shadow-lg shadow-primary/25"
          >
            Create Account
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>

        {/* Feature Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="pt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto text-left"
        >
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-sm font-heading">Course Management</h4>
            <p className="text-xs text-muted-foreground">Structured syllabi, assignments, and learning materials.</p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-2">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-sm font-heading">AI Learning Tutor</h4>
            <p className="text-xs text-muted-foreground">Interactive concept explanations and auto quiz generation.</p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-sm font-heading">Role-Based Security</h4>
            <p className="text-xs text-muted-foreground">Protected Student and Teacher workspaces with JWT tokens.</p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-6 text-center text-xs text-muted-foreground/70 border-t border-border/40 z-20">
        &copy; {new Date().getFullYear()} StudyOS Learning Systems. All rights reserved.
      </footer>
    </div>
  )
}
export default LandingPage
