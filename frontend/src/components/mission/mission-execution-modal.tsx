import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { 
  Rocket, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  FileText, 
  Calendar, 
  HelpCircle, 
  BrainCircuit, 
  Sparkles,
  ArrowRight,
  Target,
  X,
  Star,
  Share2,
  ListFilter,
  UserCheck,
  ShieldCheck,
  ExternalLink
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface MissionTask {
  id: string
  task_name: string
  agent_name: string
  status: string
  step_order: number
  output_summary?: string
}

interface MissionLog {
  id: string
  timestamp: string
  message: string
  type: string
}

interface MissionArtifact {
  id: string
  artifact_type: string
  title: string
  description?: string
  content_json?: any
  link_url?: string
  is_favorite?: boolean
}

interface MissionDetail {
  id: string
  goal: string
  description?: string
  status: string
  priority?: string
  progress_pct: number
  estimated_time: string
  created_at: string
  started_at?: string
  completed_at?: string
  tasks: MissionTask[]
  logs?: MissionLog[]
  artifacts: MissionArtifact[]
}

interface MissionExecutionModalProps {
  isOpen: boolean
  onClose: () => void
  mission: MissionDetail | null
}

const ARTIFACT_ICONS: Record<string, React.ReactNode> = {
  STUDY_PLAN: <Calendar className="h-5 w-5 text-primary" />,
  FLASHCARDS: <Sparkles className="h-5 w-5 text-amber-500" />,
  MOCK_TEST: <HelpCircle className="h-5 w-5 text-emerald-500" />,
  PRACTICE_QUESTIONS: <BrainCircuit className="h-5 w-5 text-violet-500" />,
  REVISION_CALENDAR: <Target className="h-5 w-5 text-red-500" />,
  NOTES: <FileText className="h-5 w-5 text-blue-500" />,
}

export const MissionExecutionModal: React.FC<MissionExecutionModalProps> = ({
  isOpen,
  onClose,
  mission
}) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<"timeline" | "logs" | "artifacts">("timeline")

  if (!isOpen || !mission) return null

  const allTasksDone = mission.tasks.length > 0 && mission.tasks.every(t => t.status === "completed")
  const isCompleted = mission.status === "completed" && allTasksDone && mission.progress_pct === 100

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-[94vw] max-w-[95vw] h-[92vh] max-h-[94vh] bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative text-left"
      >
        {/* Top Bar Header */}
        <div className="p-6 border-b border-border/40 bg-card flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="h-14 w-14 rounded-3xl bg-gradient-to-tr from-primary via-amber-500 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <Rocket className="h-7 w-7" />
            </div>

            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-extrabold border ${
                  isCompleted 
                    ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/25"
                    : "bg-amber-500/15 text-amber-600 border-amber-500/25 animate-pulse"
                }`}>
                  {isCompleted ? "Completed Mission" : "Planning & Execution"}
                </span>

                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold uppercase border border-border/50">
                  Priority: {mission.priority || "normal"}
                </span>

                <span className="text-xs text-muted-foreground flex items-center gap-1 font-semibold ml-auto sm:ml-0">
                  <Clock className="h-3.5 w-3.5" />
                  ETA: {mission.estimated_time}
                </span>
              </div>

              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight font-heading text-foreground truncate">
                {mission.goal}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-all shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Main Body (Content + Sidebar) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border/40">
          
          {/* Main Execution Column (8 cols) */}
          <div className="lg:col-span-8 p-6 space-y-6">
            
            {/* Animated Execution Progress Gauge */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Execution Progress</span>
                <span className="text-primary font-heading text-base">{mission.progress_pct}%</span>
              </div>
              <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${mission.progress_pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-primary via-amber-500 to-emerald-500"
                />
              </div>
            </div>

            {/* Content Tabs */}
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              {[
                { id: "timeline", label: "Execution Timeline" },
                { id: "logs", label: `Activity Feed (${mission.logs?.length || 0})` },
                { id: "artifacts", label: `Artifacts (${mission.artifacts.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Execution Timeline */}
            {activeTab === "timeline" && (
              <div className="space-y-3">
                {mission.tasks.map((task, idx) => {
                  const isTaskDone = task.status === "completed"
                  const isTaskRunning = task.status === "running"

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between transition-all ${
                        isTaskDone
                          ? "bg-muted/20 border-border/60 text-foreground"
                          : isTaskRunning
                          ? "bg-primary/10 border-primary/40 text-primary shadow-xs"
                          : "bg-muted/10 border-border/40 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          {isTaskDone ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : isTaskRunning ? (
                            <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground/60" />
                          )}
                        </div>
                        <span className="font-bold font-heading">{task.task_name}</span>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-lg bg-background border border-border/60 text-[10px] font-bold text-muted-foreground flex items-center gap-1.5">
                        {task.agent_name}
                        {isTaskDone && <span className="text-emerald-500 font-extrabold">✓</span>}
                        {isTaskRunning && <span className="text-amber-500 font-extrabold animate-pulse">⟳</span>}
                        {!isTaskDone && !isTaskRunning && <span className="text-muted-foreground">pending</span>}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* Tab 2: Activity Logs Feed */}
            {activeTab === "logs" && (
              <div className="space-y-2 font-mono text-xs">
                {mission.logs && mission.logs.length > 0 ? (
                  mission.logs.map((log) => (
                    <div key={log.id} className="p-2.5 rounded-xl border border-border/50 bg-muted/20 flex items-center gap-3 text-left">
                      <span className="text-[10px] text-muted-foreground font-bold shrink-0">{log.timestamp}</span>
                      <span className={`font-medium text-xs ${log.type === "success" ? "text-emerald-600 font-bold" : "text-foreground/90"}`}>
                        {log.message}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-6">No execution logs recorded yet.</p>
                )}
              </div>
            )}

            {/* Tab 3: Generated Artifacts Hub */}
            {activeTab === "artifacts" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {mission.artifacts.map((art) => (
                  <Card
                    key={art.id}
                    onClick={() => {
                      if (art.link_url) {
                        onClose()
                        navigate(art.link_url)
                      }
                    }}
                    className="hover-lift border-border/80 cursor-pointer p-4 transition-all bg-card hover:bg-muted/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-2xl bg-muted/50 border border-border/60 shrink-0">
                        {ARTIFACT_ICONS[art.artifact_type] || <Sparkles className="h-5 w-5 text-primary" />}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <h4 className="font-bold text-xs font-heading text-foreground truncate">{art.title}</h4>
                        {art.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed font-sans">{art.description}</p>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                            Open Artifact <ExternalLink className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

          </div>

          {/* Right Sidebar Column (4 cols) */}
          <div className="lg:col-span-4 p-6 space-y-5 bg-muted/10 text-xs">
            <h3 className="font-extrabold uppercase tracking-wider text-muted-foreground text-[10px] font-heading">
              Mission Information
            </h3>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-card border border-border/60 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Estimated Completion</span>
                <p className="font-bold text-foreground">{mission.estimated_time}</p>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/60 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Created Date</span>
                <p className="font-bold text-foreground">{new Date(mission.created_at).toLocaleString()}</p>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/60 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Priority Level</span>
                <p className="font-bold text-foreground capitalize">{mission.priority || "Normal"}</p>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/60 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Target Artifacts</span>
                <p className="font-bold text-foreground">{mission.artifacts.length} Artifacts Generated</p>
              </div>
            </div>

            {isCompleted && (
              <Button
                onClick={() => {
                  onClose()
                  const teachingLesson = mission.artifacts.find((a: any) => a.artifact_type === "TEACHING_LESSON")
                    || mission.artifacts.find((a: any) => a.artifact_type === "NOTES" || a.artifact_type === "EXPLANATION")
                  const studyPlan = mission.artifacts.find((a: any) => a.artifact_type === "STUDY_PLAN")
                  
                  if (teachingLesson) {
                    navigate(`/student/planner?artifact_id=${teachingLesson.id}&mission_id=${mission.id}`)
                  } else if (studyPlan) {
                    navigate(`/student/planner?mission_id=${mission.id}`)
                  } else if (mission.artifacts.length > 0 && mission.artifacts[0].link_url) {
                    navigate(mission.artifacts[0].link_url)
                  } else {
                    navigate("/student/planner")
                  }
                }}
                className="w-full font-bold gap-2 shadow-md shadow-primary/20 bg-gradient-to-r from-primary via-amber-500 to-emerald-500 text-white cursor-pointer"
              >
                Start Learning
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>

        </div>

      </motion.div>
    </div>
  )
}
export default MissionExecutionModal
