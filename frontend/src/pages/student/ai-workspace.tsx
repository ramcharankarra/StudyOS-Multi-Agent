import React, { useState, useEffect, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Rocket, 
  Sparkles, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  BrainCircuit, 
  FileText, 
  Calendar, 
  HelpCircle, 
  Target, 
  ArrowRight,
  BookOpen,
  Plus,
  Flame,
  Award,
  Zap,
  ChevronRight
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { MissionExecutionModal } from "@/components/mission/mission-execution-modal"
import { ContextInspector } from "@/components/ai/context-inspector"
import { useAuth } from "@/context/auth-context"

interface MissionItem {
  id: string
  goal: string
  status: string
  progress_pct: number
  estimated_time: string
  target_role: string
  tasks_count: number
  artifacts_count: number
  created_at: string
}

interface WorkspaceInputBoxProps {
  onExecute: (goal: string) => void
  isExecuting: boolean
}

const WorkspaceInputBox: React.FC<WorkspaceInputBoxProps> = React.memo(({ onExecute, isExecuting }) => {
  const [text, setText] = useState("")

  const handleSubmit = useCallback(() => {
    if (!text.trim() || isExecuting) return
    onExecute(text)
    setText("")
  }, [text, isExecuting, onExecute])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  return (
    <div className="relative rounded-2xl bg-card border border-border/80 p-2 shadow-lg focus-within:ring-2 focus-within:ring-primary/30 transition-all">
      <textarea
        rows={3}
        placeholder="Type your educational objective (e.g. 'Prepare me for NLP exam in 10 days and help me score above 90%')..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isExecuting}
        className="w-full px-4 py-3 bg-transparent text-sm md:text-base font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none"
      />

      <div className="flex items-center justify-between pt-2 border-t border-border/40 px-3 pb-1">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>Press Enter to submit • Shift+Enter for new line</span>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!text.trim() || isExecuting}
          isLoading={isExecuting}
          size="lg"
          className="font-extrabold gap-2 rounded-xl shadow-md shadow-primary/20 bg-gradient-to-r from-primary via-amber-500 to-emerald-500 text-white border-0 cursor-pointer"
        >
          <Rocket className="h-5 w-5" />
          {isExecuting ? "Executing..." : "🚀 Launch Mission"}
        </Button>
      </div>
    </div>
  )
})

