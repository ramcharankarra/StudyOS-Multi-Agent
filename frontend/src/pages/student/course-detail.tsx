import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  BookOpen,
  FileText,
  ClipboardList,
  HelpCircle,
  BarChart3,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  Bot,
  AlertCircle,
  FileType,
  Video,
  Image as ImageIcon,
  File,
  Megaphone,
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Edit2,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ProgressBar } from "@/components/ui/progress-bar"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { EmptyState } from "@/components/ui/empty-state"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/context/auth-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

// ─── Types ───────────────────────────────────────────────────────────

interface CourseDetail {
  id: string
  title: string
  description?: string
  thumbnail_url?: string
  teacher_id: string
  visibility: string
  status: string
  join_code?: string
  is_join_enabled: boolean
  created_at: string
  updated_at: string
}

interface AnnouncementItem {
  id: string
  title: string
  description: string
  priority: "normal" | "important" | "urgent"
  course_id: string
  course_name: string
  teacher_name: string
  comment_count: number
  created_at: string
}

interface CommentItem {
  id: string
  author_id: string
  author_name: string
  author_role: string
  content: string
  created_at: string
}

interface MaterialItem {
  id: string
  course_id: string
  title: string
  description?: string
  file_url: string
  file_type: string
  file_size?: number
  uploaded_by: string
  processing_status?: string
  created_at: string
}

interface AssignmentItem {
  id: string
  course_id: string
  title: string
  description?: string
  deadline?: string
  created_at: string
}

interface QuizItem {
  id: string
  course_id: string
  title: string
  description?: string
  created_by: string
  created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  } catch {
    return iso
  }
}

function getFileIcon(fileType: string) {
  const t = fileType.toUpperCase()
  if (t === "PDF") return FileText
  if (t === "VIDEO") return Video
  if (t === "IMAGE") return ImageIcon
  if (["PPT", "PPTX"].includes(t)) return FileType
  return File
}

function getFileTypeBadgeVariant(fileType: string): "primary" | "success" | "warning" | "secondary" | "accent" {
  const t = fileType.toUpperCase()
  if (t === "PDF") return "primary"
  if (t === "VIDEO") return "accent"
  if (t === "IMAGE") return "success"
  if (["PPT", "PPTX", "DOC", "DOCX"].includes(t)) return "warning"
  return "secondary"
}

