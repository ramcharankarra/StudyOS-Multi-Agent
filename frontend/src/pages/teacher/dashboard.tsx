import React from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { 
  BookOpen, 
  Users, 
  HelpCircle, 
  Plus, 
  Sparkles, 
  ArrowRight,
  School,
  FileCheck,
  GraduationCap
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"

export const TeacherDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 text-left select-none max-w-7xl mx-auto pb-12"
    >
      {/* ======================================================== */}
      {/* EDITORIAL TEACHER HERO BANNER                           */}
      {/* ======================================================== */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/10 via-primary/10 to-emerald-500/5 border border-amber-500/20 p-8 md:p-10 shadow-sm">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 right-48 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border border-amber-500/25">
                  <School className="h-3.5 w-3.5" />
                  Educator Portal
                </span>
                <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-heading leading-tight">
                Welcome back, Professor <span className="text-primary">{user?.name || "Teacher"}</span>!
              </h1>

              <p className="text-muted-foreground text-sm sm:text-base font-sans leading-relaxed">
                Manage your active courses, publish AI-assisted quizzes, grade assignments, and monitor student analytics from your teacher dashboard.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button 
                onClick={() => navigate("/teacher/courses")}
                className="shadow-md shadow-primary/20 hover:scale-[1.02] transition-all font-bold gap-2"
                size="lg"
              >
                <Plus className="h-4 w-4" />
                Create New Course
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ======================================================== */}
      {/* 4 VIBRANT STAT CARDS                                     */}
      {/* ======================================================== */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stat 1: Courses */}
        <Card className="hover-lift border-primary/20 bg-gradient-to-b from-card to-primary/[0.02]">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shrink-0">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Courses</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-tight font-heading">0</span>
                <span className="text-[11px] text-muted-foreground">Published</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stat 2: Students */}
        <Card className="hover-lift border-amber-500/20 bg-gradient-to-b from-card to-amber-500/[0.02]">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Students</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-tight font-heading">0</span>
                <span className="text-[11px] text-muted-foreground">Enrolled</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stat 3: Quizzes */}
        <Card className="hover-lift border-purple-500/20 bg-gradient-to-b from-card to-purple-500/[0.02]">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-600 shrink-0">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quizzes Created</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-tight font-heading">0</span>
                <span className="text-[11px] text-muted-foreground">Active</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stat 4: Submissions */}
        <Card className="hover-lift border-emerald-500/20 bg-gradient-to-b from-card to-emerald-500/[0.02]">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 shrink-0">
              <FileCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Grading</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-tight font-heading">0</span>
                <span className="text-[11px] text-emerald-600 font-semibold">Up to date</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ======================================================== */}
      {/* ASYMMETRIC TWO-COLUMN SECTION                             */}
      {/* ======================================================== */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Panel: Course Management (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-heading">Courses You Teach</h2>
              <p className="text-xs text-muted-foreground">Manage your curriculum and content</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/teacher/courses")} className="text-primary font-bold text-xs gap-1">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Friendly Handcrafted Empty State */}
          <Card className="p-8 text-center border-dashed border-border/80 bg-gradient-to-b from-card to-muted/20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-600 mb-4 shadow-sm">
              <School className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold font-heading mb-1">No active courses created</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
              You haven't built any courses yet. Create your first syllabus and syllabus modules to start teaching students.
            </p>
            <Button onClick={() => navigate("/teacher/courses")} className="font-bold gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Course
            </Button>
          </Card>
        </div>

        {/* Right Panel: Student Enrolments (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-heading">Student Enrollments</h2>
              <p className="text-xs text-muted-foreground">Roster and student activity</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/teacher/students")} className="text-primary font-bold text-xs gap-1">
              Students <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Friendly Handcrafted Schedule Empty State */}
          <Card className="p-8 text-center border-dashed border-border/80 bg-gradient-to-b from-card to-emerald-500/[0.02]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600 mb-4 shadow-sm">
              <GraduationCap className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold font-heading mb-1">No enrolled students</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed mb-6">
              Once students join your published courses, their enrollment details and grade analytics will appear here.
            </p>
            <Button variant="outline" onClick={() => navigate("/teacher/students")} className="font-bold gap-2">
              <Users className="h-4 w-4" />
              Manage Roster
            </Button>
          </Card>
        </div>
      </motion.div>

      {/* ======================================================== */}
      {/* FEATURED TEASER: AI QUIZ GENERATOR                      */}
      {/* ======================================================== */}
      <motion.div variants={itemVariants}>
        <Card className="relative overflow-hidden border-amber-500/20 bg-gradient-to-r from-card via-amber-500/[0.03] to-primary/[0.03]">
          <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-500/20">
                <Sparkles className="h-3.5 w-3.5" />
                AI Assessment Studio
              </div>
              <h3 className="text-2xl font-bold font-heading">Generate automated quizzes with AI</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Provide your course materials or topic, and let StudyOS AI generate structured multiple-choice and short-answer quizzes in seconds.
              </p>
            </div>

            <Button 
              size="lg" 
              onClick={() => navigate("/teacher/quizzes")} 
              className="font-bold gap-2 shrink-0 shadow-md shadow-primary/20"
            >
              Open Quiz Generator
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

export default TeacherDashboardPage
