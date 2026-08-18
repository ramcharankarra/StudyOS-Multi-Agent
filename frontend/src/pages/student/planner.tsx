import React, { useState, useEffect, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Calendar as CalendarIcon, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Flame, 
  RefreshCw, 
  Plus, 
  BookOpen, 
  CheckSquare, 
  AlertCircle, 
  Target, 
  TrendingUp,
  BrainCircuit,
  Zap,
  ArrowRight,
  Eye,
  Rocket,
  FileText,
  Brain,
  HelpCircle,
  Trash2,
  AlertTriangle
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/context/auth-context"
import { AIResourceViewerModal, type TaskResourceItem } from "@/components/planner/ai-resource-viewer-modal"

interface PlannerSummary {
  has_data: boolean
  total_tasks: number
  completed_tasks: number
  pending_tasks: number
  progress_pct: number
  today_estimated_minutes: number
  weekly_estimated_minutes: number
  study_streak: number
}

interface StudyPlanData {
  id: string
  title: string
  description?: string
  created_at: string
}

export const PlannerPage: React.FC = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { apiFetch } = useAuth()

  const [plan, setPlan] = useState<StudyPlanData | null>(null)
  const [tasks, setTasks] = useState<TaskResourceItem[]>([])
  const [summary, setSummary] = useState<PlannerSummary | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedTask, setSelectedTask] = useState<TaskResourceItem | null>(null)

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<"today" | "weekly" | "revision">("today")

  // Confirmation dialog state
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<TaskResourceItem | null>(null)
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch student's current AI Study Plan, Tasks & Dynamic Metrics Summary
  const fetchPlanAndTasks = useCallback(async () => {
    setIsLoading(true)
    try {
      const [planRes, summaryRes] = await Promise.all([
        apiFetch("/api/v1/planner"),
        apiFetch("/api/v1/planner/summary")
      ])

      if (planRes.ok) {
        const data = await planRes.json()
        setPlan(data.plan)
        setTasks(data.tasks || [])
      }

      if (summaryRes.ok) {
        const sumData = await summaryRes.json()
        setSummary(sumData)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [apiFetch])

  const [searchParams, setSearchParams] = useSearchParams()
  const targetArtifactId = searchParams.get("artifact_id")
  const [dismissedArtifactId, setDismissedArtifactId] = useState<string | null>(null)

  useEffect(() => {
    fetchPlanAndTasks()
  }, [fetchPlanAndTasks])

  // Automatically open teaching lesson modal when navigated from "Start Learning"
  useEffect(() => {
    if (targetArtifactId && !selectedTask && targetArtifactId !== dismissedArtifactId) {
      if (tasks.length > 0) {
        const matchTask = tasks.find(t => t.artifact_id === targetArtifactId)
        if (matchTask) {
          setSelectedTask(matchTask)
          return
        }
      }
      // Virtual task fallback to render artifact directly
      setSelectedTask({
        id: targetArtifactId,
        title: "Day 1 Teaching Lesson",
        priority: "HIGH",
        category: "READING",
        status: "pending",
        estimated_time: 45,
        artifact_id: targetArtifactId,
        resource_type: "NOTES"
      })
    }
  }, [targetArtifactId, tasks, selectedTask, dismissedArtifactId])

  const handleCloseModal = () => {
    if (targetArtifactId) {
      setDismissedArtifactId(targetArtifactId)
    }
    setSelectedTask(null)
    if (searchParams.has("artifact_id") || searchParams.has("mission_id")) {
      const newParams = new URLSearchParams(searchParams)
      newParams.delete("artifact_id")
      newParams.delete("mission_id")
      setSearchParams(newParams, { replace: true })
    }
  }

  // Trigger PlannerAgent to generate AI Study Plan
  const handleGeneratePlan = async () => {
    setIsGenerating(true)
    try {
      const res = await apiFetch("/api/v1/planner/generate", {
        method: "POST",
        body: JSON.stringify({ available_hours: 3 })
      })

      if (!res.ok) throw new Error("Failed to generate AI study plan")

      const data = await res.json()
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions)
      }
      showToast("Personalized AI Study Plan generated!", "success")
      fetchPlanAndTasks()

    } catch (err: any) {
      showToast(err.message || "Plan generation failed", "error")
    } finally {
      setIsGenerating(false)
    }
  }

  // Toggle Task Completion State
  const toggleTaskStatus = async (task: TaskResourceItem) => {
    const nextStatus = task.status === "completed" ? "pending" : "completed"

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    )

    try {
      const res = await apiFetch(`/api/v1/planner/task/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus })
      })

      if (res.ok && nextStatus === "completed") {
        showToast("Task completed! Keep up your streak.", "success")
      }
      fetchPlanAndTasks()
    } catch (e) {
      showToast("Failed to update task", "error")
      fetchPlanAndTasks()
    }
  }

  // Confirm Single Task Deletion
  const confirmDeleteTask = async () => {
    if (!deleteTaskTarget) return
    setIsDeleting(true)
    try {
      if (deleteTaskTarget.artifact_id) {
        await apiFetch(`/api/v1/artifacts/${deleteTaskTarget.artifact_id}`, { method: "DELETE" })
      }
      await apiFetch(`/api/v1/planner/task/${deleteTaskTarget.id}`, { method: "DELETE" })
      showToast("Resource deleted successfully.", "success")
      setDeleteTaskTarget(null)
      fetchPlanAndTasks()
    } catch (e) {
      showToast("Failed to delete resource", "error")
    } finally {
      setIsDeleting(false)
    }
  }

  // Confirm Clear All Generated Resources
  const confirmClearAll = async () => {
    setIsDeleting(true)
    try {
      const res = await apiFetch("/api/v1/artifacts/clear-all", { method: "DELETE" })
      if (res.ok) {
        showToast("All generated resources have been cleared.", "success")
        setIsClearAllConfirmOpen(false)
        fetchPlanAndTasks()
      }
    } catch (e) {
      showToast("Failed to clear resources", "error")
    } finally {
      setIsDeleting(false)
    }
  }

  // Trigger Smart Reschedule
  const handleSmartReschedule = async () => {
    setIsRescheduling(true)
    try {
      const res = await apiFetch("/api/v1/planner/reschedule", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        showToast(`Rescheduled ${data.count || 0} pending tasks to high priority today.`, "info")
        fetchPlanAndTasks()
      }
    } catch (e) {
      showToast("Reschedule failed", "error")
    } finally {
      setIsRescheduling(false)
    }
  }

  // Dynamic Metrics from API Summary
  const progressPct = summary ? summary.progress_pct : 0
  const completedCount = summary ? summary.completed_tasks : 0
  const totalCount = summary ? summary.total_tasks : 0
  const streakDays = summary ? summary.study_streak : 0
  const todayMins = summary ? summary.today_estimated_minutes : 0

  const filteredTasks = tasks.filter((t: TaskResourceItem) => {
    if (activeTab === "today") {
      if (!t.deadline) return true
      const d = new Date(t.deadline)
      const now = new Date()
      return d.getFullYear() < now.getFullYear() ||
             (d.getFullYear() === now.getFullYear() && d.getMonth() < now.getMonth()) ||
             (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() <= now.getDate())
    }
    if (activeTab === "weekly") {
      return true
    }
    if (activeTab === "revision") {
      const cat = (t.category || "").toUpperCase()
      const res = (t.resource_type || "").toUpperCase()
      return cat.includes("REVISION") || cat.includes("QUIZ") || res.includes("FLASHCARD") || res.includes("NOTES")
    }
    return true
  })

  const getPriorityBadgeColor = (p: string) => {
    switch (p.toUpperCase()) {
      case "HIGH": return "bg-red-500/15 text-red-600 border-red-500/25"
      case "MEDIUM": return "bg-amber-500/15 text-amber-600 border-amber-500/25"
      default: return "bg-emerald-500/15 text-emerald-600 border-emerald-500/25"
    }
  }

  const getCategoryIcon = (c: string) => {
    switch (c.toUpperCase()) {
      case "ASSIGNMENT": return <BookOpen className="h-4 w-4 text-primary" />
      case "QUIZ": return <BrainCircuit className="h-4 w-4 text-amber-500" />
      case "GOAL": return <Target className="h-4 w-4 text-emerald-500" />
      default: return <Zap className="h-4 w-4 text-primary" />
    }
  }

  return (
    <div className="space-y-6 text-left select-none max-w-7xl mx-auto pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[11px] uppercase tracking-wider border border-primary/20">
              AI Study Coach & Planner
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-heading">Personalized AI Study Planner</h1>
          <p className="text-xs text-muted-foreground">Every task is linked directly to real persistent AI Resources & deliverables</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {tasks.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setIsClearAllConfirmOpen(true)}
              className="font-bold text-xs gap-1.5 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Clear All Generated
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleSmartReschedule}
            isLoading={isRescheduling}
            disabled={tasks.length === 0}
            className="font-bold gap-2 text-xs rounded-xl"
          >
            <RefreshCw className="h-4 w-4" />
            Smart Reschedule
          </Button>

          <Button
            onClick={handleGeneratePlan}
            isLoading={isGenerating}
            className="shadow-md shadow-primary/20 font-bold gap-2 bg-gradient-to-r from-primary via-amber-500 to-emerald-500 text-white border-0 rounded-xl"
            size="lg"
          >
            <Sparkles className="h-5 w-5" />
            Generate AI Study Plan
          </Button>
        </div>
      </div>

      {/* Dynamic Overview Analytics Banner Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-5 bg-card/80 border-border/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Student Learning Progress</span>
            <div className="text-3xl font-extrabold text-foreground font-heading">{progressPct}%</div>
            <p className="text-[11px] text-muted-foreground">{completedCount} of {totalCount} learning tasks completed</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-bold text-sm shadow-sm">
            <CheckSquare className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-5 bg-card/80 border-border/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Study Streak</span>
            <div className="text-3xl font-extrabold text-amber-500 font-heading flex items-center gap-1.5">
              {streakDays} <Flame className="h-6 w-6 fill-amber-500" />
            </div>
            <p className="text-[11px] text-muted-foreground">Days active study streak</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold text-sm shadow-sm">
            <Flame className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-5 bg-card/80 border-border/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Estimated Time</span>
            <div className="text-3xl font-extrabold text-emerald-600 font-heading">
              {Math.floor(todayMins / 60)}h {todayMins % 60}m
            </div>
            <p className="text-[11px] text-muted-foreground">Paced daily workload</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold text-sm shadow-sm">
            <Clock className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* AI Study Coach Recommendations Banner */}
      {suggestions.length > 0 && (
        <Card className="p-5 bg-gradient-to-r from-primary/10 via-amber-500/10 to-emerald-500/10 border-primary/20 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-extrabold text-primary uppercase tracking-wider font-heading">
            <Sparkles className="h-4 w-4" />
            AI Study Coach Insights & Suggestions
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {suggestions.map((s, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-card/80 border border-border/50 flex items-start gap-2.5">
                <Target className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-foreground font-medium">{s}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Main Tasks List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            {[
              { id: "today", label: "Today's Agenda" },
              { id: "weekly", label: "Weekly Schedule" },
              { id: "revision", label: "Revision Queue" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Task Cards */}
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs font-bold text-muted-foreground">Loading AI Study Tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          /* EMPTY STATE REQUIREMENT */
          <div className="py-16 text-center border-2 border-dashed border-border/80 rounded-3xl bg-muted/20 space-y-4 max-w-md mx-auto my-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarIcon className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold font-heading text-foreground">No tasks scheduled for this view.</h3>
              <p className="text-xs text-muted-foreground">
                Generate your personalized AI study plan or switch tabs to view your multi-day schedule.
              </p>
            </div>
            <Button
              onClick={handleGeneratePlan}
              isLoading={isGenerating}
              className="font-bold text-xs gap-2 rounded-xl shadow-md shadow-primary/20"
            >
              <Sparkles className="h-4 w-4" />
              Generate Study Plan
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((t) => (
              <Card
                key={t.id}
                className={`p-4 border-border/80 transition-all hover:border-primary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  t.status === "completed" ? "opacity-60 bg-muted/20" : "bg-card"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <button
                    onClick={() => toggleTaskStatus(t)}
                    className={`mt-0.5 sm:mt-0 h-5 w-5 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                      t.status === "completed"
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {t.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${getPriorityBadgeColor(t.priority)}`}>
                        {t.priority}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                        {getCategoryIcon(t.category)}
                        {t.category}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {t.estimated_time}m
                      </span>
                      {t.deadline && (
                        <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md border border-border/40">
                          <CalendarIcon className="h-3 w-3 text-primary" />
                          {new Date(t.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>

                    <h3 className={`text-sm font-bold font-heading line-clamp-1 ${t.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {t.title}
                    </h3>
                    {t.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedTask(t)}
                    className="rounded-xl text-xs font-bold gap-1.5 text-primary border-primary/20 hover:bg-primary/10 shadow-xs"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Resource
                  </Button>

                  <button
                    onClick={() => setDeleteTaskTarget(t)}
                    className="p-2 rounded-xl border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                    title="Delete Resource"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* AI RESOURCE VIEWER MODAL */}
      {selectedTask && (
        <AIResourceViewerModal
          task={selectedTask}
          onClose={handleCloseModal}
          onToggleComplete={(t) => toggleTaskStatus(t)}
        />
      )}

      {/* SINGLE TASK DELETE CONFIRMATION DIALOG */}
      {deleteTaskTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border/80 rounded-3xl p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg font-heading text-foreground">Delete Resource?</h3>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete this AI resource?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setDeleteTaskTarget(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteTask} isLoading={isDeleting} className="font-bold">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR ALL GENERATED RESOURCES CONFIRMATION DIALOG */}
      {isClearAllConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border/80 rounded-3xl p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg font-heading text-foreground">Clear All Generated Resources?</h3>
                <p className="text-xs text-muted-foreground">Classroom course content remains safe.</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This will permanently delete all AI-generated study resources, notes, quizzes, flashcards, mind maps, and study plans for your account.
              <br /><br />
              <strong className="text-foreground">Uploaded classroom materials (teacher PDFs, lecture slides, assignments, quizzes, announcements, and courses) must NOT be deleted.</strong>
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setIsClearAllConfirmOpen(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmClearAll} isLoading={isDeleting} className="font-bold">
                Clear All
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
export default PlannerPage
