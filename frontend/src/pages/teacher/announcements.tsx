import React, { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Megaphone,
  Plus,
  Send,
  MessageSquare,
  Trash2,
  Edit2,
  Clock,
  BookOpen,
  Loader2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useAuth } from "@/context/auth-context"

interface Course {
  id: string
  title: string
  code?: string
}

interface CommentItem {
  id: string
  author_id: string
  author_name: string
  author_role: string
  content: string
  created_at: string
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

const PRIORITY_BADGES = {
  normal: { label: "Normal", variant: "secondary" as const, color: "bg-muted text-muted-foreground" },
  important: { label: "Important", variant: "primary" as const, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  urgent: { label: "Urgent", variant: "destructive" as const, color: "bg-red-500/10 text-red-600 border-red-500/20" }
}

export const TeacherAnnouncementsPage: React.FC = () => {
  const { showToast } = useToast()
  const { apiFetch } = useAuth()

  const [courses, setCourses] = useState<Course[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<"normal" | "important" | "urgent">("normal")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Comments State
  const [activeCommentsAnnId, setActiveCommentsAnnId] = useState<string | null>(null)
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentItem[]>>({})
  const [newCommentText, setNewCommentText] = useState("")
  const [isCommenting, setIsCommenting] = useState(false)

  // Fetch Teacher's Courses and Announcements
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [coursesRes, annRes] = await Promise.all([
        apiFetch("/api/v1/courses"),
        apiFetch("/api/v1/announcements")
      ])
      
      let fetchedCourses: Course[] = []
      if (coursesRes.ok) {
        fetchedCourses = await coursesRes.json()
        setCourses(fetchedCourses)
        if (fetchedCourses.length > 0 && !selectedCourseId) {
          setSelectedCourseId(fetchedCourses[0].id)
        }
      }

      if (annRes.ok) {
        const annData = await annRes.json()
        setAnnouncements(annData || [])
      }
    } catch (err: any) {
      showToast("Failed to load announcements", "error")
    } finally {
      setIsLoading(false)
    }
  }, [apiFetch, selectedCourseId, showToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleOpenCreateModal = () => {
    setEditingId(null)
    setTitle("")
    setDescription("")
    setPriority("normal")
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id)
    }
    setIsDialogOpen(true)
  }

  const handleOpenEditModal = (ann: AnnouncementItem) => {
    setEditingId(ann.id)
    setSelectedCourseId(ann.course_id)
    setTitle(ann.title)
    setDescription(ann.description || "")
    setPriority(ann.priority || "normal")
    setIsDialogOpen(true)
  }

  const handleSubmitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourseId || !title.trim()) {
      showToast("Please select a course and enter a title.", "error")
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        course_id: selectedCourseId,
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
        fetchData()
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
        fetchData()
      } else {
        const errData = await res.json().catch(() => ({}))
        showToast(errData.detail || "Failed to delete announcement", "error")
      }
    } catch (err: any) {
      showToast("Failed to delete announcement", "error")
    }
  }

  // Comments toggling and posting
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

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
            <Megaphone className="h-3.5 w-3.5" /> Course Announcements
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-heading">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Publish course updates, exam notifications, and assignments directly to your students.
          </p>
        </div>

        <Button onClick={handleOpenCreateModal} className="font-bold gap-2 shadow-sm rounded-xl shrink-0">
          <Plus className="h-4 w-4" /> Publish Announcement
        </Button>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading">
              {editingId ? "Edit Announcement" : "Create New Course Announcement"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Broadcast an announcement to all students enrolled in your course.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAnnouncement} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Select Course</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.code || "Course"})
                  </option>
                ))}
              </select>
            </div>

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
                placeholder="Type your detailed course announcement here..."
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

      {/* Main List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 rounded-2xl bg-muted/40 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border/80 bg-gradient-to-b from-card to-muted/20 rounded-3xl space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
            <Megaphone className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold font-heading text-foreground">No Announcements Published Yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Create your first course announcement to notify enrolled students about syllabus updates, exam dates, or deadlines.
            </p>
          </div>
          <Button onClick={handleOpenCreateModal} className="font-bold text-xs gap-2 rounded-xl">
            <Plus className="h-4 w-4" /> Create Announcement
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => {
            const pBadge = PRIORITY_BADGES[ann.priority] || PRIORITY_BADGES.normal
            const isCommentsOpen = activeCommentsAnnId === ann.id
            const comments = commentsMap[ann.id] || []

            return (
              <Card key={ann.id} className="overflow-hidden border border-border/70 shadow-xs rounded-2xl transition-all">
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-bold text-[10px] bg-primary/5 text-primary border-primary/20">
                          <BookOpen className="h-3 w-3 mr-1" /> {ann.course_name}
                        </Badge>
                        <Badge variant={pBadge.variant} className={`font-bold text-[10px] ${pBadge.color}`}>
                          {pBadge.label}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {new Date(ann.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <CardTitle className="text-lg font-bold font-heading pt-1 text-foreground">
                        {ann.title}
                      </CardTitle>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(ann)} className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteAnnouncement(ann.id)} className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4">
                  {ann.description && (
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line bg-muted/30 p-3.5 rounded-xl border border-border/40">
                      {ann.description}
                    </p>
                  )}

                  {/* Actions & Comment Counter */}
                  <div className="flex items-center justify-between border-t border-border/50 pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleComments(ann.id)}
                      className="font-bold text-xs gap-2 rounded-xl text-primary hover:bg-primary/10"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Discussion ({ann.comment_count || comments.length})
                    </Button>
                  </div>

                  {/* Comments Accordion */}
                  <AnimatePresence>
                    {isCommentsOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 pt-2 border-t border-border/40"
                      >
                        <h4 className="text-xs font-bold text-foreground">Student & Teacher Discussion</h4>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {comments.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic py-2">No comments yet. Students can join the discussion here.</p>
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

                        {/* Comment Input */}
                        <div className="flex items-center gap-2 pt-1">
                          <Input
                            placeholder="Write a response as teacher..."
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
          })}
        </div>
      )}
    </div>
  )
}
