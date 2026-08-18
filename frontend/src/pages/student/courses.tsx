import React, { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { BookOpen, Plus, Key, ArrowRight, CheckCircle2, MoreVertical, LogOut, AlertTriangle } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/context/auth-context"

interface CourseItem {
  id: string
  title: string
  description?: string
  thumbnail_url?: string
  teacher_id: string
  join_code?: string
  is_join_enabled: boolean
}

export const StudentCoursesPage: React.FC = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { apiFetch } = useAuth()

  const [courses, setCourses] = useState<CourseItem[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [courseCode, setCourseCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  // Menu and Leave state
  const [activeMenuCourseId, setActiveMenuCourseId] = useState<string | null>(null)
  const [leaveTarget, setLeaveTarget] = useState<CourseItem | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)

  const fetchEnrolledCourses = useCallback(async () => {
    setIsFetching(true)
    try {
      const res = await apiFetch("/api/v1/courses/enrolled")
      if (res.ok) {
        const data = await res.json()
        setCourses(data)
      } else {
        const err = await res.json().catch(() => ({}))
        console.error("[StudentCourses] fetchEnrolledCourses failed:", res.status, err)
      }
    } catch (e) {
      console.error("[StudentCourses] fetchEnrolledCourses error:", e)
    } finally {
      setIsFetching(false)
    }
  }, [apiFetch])

  useEffect(() => {
    fetchEnrolledCourses()
  }, [fetchEnrolledCourses])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = courseCode.trim().toUpperCase()
    if (!cleanCode) return

    setIsLoading(true)
    try {
      const res = await apiFetch("/api/v1/courses/join", {
        method: "POST",
        body: JSON.stringify({ code: cleanCode })
      })

      const data = await res.json()

      if (!res.ok) {
        showToast(data.detail || "Invalid course code. Please check the code provided by your instructor.", "error")
      } else {
        showToast(data.message || `Successfully joined course!`, "success")
        setIsModalOpen(false)
        setCourseCode("")
        fetchEnrolledCourses()
      }
    } catch (e: any) {
      showToast("Network error joining course", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenLeave = (course: CourseItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenuCourseId(null)
    setLeaveTarget(course)
  }

  const handleConfirmLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leaveTarget) return

    setIsLeaving(true)
    try {
      const res = await apiFetch(`/api/v1/courses/${leaveTarget.id}/leave`, {
        method: "DELETE"
      })

      if (res.ok) {
        const data = await res.json()
        showToast(data.message || "Left course successfully.", "info")
        setLeaveTarget(null)
        fetchEnrolledCourses()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || "Failed to leave course", "error")
      }
    } catch (e) {
      showToast("Failed to leave course", "error")
    } finally {
      setIsLeaving(false)
    }
  }

  return (
    <div className="space-y-8 text-left max-w-7xl mx-auto pb-12 select-none" onClick={() => setActiveMenuCourseId(null)}>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider border border-primary/20">
              Enrolled Classrooms
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-heading text-foreground pt-1">
            Classroom Courses ({courses.length})
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Join courses using unique teacher-generated codes to access lecture materials, assignments, and quizzes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setIsModalOpen(true)} className="font-bold text-xs gap-1.5 rounded-xl shadow-xs">
            <Key className="h-4 w-4" />
            Enter Join Code
          </Button>
        </div>
      </div>

      {/* COURSES GRID / EMPTY STATE */}
      {isFetching ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-card/40 border border-border/40 animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6 my-8">
          <EmptyState
            icon={BookOpen}
            title="No Courses Joined Yet"
            description="Enter a valid 6-8 character join code provided by your instructor to join your classroom."
            actionLabel="Join Course with Code"
            onAction={() => setIsModalOpen(true)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="group relative rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between"
              onClick={() => navigate(`/student/courses/${course.id}`)}
            >
              <CardHeader className="p-5 pb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <BookOpen className="h-5 w-5" />
                  </div>

                  <div className="flex items-center gap-1.5 relative">
                    <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Enrolled
                    </span>

                    {/* THREE-DOT MENU BUTTON */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveMenuCourseId(activeMenuCourseId === course.id ? null : course.id)
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                      title="Course Options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {/* DROPDOWN MENU */}
                    {activeMenuCourseId === course.id && (
                      <div className="absolute right-0 top-8 z-30 w-44 rounded-xl border border-border bg-card shadow-xl p-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                        <button
                          onClick={(e) => handleOpenLeave(course, e)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-600 font-bold transition-colors text-left"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Leave Course
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <CardTitle className="text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {course.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                    {course.description || "Classroom course materials, lecture slides, and AI study tools."}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-3 border-t border-border/40 bg-muted/20 flex items-center justify-between">
                <span className="text-[11px] font-bold text-muted-foreground">
                  Official Course ID
                </span>

                <Button variant="ghost" size="sm" className="text-xs font-bold text-primary gap-1">
                  View Course
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* JOIN COURSE DIALOG POPUP */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent isOpen={isModalOpen}>
          <DialogHeader>
            <DialogTitle>Join Course with Code</DialogTitle>
            <DialogDescription>
              Enter the unique 6–8 uppercase alphanumeric join code generated by your instructor (e.g. NLP7KQ8).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleJoin} className="space-y-4 pt-2">
            <Input
              label="Course Join Code"
              type="text"
              placeholder="e.g. NLP7KQ8"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
              required
              autoFocus
              className="uppercase tracking-widest font-mono text-sm"
            />
            
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isLoading} disabled={!courseCode.trim()}>
                Join Course
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* STUDENT LEAVE COURSE CONFIRMATION DIALOG */}
      <Dialog open={!!leaveTarget} onOpenChange={(open) => !open && setLeaveTarget(null)}>
        <DialogContent isOpen={!!leaveTarget}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-red-600 font-extrabold">Leave Course</DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-xs text-muted-foreground space-y-2">
              <p className="font-bold text-foreground">
                Are you sure you want to leave <span className="text-red-600">"{leaveTarget?.title}"</span>?
              </p>
              <p className="text-xs font-semibold text-foreground">
                You will lose access to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-red-600 font-semibold pl-2">
                <li>Lecture PDFs & Materials</li>
                <li>Assignments & Quizzes</li>
                <li>Announcements</li>
                <li>AI Classroom Context & Study Plans</li>
              </ul>
              <p className="text-[11px] text-muted-foreground pt-1 italic">
                * Note: Leaving the course will not delete your previously submitted work.
              </p>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmLeave} className="flex justify-end gap-3 pt-4">
            <Button variant="outline" size="sm" type="button" onClick={() => setLeaveTarget(null)} disabled={isLeaving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" variant="destructive" isLoading={isLeaving} className="bg-red-600 hover:bg-red-700 font-bold">
              Confirm & Leave Course
            </Button>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
export default StudentCoursesPage
