import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  FolderKanban,
  Search,
  Star,
  Sparkles,
  FileText,
  BookOpen,
  Calendar,
  HelpCircle,
  Brain,
  Share2,
  Copy,
  Trash2,
  ExternalLink,
  Plus,
  Filter,
  Eye,
  Download,
  X,
  AlertTriangle,
  RotateCcw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/context/auth-context"
import { AIResourceRenderingEngine } from "@/components/planner/ai-resource-rendering-engine"

interface ArtifactItem {
  id: string
  user_id?: string
  mission_id?: string
  course_id?: string
  artifact_type: string
  title: string
  description?: string
  content_json?: any
  link_url?: string
  is_favorite: boolean
  created_at: string
  updated_at?: string
}

export const ArtifactsPage: React.FC = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { apiFetch } = useAuth()

  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "favorites" | "plans" | "notes" | "quizzes">("all")
  const [previewArtifact, setPreviewArtifact] = useState<ArtifactItem | null>(null)

  // Confirmation modal states
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchArtifacts = async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch("/api/v1/artifacts")
      if (res.ok) {
        const data = await res.json()
        setArtifacts(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchArtifacts()
  }, [])

  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await apiFetch(`/api/v1/artifacts/${id}/favorite`, {
        method: "POST"
      })
      if (res.ok) {
        showToast("Favorite status updated", "success")
        fetchArtifacts()
      }
    } catch (e) {
      showToast("Failed to update favorite", "error")
    }
  }

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await apiFetch(`/api/v1/artifacts/${id}/duplicate`, {
        method: "POST"
      })
      if (res.ok) {
        showToast("Artifact duplicated successfully", "success")
        fetchArtifacts()
      }
    } catch (e) {
      showToast("Failed to duplicate artifact", "error")
    }
  }

  const confirmDeleteSingle = async () => {
    if (!deleteTargetId) return
    setIsDeleting(true)
    try {
      const res = await apiFetch(`/api/v1/artifacts/${deleteTargetId}`, {
        method: "DELETE"
      })
      if (res.ok) {
        showToast("Resource deleted successfully.", "success")
        if (previewArtifact?.id === deleteTargetId) setPreviewArtifact(null)
        setDeleteTargetId(null)
        fetchArtifacts()
      }
    } catch (e) {
      showToast("Failed to delete resource", "error")
    } finally {
      setIsDeleting(false)
    }
  }

  const confirmClearAll = async () => {
    setIsDeleting(true)
    try {
      const res = await apiFetch("/api/v1/artifacts/clear-all", {
        method: "DELETE"
      })
      if (res.ok) {
        showToast("All generated resources have been cleared.", "success")
        setIsClearAllConfirmOpen(false)
        setPreviewArtifact(null)
        fetchArtifacts()
      }
    } catch (e) {
      showToast("Failed to clear resources", "error")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDownloadJson = (art: ArtifactItem, e: React.MouseEvent) => {
    e.stopPropagation()
    const content = JSON.stringify(art.content_json || { title: art.title, description: art.description }, null, 2)
    const blob = new Blob([content], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${art.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_artifact.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast("Artifact downloaded", "success")
  }

  const getIconForType = (type: string) => {
    switch (type.toUpperCase()) {
      case "STUDY_PLAN":
      case "ROADMAP":
        return <Calendar className="h-5 w-5 text-emerald-500" />
      case "NOTES":
      case "SUMMARY":
        return <FileText className="h-5 w-5 text-blue-500" />
      case "FLASHCARDS":
        return <Brain className="h-5 w-5 text-purple-500" />
      case "MOCK_TEST":
      case "QUIZ":
        return <HelpCircle className="h-5 w-5 text-amber-500" />
      default:
        return <Sparkles className="h-5 w-5 text-primary" />
    }
  }

  const filteredArtifacts = artifacts.filter(art => {
    const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (art.description && art.description.toLowerCase().includes(searchQuery.toLowerCase()))

    if (!matchesSearch) return false

    if (activeTab === "favorites") return art.is_favorite
    if (activeTab === "plans") return art.artifact_type.includes("PLAN") || art.artifact_type.includes("ROADMAP")
    if (activeTab === "notes") return art.artifact_type.includes("NOTES") || art.artifact_type.includes("SUMMARY") || art.artifact_type.includes("FLASHCARDS") || art.artifact_type.includes("LESSON") || art.artifact_type.includes("EXPLANATION")
    if (activeTab === "quizzes") return art.artifact_type.includes("QUIZ") || art.artifact_type.includes("TEST")

    return true
  })

  return (
    <div className="space-y-8 text-left max-w-7xl mx-auto pb-12 select-none">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 font-extrabold text-xs uppercase tracking-wider border border-purple-500/20">
              Persistent AI Artifact Engine & Library
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-heading text-foreground pt-1">
            Knowledge Artifacts ({artifacts.length})
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            View, search, edit, export, and manage all persistent AI deliverables generated across your missions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {artifacts.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setIsClearAllConfirmOpen(true)}
              className="font-bold text-xs gap-1.5 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Clear All Generated
            </Button>
          )}
          <Button onClick={() => navigate("/student/ai-workspace")} className="font-bold text-xs gap-1.5 rounded-xl shadow-xs">
            <Sparkles className="h-4 w-4" />
            Launch New Mission
          </Button>
        </div>
      </div>

      {/* SEARCH AND FILTER TABS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {[
            { id: "all", label: "All Deliverables" },
            { id: "favorites", label: "Starred Only" },
            { id: "plans", label: "Study Plans" },
            { id: "notes", label: "Notes & Flashcards" },
            { id: "quizzes", label: "Quizzes & Tests" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search artifacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/80 bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* ARTIFACTS GRID */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-bold text-muted-foreground">Loading Knowledge Artifacts...</p>
        </div>
      ) : filteredArtifacts.length === 0 ? (
        /* EMPTY STATE REQUIREMENT */
        <div className="py-16 text-center border-2 border-dashed border-border/80 rounded-3xl bg-muted/20 space-y-4 max-w-md mx-auto my-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FolderKanban className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold font-heading text-foreground">No AI resources generated yet.</h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "No artifacts match your search query." : "Launch an AI mission or generate a study plan to populate your knowledge library."}
            </p>
          </div>
          <Button
            onClick={() => navigate("/student/ai-workspace")}
            className="font-bold text-xs gap-2 rounded-xl shadow-md shadow-primary/20"
          >
            <Sparkles className="h-4 w-4" />
            Generate Your First Resource
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredArtifacts.map((art) => (
            <Card
              key={art.id}
              onClick={async () => {
                try {
                  const res = await apiFetch(`/api/v1/artifacts/${art.id}`)
                  if (res.ok) {
                    const fullArt = await res.json()
                    setPreviewArtifact(fullArt)
                  } else {
                    setPreviewArtifact(art)
                  }
                } catch (e) {
                  setPreviewArtifact(art)
                }
              }}
              className="hover-lift border-border/80 flex flex-col justify-between h-full cursor-pointer group"
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-3 rounded-2xl bg-muted/40 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {getIconForType(art.artifact_type)}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleToggleFavorite(art.id, e)}
                      className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground cursor-pointer transition-colors"
                      title={art.is_favorite ? "Starred" : "Star Artifact"}
                    >
                      <Star className={`h-3.5 w-3.5 ${art.is_favorite ? "fill-amber-400 text-amber-400" : ""}`} />
                    </button>
                    <button
                      onClick={(e) => handleDuplicate(art.id, e)}
                      className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTargetId(art.id) }}
                      className="p-1.5 rounded-lg border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                      title="Delete Resource"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-extrabold uppercase">
                      {art.artifact_type.replace("_", " ")}
                    </Badge>
                  </div>
                  <h3 className="font-extrabold text-base text-foreground font-heading line-clamp-1 group-hover:text-primary transition-colors">
                    {art.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {art.description || "AI-generated educational deliverable grounded in enrolled classroom data."}
                  </p>
                </div>
              </CardContent>

              <div className="px-6 py-3 border-t border-border/40 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{new Date(art.created_at).toLocaleDateString()}</span>
                <span className="font-bold text-primary flex items-center gap-1">
                  View Resource <ExternalLink className="h-3 w-3" />
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* PREVIEW ARTIFACT MODAL */}
      {previewArtifact && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border/80 rounded-3xl w-[96vw] max-w-[98vw] h-[92vh] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* MODAL HEADER (FIXED TOP) */}
            <div className="p-5 md:p-6 border-b border-border/60 flex items-center justify-between bg-muted/30 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                  {getIconForType(previewArtifact.artifact_type)}
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-foreground font-heading">{previewArtifact.title}</h2>
                  <p className="text-xs text-muted-foreground">{previewArtifact.artifact_type.replace("_", " ")} Deliverable</p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setPreviewArtifact(null)
                }}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer z-50 flex items-center justify-center min-w-[36px] min-h-[36px]"
                title="Close (Esc)"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 pointer-events-none" />
              </button>
            </div>

            {/* INDEPENDENTLY SCROLLABLE CONTENT BODY */}
            <div className="p-6 md:p-8 overflow-y-auto min-h-0 flex-1 bg-card space-y-6 pb-20 select-text">
              <AIResourceRenderingEngine
                content={previewArtifact.content_json || { markdown: previewArtifact.description || previewArtifact.title }}
                artifactType={previewArtifact.artifact_type}
                title={previewArtifact.title}
                description={previewArtifact.description}
              />
            </div>

            {/* MODAL FOOTER (FIXED BOTTOM) */}
            <div className="p-4 border-t border-border/60 bg-muted/30 flex items-center justify-between shrink-0">
              <Button variant="outline" size="sm" onClick={(e) => handleDownloadJson(previewArtifact, e)} className="rounded-xl text-xs gap-1">
                <Download className="h-3.5 w-3.5" /> Download JSON
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPreviewArtifact(null)} className="rounded-xl text-xs font-bold">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE RESOURCE DELETE CONFIRMATION DIALOG */}
      {deleteTargetId && (
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
              <Button variant="ghost" onClick={() => setDeleteTargetId(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteSingle} isLoading={isDeleting} className="font-bold">
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
export default ArtifactsPage