export const AIWorkspacePage: React.FC = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user, apiFetch } = useAuth()

  const [missions, setMissions] = useState<MissionItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isExecuting, setIsExecuting] = useState<boolean>(false)

  // Selected mission modal state
  const [selectedMission, setSelectedMission] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  // Fetch recent missions
  const fetchMissions = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await apiFetch("/api/v1/missions")
      if (res.ok) {
        const data = await res.json()
        setMissions(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    fetchMissions()
  }, [fetchMissions])

  // Live polling for selected mission details while execution is running
  const selectedMissionId = selectedMission?.id
  useEffect(() => {
    if (!isModalOpen || !selectedMissionId) return

    let isMounted = true
    let intervalId: any = null

    const pollMission = async () => {
      try {
        const res = await apiFetch(`/api/v1/missions/${selectedMissionId}`)
        if (res.ok && isMounted) {
          const updated = await res.json()
          setSelectedMission(updated)

          const allTasksCompleted = updated.tasks && updated.tasks.length > 0 && updated.tasks.every((t: any) => t.status === "completed")
          const hasArtifacts = updated.artifacts && updated.artifacts.length > 0
          const isFullyDone = updated.status === "completed" && updated.progress_pct === 100 && allTasksCompleted && hasArtifacts

          if (isFullyDone) {
            fetchMissions()
            if (intervalId) clearInterval(intervalId)
          }
        }
      } catch (e) {
        console.error("Polling error:", e)
      }
    }

    // Initial immediate fetch upon opening modal
    pollMission()

    intervalId = setInterval(() => {
      if (isMounted) pollMission()
    }, 1500)

    return () => {
      isMounted = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [isModalOpen, selectedMissionId, apiFetch, fetchMissions])

  const [searchParams] = useSearchParams()
  const activeCourseId = searchParams.get("course_id")

  // Execute Goal Mission
  const handleExecuteMission = useCallback(async (goalToExecute?: string) => {
    if (!goalToExecute?.trim() || isExecuting) return

    setIsExecuting(true)

    try {
      const res = await apiFetch("/api/v1/missions/execute", {
        method: "POST",
        body: JSON.stringify({
          goal: goalToExecute,
          course_id: activeCourseId || undefined
        })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || `Mission execution failed (${res.status})`)
      }

      const data = await res.json()
      showToast("Autonomous AI Mission launched!", "success")
      
      const detailRes = await apiFetch(`/api/v1/missions/${data.mission_id}`)
      if (detailRes.ok) {
        const detailData = await detailRes.json()
        setSelectedMission(detailData)
        setIsModalOpen(true)
      }

      fetchMissions()

    } catch (err: any) {
      showToast(err.message || "Failed to execute mission", "error")
    } finally {
      setIsExecuting(false)
    }
  }, [apiFetch, fetchMissions, isExecuting, showToast])

  const openMissionDetails = async (missionId: string) => {
    try {
      const res = await apiFetch(`/api/v1/missions/${missionId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedMission(data)
        setIsModalOpen(true)
      }
    } catch (e) {
      showToast("Failed to load mission details", "error")
    }
  }

  const SUGGESTED_MISSIONS = user?.role === "teacher" ? [
    { title: "Create Complete Course", goal: "Create a complete Deep Learning course for third-year students." },
    { title: "Generate Quiz & Rubrics", goal: "Generate a midterm quiz and evaluation rubric for Chapter 3." },
    { title: "Student Performance Report", goal: "Evaluate my students and identify weak learners requiring revision." },
    { title: "Generate Lecture Notes", goal: "Generate comprehensive lecture notes and slide outlines for Machine Learning." }
  ] : [
    { title: "Prepare for Exam", goal: "Prepare me for NLP exam in 10 days. Target score 95%." },
    { title: "Generate Revision Pack", goal: "Generate revision notes, key formulas, and flashcards for Data Structures." },
    { title: "Create Study Roadmap", goal: "Create a 6-week structured study roadmap with daily missions." },
    { title: "Generate 100 Mock Questions", goal: "Generate 100 practice questions and a mock test with explanations." }
  ]

  return (
    <div className="space-y-8 text-left select-none max-w-7xl mx-auto pb-12">
      
      {/* ======================================================== */}
      {/* HERO PROMPT SECTION: AI WORKSPACE MISSION CONTROL         */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-amber-500/10 to-emerald-500/5 border border-primary/20 p-8 md:p-10 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-extrabold text-xs uppercase tracking-wider border border-primary/20">
                StudyOS V2 — Autonomous AI OS
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-heading text-foreground pt-1">
              What would you like StudyOS to accomplish today?
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Describe your goal. StudyOS will automatically plan, execute, and organize everything for you.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => navigate("/student/courses")} className="font-bold text-xs gap-1.5">
              <BookOpen className="h-4 w-4" />
              Browse Courses
            </Button>
          </div>
        </div>

        {/* AI Workspace Context Inspector — Classroom Brain */}
        <ContextInspector />

        {/* Workspace Input Component — Smooth Isolated Typing UX */}
        <WorkspaceInputBox onExecute={handleExecuteMission} isExecuting={isExecuting} />

        {/* Quick Goal Preset Buttons */}
        <div className="space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Quick Preset Missions:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SUGGESTED_MISSIONS.map((sp, idx) => (
              <div
                key={idx}
                onClick={() => handleExecuteMission(sp.goal)}
                className="p-3.5 rounded-2xl border border-border/60 bg-card/80 hover:bg-card hover:border-primary/40 cursor-pointer transition-all hover-lift space-y-1"
              >
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span className="truncate">{sp.title}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{sp.goal}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RECENT MISSIONS SECTION                                   */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight font-heading">Recent Autonomous Missions</h2>
            <p className="text-xs text-muted-foreground">Workflows executed by the AI swarm with ready-to-use artifacts</p>
          </div>

          <Button variant="outline" size="sm" onClick={fetchMissions} className="font-bold text-xs gap-1.5">
            Refresh Missions
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 rounded-2xl bg-muted/40 animate-pulse border border-border/40" />
            ))}
          </div>
        ) : missions.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-border/80 bg-gradient-to-b from-card to-muted/20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary mb-4 shadow-sm">
              <Rocket className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold font-heading mb-1">No missions yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
              Give your AI Team a goal and it will start working.
            </p>
            <Button
              onClick={() => {
                const el = document.querySelector('textarea')
                if (el) el.focus()
              }}
              className="font-bold gap-2"
            >
              <Rocket className="h-4 w-4" />
              Launch First Mission
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {missions.map((m) => {
              const isDone = m.status === "completed"

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card
                    onClick={() => openMissionDetails(m.id)}
                    className="hover-lift border-border/80 cursor-pointer h-full flex flex-col justify-between"
                  >
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full border text-[10px] uppercase font-extrabold ${
                          isDone 
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/25"
                            : "bg-amber-500/15 text-amber-600 border-amber-500/25 animate-pulse"
                        }`}>
                          {isDone ? "Completed Workflow" : "Running Task"}
                        </span>
                        <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {m.estimated_time}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-base font-heading text-foreground line-clamp-2">{m.goal}</h4>
                        <p className="text-xs text-muted-foreground">
                          {m.tasks_count} Subtasks • {m.artifacts_count} Artifacts Generated
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1 pt-2 border-t border-border/40">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-primary font-heading">{m.progress_pct}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${m.progress_pct}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Mission Execution & Artifact Detail Modal */}
      <MissionExecutionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mission={selectedMission}
      />

    </div>
  )
}
export default AIWorkspacePage
