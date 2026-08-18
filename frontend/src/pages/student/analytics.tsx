import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/context/auth-context"
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  Flame, 
  Target, 
  HelpCircle, 
  Sparkles,
  BrainCircuit,
  Zap,
  Trophy
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { StatCard } from "@/components/ui/stat-card"
import { Button } from "@/components/ui/button"

interface StudentStats {
  courses_enrolled: number
  assignments_submitted: number
  quizzes_taken: number
  avg_quiz_score: number
  total_tasks: number
  completed_tasks: number
  task_completion_rate: number
  study_streak: number
  ai_suggestions: string[]
}

interface AchievementItem {
  id: string
  badge_key: string
  title: string
  description: string
  unlocked_at: string
}

const BADGE_ICONS: Record<string, React.ReactNode> = {
  first_course: <BookOpen className="h-5 w-5" />,
  first_assignment: <CheckCircle2 className="h-5 w-5" />,
  quiz_master: <HelpCircle className="h-5 w-5" />,
  streak_7: <Flame className="h-5 w-5" />,
  top_performer: <Trophy className="h-5 w-5" />,
  course_complete: <Award className="h-5 w-5" />,
  questions_100: <BrainCircuit className="h-5 w-5" />,
}

const BADGE_COLORS: Record<string, string> = {
  first_course: "from-primary to-amber-500",
  first_assignment: "from-emerald-500 to-teal-500",
  quiz_master: "from-amber-500 to-orange-500",
  streak_7: "from-red-500 to-pink-500",
  top_performer: "from-violet-500 to-purple-500",
  course_complete: "from-primary to-emerald-500",
  questions_100: "from-blue-500 to-cyan-500",
}

export const AnalyticsPage: React.FC = () => {
  const { apiFetch } = useAuth()
  const [stats, setStats] = useState<StudentStats | null>(null)
  const [achievements, setAchievements] = useState<AchievementItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    try {
      const [statsRes, achievementsRes] = await Promise.all([
        apiFetch("/api/v1/analytics/student"),
        apiFetch("/api/v1/analytics/achievements")
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      if (achievementsRes.ok) setAchievements(await achievementsRes.json())
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 text-left select-none max-w-7xl mx-auto pb-12"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[11px] uppercase tracking-wider border border-primary/20">
            Learning Intelligence
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight font-heading">Analytics & Progress</h1>
        <p className="text-xs text-muted-foreground">Track your learning journey, quiz accuracy, and study patterns</p>
      </motion.div>

      {/* Stat Cards Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Courses Enrolled"
          value={stats?.courses_enrolled ?? 0}
          description="Active enrollments"
          icon={BookOpen}
          variant="primary"
        />
        <StatCard
          label="Quiz Accuracy"
          value={stats?.avg_quiz_score ? `${stats.avg_quiz_score}%` : "N/A"}
          description={`${stats?.quizzes_taken ?? 0} quizzes taken`}
          icon={Target}
          variant="accent"
        />
        <StatCard
          label="Tasks Completed"
          value={stats?.completed_tasks ?? 0}
          description={`${stats?.task_completion_rate ?? 0}% completion rate`}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          label="Study Streak"
          value={`${stats?.study_streak ?? 0} Days`}
          description="Keep it going!"
          icon={Flame}
          variant="secondary"
        />
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Progress Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading">Learning Progress Overview</CardTitle>
            <CardDescription>Your activity breakdown across platform modules</CardDescription>
          </CardHeader>
          <CardContent className="border-t border-border/20 pt-6">
            <div className="space-y-4">
              {[
                { label: "Courses", value: stats?.courses_enrolled ?? 0, max: 10, color: "bg-primary" },
                { label: "Assignments", value: stats?.assignments_submitted ?? 0, max: 20, color: "bg-amber-500" },
                { label: "Quizzes", value: stats?.quizzes_taken ?? 0, max: 15, color: "bg-emerald-500" },
                { label: "Tasks Done", value: stats?.completed_tasks ?? 0, max: 30, color: "bg-violet-500" },
              ].map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-foreground">{item.label}</span>
                    <span className="text-muted-foreground">{item.value}</span>
                  </div>
                  <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full ${item.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Completion Ring */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="font-heading">Task Completion</CardTitle>
            <CardDescription>Daily planner progress rate</CardDescription>
          </CardHeader>
          <CardContent className="border-t border-border/20 pt-6 flex-1 flex flex-col items-center justify-center">
            <div className="relative h-36 w-36">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/40" />
                <motion.circle
                  cx="60" cy="60" r="50" fill="none" strokeWidth="10"
                  strokeLinecap="round"
                  className="text-primary"
                  stroke="currentColor"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - (stats?.task_completion_rate ?? 0) / 100) }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-foreground font-heading">
                  {stats?.task_completion_rate ?? 0}%
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Complete</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              {stats?.completed_tasks ?? 0} of {stats?.total_tasks ?? 0} tasks finished
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Suggestions */}
      {stats?.ai_suggestions && stats.ai_suggestions.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="p-5 bg-gradient-to-r from-primary/10 via-amber-500/10 to-emerald-500/10 border-primary/20 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-primary uppercase tracking-wider font-heading">
              <Sparkles className="h-4 w-4" />
              AI Learning Insights & Recommendations
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {stats.ai_suggestions.map((s, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-card/80 border border-border/50 flex items-start gap-2.5">
                  <BrainCircuit className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground/90 font-medium leading-relaxed">{s}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Achievements */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Learning Achievements
            </CardTitle>
            <CardDescription>Badges unlocked through your StudyOS learning journey</CardDescription>
          </CardHeader>
          <CardContent className="border-t border-border/20 pt-6">
            {achievements.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 border border-blue-500/20 shadow-xs">
                  <BarChart3 className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground">No Analytics Yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Performance insights will appear after completing learning activities.
                  </p>
                </div>
                <Button onClick={() => window.location.href = "/student/ai-workspace"} size="sm" className="font-bold text-xs gap-1.5 rounded-xl">
                  Start Learning
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {achievements.map((a) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-2 p-4 rounded-2xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-all"
                  >
                    <div className={`h-12 w-12 mx-auto rounded-2xl bg-gradient-to-tr ${BADGE_COLORS[a.badge_key] || "from-primary to-amber-500"} text-white flex items-center justify-center shadow-md`}>
                      {BADGE_ICONS[a.badge_key] || <Award className="h-5 w-5" />}
                    </div>
                    <h4 className="text-xs font-bold text-foreground">{a.title}</h4>
                    <p className="text-[10px] text-muted-foreground">{a.description}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
export default AnalyticsPage
