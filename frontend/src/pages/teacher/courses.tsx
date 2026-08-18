import React, { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { 
  BookOpen, 
  Plus, 
  Key, 
  Copy, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  MoreVertical,
  Edit,
  Archive,
  Trash2,
  AlertTriangle
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/context/auth-context"

interface CourseItem {
  id: string
  title: string
  description?: string
  thumbnail_url?: string
  teacher_id: string
  visibility: string
  status?: string
  join_code?: string
  is_join_enabled: boolean
}

export const TeacherCoursesPage: React.FC = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user, apiFetch } = useAuth()
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  // Dropdown menu state
  const [activeMenuCourseId, setActiveMenuCourseId] = useState<string | null>(null)

  // Create course form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  // Edit course state
  const [editCourse, setEditCourse] = useState<CourseItem | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editVisibility, setEditVisibility] = useState("public")
  const [isEditing, setIsEditing] = useState(false)

  // Delete course state
  const [deleteCourseTarget, setDeleteCourseTarget] = useState<CourseItem | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchCourses = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch("/api/v1/courses")
      if (res.ok) {
        const data = await res.json()
        setCourses(data)
      } else {
        const err = await res.json().catch(() => ({}))
        console.error("[TeacherCourses] fetchCourses failed:", res.status, err)
      }
    } catch (e) {
      console.error("[TeacherCourses] fetchCourses error:", e)
    } finally {
      setIsLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsCreating(true)
    try {
      const res = await apiFetch("/api/v1/courses", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          visibility: "public"
        })
      })

      if (res.ok) {
        const newCourse = await res.json()
        showToast(`Course '${newCourse.title}' created with Join Code: ${newCourse.join_code}`, "success")
        setIsModalOpen(false)
        setTitle("")
        setDescription("")
        fetchCourses()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || "Failed to create course", "error")
      }
    } catch (e: any) {
      showToast(e.message || "Error creating course", "error")
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpenEdit = (course: CourseItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenuCourseId(null)
    setEditCourse(course)
    setEditTitle(course.title)
    setEditDescription(course.description || "")
    setEditVisibility(course.visibility || "public")
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editCourse || !editTitle.trim()) return

    setIsEditing(true)
    try {
      const res = await apiFetch(`/api/v1/courses/${editCourse.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
          visibility: editVisibility
        })
      })

      if (res.ok) {
        showToast("Course details updated successfully!", "success")
        setEditCourse(null)
        fetchCourses()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || "Failed to update course", "error")
      }
    } catch (e) {
      showToast("Failed to update course", "error")
    } finally {
      setIsEditing(false)
    }
  }

  const handleArchiveCourse = async (course: CourseItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenuCourseId(null)
    try {
      const res = await apiFetch(`/api/v1/courses/${course.id}/archive`, {
        method: "POST"
      })

      if (res.ok) {
        const data = await res.json()
        showToast(data.message, "info")
        fetchCourses()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || "Failed to toggle archive status", "error")
      }
    } catch (e) {
      showToast("Failed to archive course", "error")
    }
  }

  const handleOpenDelete = (course: CourseItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenuCourseId(null)
    setDeleteCourseTarget(course)
    setDeleteConfirmText("")
  }

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deleteCourseTarget || deleteConfirmText !== "DELETE") return

    setIsDeleting(true)
    try {
      const res = await apiFetch(`/api/v1/courses/${deleteCourseTarget.id}`, {
        method: "DELETE"
      })

      if (res.ok) {
        const data = await res.json()
        showToast(data.message || "Course permanently deleted.", "success")
        setDeleteCourseTarget(null)
        setDeleteConfirmText("")
        fetchCourses()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || "Failed to delete course", "error")
      }
    } catch (e) {
      showToast("Failed to delete course", "error")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCopyCode = (code?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!code) return
    navigator.clipboard.writeText(code)
    showToast(`Join Code "${code}" copied to clipboard!`, "success")
  }

  const handleRegenerateCode = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await apiFetch(`/api/v1/courses/${courseId}/regenerate-code`, {
        method: "POST"
      })

      if (res.ok) {
        const data = await res.json()
        showToast(`New join code generated: ${data.join_code}. Old code invalidated!`, "success")
        fetchCourses()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || "Failed to regenerate join code", "error")
      }
    } catch (e) {
      showToast("Failed to regenerate join code", "error")
    }
  }

  const handleToggleJoin = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await apiFetch(`/api/v1/courses/${courseId}/toggle-join`, {
        method: "POST"
      })

      if (res.ok) {
        const data = await res.json()
        showToast(data.message, "info")
        fetchCourses()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || "Failed to toggle join status", "error")
      }
    } catch (e) {
      showToast("Failed to toggle join status", "error")
    }
  }

  return (
    <div className="space-y-8 text-left max-w-7xl mx-auto pb-12 select-none" onClick={() => setActiveMenuCourseId(null)}>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider border border-amber-500/20">
              Teacher Course Manager
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-heading text-foreground pt-1">
            Courses You Teach ({courses.length})
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Manage course settings, edit syllabus, archive completed classes, and delete old courses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setIsModalOpen(true)} className="font-bold text-xs gap-1.5 rounded-xl shadow-xs">
            <Plus className="h-4 w-4" />
            Create New Course
          </Button>
        </div>
      </div>

      {/* COURSES LIST */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-card/40 border border-border/40 animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 px-4 bg-card/40 border border-border/60 rounded-3xl space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mx-auto border border-amber-500/20">
            <BookOpen className="h-7 w-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-foreground">No active courses</h3>
            <p className="text-xs text-muted-foreground">
              Create your first course to auto-generate a student join code and publish lecture materials.
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} size="sm" className="font-bold text-xs gap-1.5 rounded-xl">
            <Plus className="h-4 w-4" />
            Create Course
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c) => (
            <Card
              key={c.id}
              className={`group relative rounded-2xl border ${c.status === "ARCHIVED" ? "border-amber-500/30 bg-muted/20 opacity-80" : "border-border/80 bg-card"} hover:border-amber-500/40 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between`}
              onClick={() => navigate(`/teacher/courses/${c.id}`)}
            >
              <CardHeader className="p-5 pb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    {c.status === "ARCHIVED" && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-extrabold uppercase">
                        Archived (Read-Only)
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 relative">
                    <button
                      onClick={(e) => handleToggleJoin(c.id, e)}
                      className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border cursor-pointer transition-colors"
                      title="Toggle Code Activation"
                    >
                      {c.is_join_enabled ? (
                        <span className="text-emerald-600 bg-emerald-500/10 border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="text-red-600 bg-red-500/10 border-red-500/20 flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Disabled
                        </span>
                      )}
                    </button>

                    {/* THREE-DOT MENU BUTTON */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveMenuCourseId(activeMenuCourseId === c.id ? null : c.id)
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                      title="Course Options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {/* DROPDOWN MENU */}
                    {activeMenuCourseId === c.id && (
                      <div className="absolute right-0 top-8 z-30 w-44 rounded-xl border border-border bg-card shadow-xl p-1 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                        <button
                          onClick={(e) => handleOpenEdit(c, e)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-amber-500/10 hover:text-amber-600 font-bold transition-colors text-left"
                        >
                          <Edit className="h-3.5 w-3.5 text-amber-500" />
                          Edit Course
                        </button>
                        <button
                          onClick={(e) => handleArchiveCourse(c, e)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted font-bold text-muted-foreground hover:text-foreground transition-colors text-left"
                        >
                          <Archive className="h-3.5 w-3.5" />
                          {c.status === "ARCHIVED" ? "Unarchive Course" : "Archive Course"}
                        </button>
                        <div className="border-t border-border/50 my-1" />
                        <button
                          onClick={(e) => handleOpenDelete(c, e)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-600 font-bold transition-colors text-left"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Course
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <CardTitle className="text-base font-bold text-foreground line-clamp-1 group-hover:text-amber-600 transition-colors font-heading">
                    {c.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                    {c.description || "Classroom course. Upload lecture PDFs and publish quizzes."}
                  </CardDescription>
                </div>
              </CardHeader>

              {/* JOIN CODE BOX */}
              <div className="px-5 py-3 bg-muted/40 border-y border-border/40 flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">Student Join Code</span>
                  <div className="text-sm font-extrabold font-mono tracking-widest text-primary flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-amber-500" />
                    {c.join_code || "PENDING"}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleCopyCode(c.join_code, e)}
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                    title="Copy Join Code"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleRegenerateCode(c.id, e)}
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-amber-600"
                    title="Regenerate Code (Invalidates Old Code)"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <CardContent className="p-4 bg-card flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  Official Educator Syllabus
                </span>
                <Button variant="ghost" size="sm" className="text-xs font-bold text-amber-600 gap-1">
                  Manage Course
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE COURSE DIALOG MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent isOpen={isModalOpen}>
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
            <DialogDescription>
              Create a new course. StudyOS will automatically generate a unique 6–8 character uppercase join code for your students.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCourse} className="space-y-4 pt-2">
            <Input
              label="Course Title"
              type="text"
              placeholder="e.g. Natural Language Processing (NLP-701)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-foreground">Course Description</label>
              <textarea
                rows={3}
                placeholder="Course syllabus overview, topics covered, and prerequisites..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-border bg-card p-3 text-xs font-medium placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isCreating} disabled={!title.trim()}>
                Create Course
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT COURSE DIALOG MODAL */}
      <Dialog open={!!editCourse} onOpenChange={(open) => !open && setEditCourse(null)}>
        <DialogContent isOpen={!!editCourse}>
          <DialogHeader>
            <DialogTitle>Edit Course Details</DialogTitle>
            <DialogDescription>
              Update the title, syllabus description, or visibility for this course.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <Input
              label="Course Title"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
            />

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-foreground">Course Description</label>
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full rounded-xl border border-border bg-card p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-foreground">Course Visibility</label>
              <select
                value={editVisibility}
                onChange={(e) => setEditVisibility(e.target.value)}
                className="w-full rounded-xl border border-border bg-card p-2.5 text-xs font-bold focus:outline-none"
              >
                <option value="public">Public (Discoverable via Join Code)</option>
                <option value="private">Private (Restricted Access)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setEditCourse(null)} disabled={isEditing}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isEditing} disabled={!editTitle.trim()}>
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE COURSE STRICT CONFIRMATION MODAL */}
      <Dialog open={!!deleteCourseTarget} onOpenChange={(open) => !open && setDeleteCourseTarget(null)}>
        <DialogContent isOpen={!!deleteCourseTarget}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-red-600 font-extrabold">Permanently Delete Course</DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-xs text-muted-foreground space-y-2">
              <p className="font-bold text-foreground">
                Deleting <span className="text-red-600">"{deleteCourseTarget?.title}"</span> will permanently remove:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-red-600 font-semibold pl-2">
                <li>Lecture PDFs & Materials</li>
                <li>Assignments & Student Submissions</li>
                <li>Quizzes & Grades</li>
                <li>Announcements & Discussion Threads</li>
                <li>Student Enrollments & AI Classroom Context</li>
              </ul>
              <p className="text-xs font-bold pt-1 text-foreground">
                This action cannot be undone. To confirm, please type <span className="font-mono bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded font-extrabold">DELETE</span> below:
              </p>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmDelete} className="space-y-4 pt-2">
            <Input
              type="text"
              placeholder="Type DELETE to confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="font-mono font-bold tracking-widest text-red-600 border-red-500/30"
              autoFocus
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setDeleteCourseTarget(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                variant="destructive"
                isLoading={isDeleting}
                disabled={deleteConfirmText !== "DELETE"}
                className="bg-red-600 hover:bg-red-700 font-bold"
              >
                Permanently Delete Course
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
export default TeacherCoursesPage
