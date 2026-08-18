import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  FileText,
  Brain,
  HelpCircle,
  Calendar,
  Sparkles,
  ExternalLink,
  Download,
  Copy,
  CheckCircle2,
  X,
  RefreshCw,
  Rocket,
  BookOpen,
  Cpu,
  Layers,
  Printer,
  FileDown,
  Search,
  MessageSquare,
  AlertCircle,
  Share2,
  Bookmark
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/context/auth-context"
import { AIResourceRenderingEngine } from "@/components/planner/ai-resource-rendering-engine"

export interface TaskResourceItem {
  id: string
  title: string
  description?: string
  priority: string
  category: string
  status: string
  estimated_time: number
  deadline?: string | null
  artifact_id?: string | null
  mission_id?: string | null
  course_id?: string | null
  resource_type?: string | null
  resource_status?: "generated" | "generating" | "unavailable" | string
  resource_url?: string | null
}

interface ArtifactDetail {
  id: string
  title: string
  description?: string
  artifact_type: string
  content_json?: any
  link_url?: string
  created_at: string
}

interface AIResourceViewerModalProps {
  task: TaskResourceItem
  onClose: () => void
  onToggleComplete: (task: TaskResourceItem) => void
  onContinueMission?: () => void
}

export const AIResourceViewerModal: React.FC<AIResourceViewerModalProps> = ({
  task,
  onClose,
  onToggleComplete,
  onContinueMission
}) => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { apiFetch } = useAuth()

  const [artifact, setArtifact] = useState<ArtifactDetail | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false)
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false)

  const fetchArtifact = async () => {
    const targetId = task.artifact_id || task.id
    if (!targetId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await apiFetch(`/api/v1/artifacts/${targetId}`)
      if (res.ok) {
        const data = await res.json()
        setArtifact(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchArtifact()
  }, [task.artifact_id, task.id])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const handleDownloadJson = () => {
    if (!artifact) return
    const content = JSON.stringify(artifact.content_json || { title: artifact.title, description: artifact.description }, null, 2)
    const blob = new Blob([content], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${artifact.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_resource.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast("AI Resource downloaded", "success")
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    showToast("Resource link copied to clipboard", "success")
  }

  const handleAskAI = () => {
    onClose()
    navigate("/student/ai-workspace", {
      state: {
        prefillPrompt: `Explain this resource in detail: ${artifact?.title || task.title}`,
        contextArtifactId: artifact?.id || task.artifact_id
      }
    })
  }

  const handleRegenerateResource = async () => {
    setIsRegenerating(true)
    try {
      const res = await apiFetch("/api/v1/planner/generate", {
        method: "POST"
      })
      if (res.ok) {
        showToast("Regenerating AI Study Resource...", "success")
        fetchArtifact()
      } else {
        showToast("Failed to regenerate resource", "error")
      }
    } catch (e) {
      showToast("Error regenerating resource", "error")
    } finally {
      setIsRegenerating(false)
    }
  }

  const getIconForType = (type?: string) => {
    const t = (type || task.resource_type || "NOTES").toUpperCase()
    if (t.includes("PLAN") || t.includes("ROADMAP")) return <Calendar className="h-5 w-5 text-emerald-500" />
    if (t.includes("FLASHCARD")) return <Brain className="h-5 w-5 text-purple-500" />
    if (t.includes("QUIZ") || t.includes("TEST")) return <HelpCircle className="h-5 w-5 text-amber-500" />
    return <FileText className="h-5 w-5 text-blue-500" />
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-card border border-border/80 rounded-3xl w-[96vw] max-w-[98vw] h-[92vh] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* MODAL HEADER (FIXED TOP) */}
        <div className="p-5 md:p-6 border-b border-border/60 flex items-center justify-between bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              {getIconForType(artifact?.artifact_type || task.resource_type || undefined)}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-extrabold uppercase tracking-wider">
                  {(artifact?.artifact_type || task.resource_type || task.category).replace("_", " ")}
                </Badge>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  Google Gemini AI Engine
                </span>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  Live Classroom Sync
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-foreground font-heading line-clamp-1">
                {artifact?.title || task.title}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`rounded-xl ${isBookmarked ? "text-amber-500" : "text-muted-foreground"}`}
              title="Bookmark Resource"
            >
              <Bookmark className="h-4 w-4 fill-current" />
            </Button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onClose()
              }}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer z-50 flex items-center justify-center min-w-[36px] min-h-[36px]"
              title="Close (Esc)"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 pointer-events-none" />
            </button>
          </div>
        </div>

        {/* METADATA & ACTION BAR (FIXED TOP) */}
        <div className="px-6 py-2.5 bg-muted/20 border-b border-border/40 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground font-medium shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Course Context: Enrolled Classroom Data
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-purple-500" />
              Source: Lecture PDFs & RAG Retrieval
            </span>
            {artifact && (
              <span>Generated: {new Date(artifact.created_at).toLocaleString()}</span>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAskAI}
              className="rounded-xl text-[11px] font-bold gap-1 text-primary hover:bg-primary/10"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Ask AI About This
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="rounded-xl text-[11px] gap-1"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
          </div>
        </div>

        {/* INDEPENDENTLY SCROLLABLE CONTENT BODY */}
        <div className="p-6 md:p-8 overflow-y-auto min-h-0 flex-1 bg-card space-y-6 pb-20 select-text">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs font-bold text-muted-foreground">Synthesizing & Rendering AI Resource...</p>
            </div>
          ) : !artifact && !task.artifact_id ? (
            /* EMPTY / UNAVAILABLE RESOURCE STATE WITH REGENERATE ACTION */
            <div className="p-12 text-center border-2 border-dashed border-border/80 rounded-3xl bg-muted/20 space-y-4 max-w-md mx-auto my-8">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground font-heading">This resource is unavailable</h3>
                <p className="text-xs text-muted-foreground">
                  The generated artifact for this task was not found in the database. You can generate a fresh version using your classroom materials.
                </p>
              </div>
              <Button
                onClick={handleRegenerateResource}
                isLoading={isRegenerating}
                className="font-bold gap-2 rounded-xl shadow-md shadow-primary/20"
              >
                <Sparkles className="h-4 w-4" />
                Regenerate Resource
              </Button>
            </div>
          ) : (
            <AIResourceRenderingEngine
              content={artifact ? artifact.content_json : { markdown: task.description || task.title }}
              artifactType={artifact ? artifact.artifact_type : (task.resource_type || task.category)}
              title={artifact ? artifact.title : task.title}
              description={artifact ? artifact.description : task.description}
            />
          )}
        </div>

        {/* MODAL FOOTER & ACTIONS (FIXED BOTTOM) */}
        <div className="p-4 border-t border-border/60 bg-muted/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant={task.status === "completed" ? "outline" : "primary"}
              size="sm"
              onClick={() => onToggleComplete(task)}
              className="rounded-xl text-xs font-bold gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              {task.status === "completed" ? "Completed" : "Mark Complete"}
            </Button>

            {onContinueMission && (
              <Button
                variant="outline"
                size="sm"
                onClick={onContinueMission}
                className="rounded-xl text-xs font-bold gap-1.5"
              >
                <Rocket className="h-4 w-4 text-purple-600" />
                Continue Mission
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {artifact && (
              <Button variant="ghost" size="sm" onClick={handleDownloadJson} className="rounded-xl text-xs gap-1 text-muted-foreground">
                <Download className="h-3.5 w-3.5" /> Download JSON
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl text-xs font-bold">
              Close
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