// ─── Component ───────────────────────────────────────────────────────

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user, apiFetch } = useAuth()

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [materials, setMaterials] = useState<MaterialItem[]>([])
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [quizzes, setQuizzes] = useState<QuizItem[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])

  const [isLoadingCourse, setIsLoadingCourse] = useState(true)
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true)
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true)
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true)
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Teacher Stream Creation State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<"normal" | "important" | "urgent">("normal")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Comments State for Stream
  const [activeCommentsAnnId, setActiveCommentsAnnId] = useState<string | null>(null)
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentItem[]>>({})
  const [newCommentText, setNewCommentText] = useState("")
  const [isCommenting, setIsCommenting] = useState(false)

  // ── Fetch course announcements ─────────────────────────────────────
  const fetchAnnouncements = useCallback(async () => {
    if (!courseId) return
    setIsLoadingAnnouncements(true)
    try {
      const res = await apiFetch(`/api/v1/announcements?course_id=${courseId}`)
      if (res.ok) {
        const data = await res.json()
        setAnnouncements(data || [])
      }
    } catch (e) {
      console.error("[CourseDetail] fetchAnnouncements error:", e)
    } finally {
      setIsLoadingAnnouncements(false)
    }
  }, [courseId, apiFetch])

  // ── Fetch course details ───────────────────────────────────────────
  const fetchCourse = useCallback(async () => {
    if (!courseId) return
    setIsLoadingCourse(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/v1/courses/${courseId}`)
      if (res.ok) {
        const data = await res.json()
        setCourse(data)
      } else {
        const err = await res.json().catch(() => ({}))
        setError(err.detail || "Failed to load course details.")
      }
    } catch (e) {
      setError("Network error loading course.")
    } finally {
      setIsLoadingCourse(false)
    }
  }, [courseId, apiFetch])

  // ── Fetch course materials ─────────────────────────────────────────
  const fetchMaterials = useCallback(async () => {
    if (!courseId) return
    setIsLoadingMaterials(true)
    try {
      const res = await apiFetch(`/api/v1/materials/course/${courseId}`)
      if (res.ok) {
        const data = await res.json()
        setMaterials(data)
      }
    } catch (e) {
      console.error("[CourseDetail] fetchMaterials error:", e)
    } finally {
      setIsLoadingMaterials(false)
    }
  }, [courseId, apiFetch])

  // ── Fetch course assignments ───────────────────────────────────────
  const fetchAssignments = useCallback(async () => {
    if (!courseId) return
    setIsLoadingAssignments(true)
    try {
      const res = await apiFetch(`/api/v1/assignments/course/${courseId}`)
      if (res.ok) {
        const data = await res.json()
        setAssignments(data)
      }
    } catch (e) {
      console.error("[CourseDetail] fetchAssignments error:", e)
    } finally {
      setIsLoadingAssignments(false)
    }
  }, [courseId, apiFetch])

  // ── Fetch course quizzes ───────────────────────────────────────────
  const fetchQuizzes = useCallback(async () => {
    if (!courseId) return
    setIsLoadingQuizzes(true)
    try {
      const res = await apiFetch(`/api/v1/quizzes/course/${courseId}`)
      if (res.ok) {
        const data = await res.json()
        setQuizzes(data)
      }
    } catch (e) {
      console.error("[CourseDetail] fetchQuizzes error:", e)
    } finally {
      setIsLoadingQuizzes(false)
    }
  }, [courseId, apiFetch])

  useEffect(() => {
    fetchCourse()
    fetchAnnouncements()
    fetchMaterials()
    fetchAssignments()
    fetchQuizzes()
  }, [fetchCourse, fetchAnnouncements, fetchMaterials, fetchAssignments, fetchQuizzes])

  const toggleComments = async (annId: string) => {
    if (activeCommentsAnnId === annId) {
      setActiveCommentsAnnId(null)
      return
    }

    setActiveCommentsAnnId(annId)
    try {
      const res = await apiFetch(`/api/v1/announcements/${annId}/comments`)
      if (res.ok) {
        const comments = await res.json()
        setCommentsMap((prev) => ({ ...prev, [annId]: comments || [] }))
      }
    } catch (err: any) {
      showToast("Failed to load discussion comments", "error")
    }
  }

  const handlePostComment = async (annId: string) => {
    if (!newCommentText.trim()) return

    try {
      setIsCommenting(true)
      const res = await apiFetch(`/api/v1/announcements/${annId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: newCommentText.trim() })
      })

      if (res.ok) {
        const newComment = await res.json()
        setCommentsMap((prev) => ({
          ...prev,
          [annId]: [...(prev[annId] || []), newComment]
        }))
        setNewCommentText("")
        showToast("Comment posted", "success")
      } else {
        const errData = await res.json().catch(() => ({}))
        showToast(errData.detail || "Failed to post comment", "error")
      }
    } catch (err: any) {
      showToast("Failed to post comment", "error")
    } finally {
      setIsCommenting(false)
    }
  }

  const handleOpenCreateModal = () => {
    setEditingId(null)
    setTitle("")
    setDescription("")
    setPriority("normal")
    setIsDialogOpen(true)
  }

  const handleOpenEditModal = (ann: AnnouncementItem) => {
    setEditingId(ann.id)
    setTitle(ann.title)
    setDescription(ann.description || "")
    setPriority(ann.priority || "normal")
    setIsDialogOpen(true)
  }

  const handleSubmitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId || !title.trim()) {
      showToast("Please enter an announcement title.", "error")
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        course_id: courseId,
        title: title.trim(),
        description: description.trim(),
        priority
      }

      let res: Response
      if (editingId) {
        res = await apiFetch(`/api/v1/announcements/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        })
      } else {
        res = await apiFetch("/api/v1/announcements", {
          method: "POST",
          body: JSON.stringify(payload)
        })
      }

      if (res.ok) {
        showToast(editingId ? "Announcement updated!" : "Announcement published successfully!", "success")
        setIsDialogOpen(false)
        fetchAnnouncements()
      } else {
        const errData = await res.json().catch(() => ({}))
        showToast(errData.detail || "Failed to save announcement", "error")
      }
    } catch (err: any) {
      showToast("Failed to save announcement", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return

    try {
      const res = await apiFetch(`/api/v1/announcements/${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        showToast("Announcement deleted", "info")
        fetchAnnouncements()
      } else {
        const errData = await res.json().catch(() => ({}))
        showToast(errData.detail || "Failed to delete announcement", "error")
      }
    } catch (err: any) {
      showToast("Failed to delete announcement", "error")
    }
  }

  // ── Progress computation ───────────────────────────────────────────
  const progress = useMemo(() => {
    const totalMaterials = materials.length
    const totalAssignments = assignments.length
    const totalQuizzes = quizzes.length
    const totalItems = totalMaterials + totalAssignments + totalQuizzes

    // Progress is based on available content count — a starting baseline
    // Real completion tracking would require submission/attempt records per student
    return {
      totalMaterials,
      totalAssignments,
      totalQuizzes,
      totalItems,
      overallPercent: totalItems > 0 ? Math.min(Math.round((totalMaterials / Math.max(totalItems, 1)) * 30), 100) : 0
    }
  }, [materials, assignments, quizzes])

  // ── Loading state ──────────────────────────────────────────────────
  if (isLoadingCourse) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none">
        <div className="h-8 w-48 rounded-lg bg-muted/40 animate-pulse" />
        <div className="h-40 rounded-2xl bg-card/40 border border-border/40 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-card/40 border border-border/40 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────
  if (error || !course) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 select-none">
        <div className="p-4 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Course Not Found</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {error || "The course you're looking for doesn't exist or you don't have access."}
        </p>
        <Button onClick={() => navigate("/student/courses")} className="gap-2 mt-2">
          <ArrowLeft className="h-4 w-4" /> Back to Courses
        </Button>
      </div>
    )
  }

  // ── Skeleton for tab content ───────────────────────────────────────
  const TabSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 rounded-xl bg-card/40 border border-border/40 animate-pulse" />
      ))}
    </div>
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none text-left">

      {/* ── BACK NAVIGATION ─────────────────────────────────────── */}
      <button
        onClick={() => navigate("/student/courses")}
        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back to Courses
      </button>

      {/* ── COURSE HEADER CARD ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="rounded-2xl border border-border/80 bg-card overflow-hidden">
          <CardHeader className="p-6 pb-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-heading text-foreground leading-tight">
                    {course.title}
                  </h1>
                  {course.description && (
                    <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                      {course.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Enrolled
                </Badge>
                <Badge variant={course.status === "ACTIVE" ? "primary" : "warning"}>
                  {course.status}
                </Badge>
              </div>
            </div>

            {/* Course Meta Row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground pt-1 border-t border-border/40">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Joined {formatDate(course.created_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                {materials.length} Material{materials.length !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" />
                {assignments.length} Assignment{assignments.length !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5" />
                {quizzes.length} Quiz{quizzes.length !== 1 ? "zes" : ""}
              </span>
            </div>
          </CardHeader>

          {/* Progress Bar */}
          <CardContent className="px-6 pb-5 pt-0">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>Course Progress</span>
                <span>{progress.overallPercent}%</span>
              </div>
              <ProgressBar value={progress.overallPercent} variant="success" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── TABBED CONTENT ──────────────────────────────────────── */}
      <Tabs defaultValue="stream" className="w-full">
        <TabsList className="w-full md:w-auto flex-wrap">
          <TabsTrigger value="stream" className="gap-1.5 text-xs font-bold">
            <Megaphone className="h-3.5 w-3.5" /> Stream / Announcements ({announcements.length})
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-1.5 text-xs font-bold">
            <FileText className="h-3.5 w-3.5" /> Materials ({materials.length})
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-1.5 text-xs font-bold">
            <ClipboardList className="h-3.5 w-3.5" /> Assignments ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="gap-1.5 text-xs font-bold">
            <HelpCircle className="h-3.5 w-3.5" /> Quizzes ({quizzes.length})
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-1.5 text-xs font-bold">
            <BookOpen className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
        </TabsList>

        {/* ── STREAM / ANNOUNCEMENTS TAB ───────────────────────────── */}
        <TabsContent value="stream">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Teacher Publish Announcement Action */}
            {user?.role === "teacher" && (
              <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Megaphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Post a Stream Announcement</h3>
                    <p className="text-xs text-muted-foreground">Broadcast exam details, homework reminders, or syllabus updates to enrolled students.</p>
                  </div>
                </div>
                <Button onClick={handleOpenCreateModal} className="font-bold text-xs gap-1.5 rounded-xl shadow-xs shrink-0">
                  <Plus className="h-4 w-4" /> Publish Announcement
                </Button>
              </div>
            )}

            {isLoadingAnnouncements ? (
              <TabSkeleton />
            ) : announcements.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-border/80 bg-gradient-to-b from-card to-muted/20 rounded-3xl space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                  <Megaphone className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold font-heading text-foreground">No Stream Announcements Yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    {user?.role === "teacher"
                      ? "Publish your first announcement for this course syllabus."
                      : "Your course instructor has not posted stream announcements for this class yet."}
                  </p>
                </div>
                {user?.role === "teacher" && (
                  <Button onClick={handleOpenCreateModal} className="font-bold text-xs gap-2 rounded-xl">
                    <Plus className="h-4 w-4" /> Create Announcement
                  </Button>
                )}
              </Card>
            ) : (
              announcements.map((ann) => {
                const isCommentsOpen = activeCommentsAnnId === ann.id
                const comments = commentsMap[ann.id] || []

                return (
                  <Card key={ann.id} className="overflow-hidden border border-border/70 shadow-xs rounded-2xl transition-all">
                    <CardHeader className="p-5 pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-bold text-[10px] bg-primary/5 text-primary border-primary/20">
                              <BookOpen className="h-3 w-3 mr-1" /> {ann.course_name}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {new Date(ann.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <CardTitle className="text-lg font-bold font-heading pt-1 text-foreground">
                            {ann.title}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground font-medium">By {ann.teacher_name}</p>
                        </div>

                        {user?.role === "teacher" && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(ann)} className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteAnnouncement(ann.id)} className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-1 space-y-4">
                      {ann.description && (
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line bg-muted/30 p-3.5 rounded-xl border border-border/40">
                          {ann.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between border-t border-border/50 pt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleComments(ann.id)}
                          className="font-bold text-xs gap-2 rounded-xl text-primary hover:bg-primary/10"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Classroom Discussion ({ann.comment_count || comments.length})
                        </Button>
                      </div>

                      <AnimatePresence>
                        {isCommentsOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 pt-2 border-t border-border/40"
                          >
                            <h4 className="text-xs font-bold text-foreground">Classroom Discussion</h4>

                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {comments.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic py-2">No comments yet. Reply to join the course discussion!</p>
                              ) : (
                                comments.map((c) => (
                                  <div key={c.id} className="p-3 rounded-xl bg-background border border-border/60 text-xs space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-bold text-foreground flex items-center gap-1.5">
                                        {c.author_name}
                                        <Badge variant="secondary" className="text-[9px] py-0 font-bold capitalize">
                                          {c.author_role}
                                        </Badge>
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <p className="text-foreground/90 leading-relaxed">{c.content}</p>
                                  </div>
                                ))
                              )}
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <Input
                                placeholder="Ask a question or reply to stream..."
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handlePostComment(ann.id)}
                                className="text-xs rounded-xl h-9"
                              />
                              <Button
                                size="sm"
                                onClick={() => handlePostComment(ann.id)}
                                disabled={isCommenting || !newCommentText.trim()}
                                className="h-9 px-3 font-bold rounded-xl gap-1 shrink-0"
                              >
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </motion.div>
        </TabsContent>

        {/* ── OVERVIEW TAB ──────────────────────────────────────── */}
        <TabsContent value="overview">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {/* Materials Summary Card */}
            <Card className="rounded-xl border border-border/80 bg-card hover:border-primary/30 transition-colors">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-foreground">{materials.length}</p>
                  <p className="text-xs font-bold text-muted-foreground">Learning Materials</p>
                </div>
              </CardContent>
            </Card>

            {/* Assignments Summary Card */}
            <Card className="rounded-xl border border-border/80 bg-card hover:border-amber-500/30 transition-colors">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-foreground">{assignments.length}</p>
                  <p className="text-xs font-bold text-muted-foreground">Assignments</p>
                </div>
              </CardContent>
            </Card>

            {/* Quizzes Summary Card */}
            <Card className="rounded-xl border border-border/80 bg-card hover:border-emerald-500/30 transition-colors">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-foreground">{quizzes.length}</p>
                  <p className="text-xs font-bold text-muted-foreground">Quizzes</p>
                </div>
              </CardContent>
            </Card>

            {/* Course Info Card */}
            <Card className="rounded-xl border border-border/80 bg-card md:col-span-2 lg:col-span-3">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-bold text-foreground">Course Information</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-3">
                    <div>
                      <span className="font-bold text-muted-foreground block mb-0.5">Course Name</span>
                      <span className="font-semibold text-foreground">{course.title}</span>
                    </div>
                    <div>
                      <span className="font-bold text-muted-foreground block mb-0.5">Description</span>
                      <span className="font-medium text-foreground leading-relaxed">
                        {course.description || "No description provided."}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="font-bold text-muted-foreground block mb-0.5">Visibility</span>
                      <Badge variant={course.visibility === "public" ? "success" : "warning"} className="text-[10px]">
                        {course.visibility.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-bold text-muted-foreground block mb-0.5">Status</span>
                      <Badge variant={course.status === "ACTIVE" ? "primary" : "warning"} className="text-[10px]">
                        {course.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-bold text-muted-foreground block mb-0.5">Created</span>
                      <span className="font-medium text-foreground">{formatDate(course.created_at)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ── MATERIALS TAB ─────────────────────────────────────── */}
        <TabsContent value="materials">
          {isLoadingMaterials ? (
            <TabSkeleton />
          ) : materials.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={FileText}
                title="No Materials Yet"
                description="Your instructor hasn't uploaded any learning materials for this course yet."
              />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {materials.map((mat) => {
                const FileIcon = getFileIcon(mat.file_type)
                return (
                  <Card
                    key={mat.id}
                    className="rounded-xl border border-border/80 bg-card hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-primary/5 text-primary border border-primary/10 shrink-0">
                        <FileIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-bold text-foreground truncate">{mat.title}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={getFileTypeBadgeVariant(mat.file_type)} className="text-[10px]">
                            {mat.file_type.toUpperCase()}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {formatFileSize(mat.file_size)}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            • {formatDate(mat.created_at)}
                          </span>
                        </div>
                        {mat.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{mat.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs font-bold rounded-lg"
                          onClick={() => {
                            if (mat.file_url) {
                              window.open(mat.file_url, "_blank", "noopener,noreferrer")
                            } else {
                              showToast("File URL not available", "error")
                            }
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs font-bold rounded-lg text-muted-foreground"
                          onClick={() => {
                            if (mat.file_url) {
                              const link = document.createElement("a")
                              link.href = mat.file_url
                              link.download = mat.title || "download"
                              link.click()
                            }
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </motion.div>
          )}
        </TabsContent>

        {/* ── ASSIGNMENTS TAB ───────────────────────────────────── */}
        <TabsContent value="assignments">
          {isLoadingAssignments ? (
            <TabSkeleton />
          ) : assignments.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={ClipboardList}
                title="No Assignments Yet"
                description="No assignments have been created for this course yet."
              />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {assignments.map((asn) => (
                <Card
                  key={asn.id}
                  className="rounded-xl border border-border/80 bg-card hover:border-amber-500/30 hover:shadow-sm transition-all"
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-bold text-foreground truncate">{asn.title}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {asn.deadline ? (
                          <Badge variant="warning" className="text-[10px] gap-1">
                            <Clock className="h-3 w-3" />
                            Due {formatDate(asn.deadline)}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">No Deadline</Badge>
                        )}
                        <span className="text-[11px] text-muted-foreground font-medium">
                          Posted {formatDate(asn.created_at)}
                        </span>
                      </div>
                      {asn.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{asn.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}
        </TabsContent>

        {/* ── QUIZZES TAB ───────────────────────────────────────── */}
        <TabsContent value="quizzes">
          {isLoadingQuizzes ? (
            <TabSkeleton />
          ) : quizzes.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={HelpCircle}
                title="No Quizzes Yet"
                description="No quizzes have been created for this course yet."
              />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {quizzes.map((qz) => (
                <Card
                  key={qz.id}
                  className="rounded-xl border border-border/80 bg-card hover:border-emerald-500/30 hover:shadow-sm transition-all"
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                      <HelpCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-bold text-foreground truncate">{qz.title}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="success" className="text-[10px]">Quiz</Badge>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          Created {formatDate(qz.created_at)}
                        </span>
                      </div>
                      {qz.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{qz.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}
        </TabsContent>

        {/* ── PROGRESS TAB ──────────────────────────────────────── */}
        <TabsContent value="progress">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Overall Progress */}
            <Card className="rounded-xl border border-border/80 bg-card">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-bold text-foreground">Overall Course Progress</CardTitle>
                <CardDescription className="text-xs">
                  Track your learning progress across all course content.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <ProgressBar value={progress.overallPercent} variant="success" showLabel />
              </CardContent>
            </Card>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="rounded-xl border border-border/80 bg-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                        <FileText className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-foreground">Materials</span>
                    </div>
                    <span className="text-lg font-extrabold text-foreground">{progress.totalMaterials}</span>
                  </div>
                  <ProgressBar
                    value={progress.totalItems > 0 ? (progress.totalMaterials / progress.totalItems) * 100 : 0}
                    variant="primary"
                  />
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {progress.totalMaterials} material{progress.totalMaterials !== 1 ? "s" : ""} available
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-xl border border-border/80 bg-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                        <ClipboardList className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-foreground">Assignments</span>
                    </div>
                    <span className="text-lg font-extrabold text-foreground">{progress.totalAssignments}</span>
                  </div>
                  <ProgressBar
                    value={progress.totalItems > 0 ? (progress.totalAssignments / progress.totalItems) * 100 : 0}
                    variant="primary"
                  />
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {progress.totalAssignments} assignment{progress.totalAssignments !== 1 ? "s" : ""} available
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-xl border border-border/80 bg-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                        <HelpCircle className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-foreground">Quizzes</span>
                    </div>
                    <span className="text-lg font-extrabold text-foreground">{progress.totalQuizzes}</span>
                  </div>
                  <ProgressBar
                    value={progress.totalItems > 0 ? (progress.totalQuizzes / progress.totalItems) * 100 : 0}
                    variant="primary"
                  />
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {progress.totalQuizzes} quiz{progress.totalQuizzes !== 1 ? "zes" : ""} available
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* ── ASK MINDOS FLOATING ACTION BUTTON ───────────────────── */}
      <motion.div
        className="fixed bottom-6 right-6 z-40"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 20 }}
      >
        <Button
          onClick={() => navigate(`/student/ai-assistant?course_id=${courseId}`)}
          className="h-12 px-5 rounded-full shadow-lg shadow-primary/25 gap-2 font-bold text-xs bg-gradient-to-r from-primary to-primary/80 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
        >
          <Bot className="h-4.5 w-4.5" />
          Ask MindOS
        </Button>
      </motion.div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading">
              {editingId ? "Edit Stream Announcement" : "Post Stream Announcement"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Broadcast an announcement to all students enrolled in this course syllabus.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAnnouncement} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Announcement Title</label>
              <Input
                placeholder="e.g. Midterm Exam Details & Schedule"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Priority Level</label>
              <div className="flex gap-2">
                {(["normal", "important", "urgent"] as const).map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={priority === p ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setPriority(p)}
                    className="capitalize font-bold text-xs flex-1 rounded-xl"
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Message / Content</label>
              <Textarea
                placeholder="Type your detailed course stream message..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="rounded-xl text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl font-bold gap-2">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Save Changes" : "Publish Announcement"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CourseDetailPage
