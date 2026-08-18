import React, { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { 
  Rocket, 
  BookOpen, 
  ClipboardList, 
  HelpCircle, 
  Flame, 
  Sparkles, 
  Calendar, 
  ArrowRight,
  GraduationCap,
  CheckCircle2,
  Zap,
  Target,
  BrainCircuit,
  Clock
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"

interface MissionItem {
  id: string
  goal: string
  status: string
  progress_pct: number
  estimated_time: string
  tasks_count: number
  artifacts_count: number
  created_at: string
}

interface TaskItem {
  id: string
  title: string
  description?: string
  priority: string
  category: string
  status: string
  estimated_time: number
}

interface AIInsightItem {
  recommendation: string
  why: string
  impact: string
  action_type: string
}

export const StudentDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [missions, setMissions] = useState<MissionItem[]>([])
  const [todayTasks, setTodayTasks] = useState<TaskItem[]>([])
  const [insights, setInsights] = useState<AIInsightItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const { apiFetch } = useAuth()

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [mRes, tRes, iRes] = await Promise.all([
        apiFetch("/api/v1/missions"),
        apiFetch("/api/v1/planner/today"),
        apiFetch("/api/v1/analytics/ai-insights")
      ])

      if (mRes.ok) {
        const mData = await mRes.json()
        setMissions(mData)
      }
      if (tRes.ok) {
        const tData = await tRes.json()
        setTodayTasks(tData)
      }
      if (iRes.ok) {
        const iData = await iRes.json()
        setInsights(iData.explained_recommendations || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const toggleTaskStatus = async (task: TaskItem) => {
    const nextStatus = task.status === "completed" ? "pending" : "completed"
    setTodayTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    )

    try {
      await apiFetch(`/api/v1/planner/task/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus })
      })
      fetchDashboardData()
    } catch (e) {
      console.error(e)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
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
      {/* EDITORIAL WELCOME HERO BANNER */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-amber-500/10 to-emerald-500/5 border border-primary/20 p-8 md:p-10 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider border border-primary/20">
                  StudyOS AI Classroom Operating System
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-heading text-foreground">
                Hello, {user?.name || "Learner"}
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                Your AI swarm automatically discovers classroom context, plans learning tasks, executes missions using Google Gemini, and persists educational resources.
              </p>
            </div>

            <Button 
              onClick={() => navigate("/student/ai-workspace")}
              size="lg"
              className="font-extrabold gap-2 shadow-md shadow-primary/20 shrink-0 bg-gradient-to-r from-primary via-amber-500 to-emerald-500 text-white border-0"
            >
              <Rocket className="h-5 w-5" />
              Launch New Mission
            </Button>
          </div>
        </div>
      </motion.div>

      {/* TODAY'S MISSION & QUICK ACTIONS */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Goals Widget */}
        <Card className="lg:col-span-2 hover-lift border-border/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Today's AI Goals & Tasks ({todayTasks.length})
                </CardTitle>
                <CardDescription>Real AI-generated daily study tasks from PostgreSQL</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/student/planner")} className="font-bold text-xs gap-1">
                Open Planner
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="border-t border-border/20 pt-6 space-y-3">
            {todayTasks.length === 0 ? (
              <div className="p-8 text-center border-dashed border-border/60 rounded-2xl space-y-2 bg-muted/10">
                <p className="text-xs font-bold text-foreground">No study plan has been generated yet.</p>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  Join a course or launch your first AI mission. StudyOS will automatically build a personalized planner using your classroom materials.
                </p>
                <Button onClick={() => navigate("/student/ai-workspace")} size="sm" className="font-bold text-xs gap-1.5 rounded-xl mt-2">
                  <Sparkles className="h-4 w-4" />
                  Launch Mission
                </Button>
              </div>
            ) : (
              todayTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-2xl border border-border/60 bg-muted/20 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleTaskStatus(task)}
                      className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                        task.status === "completed" ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted-foreground/40 hover:border-primary"
                      }`}
                    >
                      {task.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </button>
                    <span className={`font-bold font-heading ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {task.title}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-background border border-border/60 text-[10px] font-bold text-muted-foreground">
                    {task.estimated_time}m
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card className="hover-lift border-border/80">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              AI Insights (Explained)
            </CardTitle>
            <CardDescription>Personalized recommendations with EXPLANATION WHY</CardDescription>
          </CardHeader>
          <CardContent className="border-t border-border/20 pt-6 space-y-3 text-xs">
            {insights.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No AI recommendations available yet.</p>
            ) : (
              insights.map((ins, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-primary/5 border border-primary/15 space-y-1">
                  <span className="font-bold text-primary flex items-center gap-1.5">
                    <BrainCircuit className="h-3.5 w-3.5" />
                    {ins.recommendation}
                  </span>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    <strong className="text-foreground">WHY:</strong> {ins.why}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </motion.div>

      {/* RECENT MISSIONS WORKFLOW GRID */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight font-heading">Recent Missions & Workflows</h2>
            <p className="text-xs text-muted-foreground">Autonomous educational missions executed by your AI team</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/student/ai-workspace")} className="font-bold text-xs gap-1.5">
            View All Missions
          </Button>
        </div>

        {missions.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-border/80 bg-card/60 rounded-3xl space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto border border-primary/20">
              <Rocket className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">No Missions Executed Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Launch your first AI mission to execute autonomous workflows and generate persistent study resources.
              </p>
            </div>
            <Button onClick={() => navigate("/student/ai-workspace")} size="sm" className="font-bold text-xs gap-1.5 rounded-xl">
              Launch Mission
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {missions.slice(0, 3).map((m) => (
              <Card key={m.id} onClick={() => navigate("/student/ai-workspace")} className="hover-lift border-border/80 cursor-pointer p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/25 text-[10px] font-extrabold uppercase">
                    {m.status}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold">
                    <Clock className="h-3.5 w-3.5" />
                    {m.estimated_time}
                  </span>
                </div>
                <h4 className="font-bold text-sm font-heading text-foreground line-clamp-2">{m.goal}</h4>
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/20 pt-2">
                  <span>{m.tasks_count} Tasks</span>
                  <span className="text-primary font-bold">{m.artifacts_count} Artifacts</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

    </motion.div>
  )
}
export default StudentDashboardPage
