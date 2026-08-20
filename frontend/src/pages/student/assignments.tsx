import React, { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { ClipboardList, UploadCloud, CheckCircle2, FileText, ArrowRight, BookOpen, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/context/auth-context"
import type { Assignment, Course } from "@/types"

export const StudentAssignmentsPage: React.FC = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { apiFetch } = useAuth()

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Submit Modal State
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null)
  const [fileUrl, setFileUrl] = useState<string>("")
  const [textSolution, setTextSolution] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [submittedIds, setSubmittedIds] = useState<string[]>([])

  // Fetch enrolled courses
  const fetchCourses = useCallback(async () => {
    try {
      const res = await apiFetch("/api/v1/courses/enrolled")
      if (res.ok) {
        const data = await res.json()
        setCourses(data)
        if (data.length > 0 && !selectedCourseId) {
          setSelectedCourseId(data[0].id)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }, [apiFetch, selectedCourseId])

  // Fetch assignments for course
  const fetchAssignments = useCallback(async () => {
    if (!selectedCourseId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await apiFetch(`/api/v1/assignments/course/${selectedCourseId}`)
      if (res.ok) {
        const data = await res.json()
        setAssignments(data)
      } else {
        setAssignments([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCourseId, apiFetch])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  useEffect(() => {
    if (selectedCourseId) {
      fetchAssignments()
    }
  }, [selectedCourseId, fetchAssignments])

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAssignment) return

    setIsSubmitting(true)
    try {
      const res = await apiFetch(`/api/v1/assignments/${activeAssignment.id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          submission_text: textSolution,
          file_url: fileUrl
        })
      })

      if (res.ok) {
        showToast("Assignment submitted successfully!", "success")
        setSubmittedIds((prev) => [...prev, activeAssignment.id])
        setActiveAssignment(null)
        setTextSolution("")
        setFileUrl("")
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || "Submission failed", "error")
      }
    } catch (e) {
      showToast("Error submitting assignment", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 select-none text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
            <ClipboardList className="h-3.5 w-3.5" /> Class Assignments
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-heading text-foreground">Course Assignments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View problem sets, homework, and lab assignments assigned by your course instructors.
          </p>
        </div>
      </div>

      {/* Course Selector Dropdown */}
      <div className="flex items-center gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-xs">
        <BookOpen className="h-5 w-5 text-primary shrink-0" />
        <label className="text-xs font-bold text-foreground shrink-0">Select Course:</label>
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="w-full max-w-xs h-10 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {courses.length === 0 ? (
            <option value="">No enrolled courses</option>
          ) : (
            courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Assignments List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 rounded-2xl bg-muted/40 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border/80 bg-gradient-to-b from-card to-muted/20 rounded-3xl space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
            <ClipboardList className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold font-heading text-foreground">No Assignments Pending</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Your teacher has not assigned homework or lab exercises for this course yet.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => {
            const isSubmitted = a.submitted || submittedIds.includes(a.id)
            const statusLabel = a.status || (isSubmitted ? "SUBMITTED" : "PENDING")

            return (
              <Card key={a.id} className="overflow-hidden border border-border/70 shadow-xs rounded-2xl">
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <FileText className="h-4 w-4" />
                      </span>
                      <h3 className="text-base font-bold text-foreground truncate">{a.title}</h3>
                    </div>
                    {a.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-9">{a.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-muted-foreground pl-9 pt-1">
                      {a.deadline && (
                        <span>Deadline: <strong className="text-amber-600 font-bold">{new Date(a.deadline).toLocaleString()}</strong></span>
                      )}
                      {a.submitted_at && (
                        <span>Submitted on: <strong className="text-emerald-600 font-bold">{new Date(a.submitted_at).toLocaleString()}</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-9 sm:pl-0">
                    {isSubmitted ? (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Submitted
                      </span>
                    ) : statusLabel === "OVERDUE" ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-red-600 bg-red-500/10 px-2.5 py-1 rounded-xl border border-red-500/20">
                          Overdue
                        </span>
                        <Button onClick={() => setActiveAssignment(a)} size="sm" variant="outline" className="font-bold text-xs gap-1 rounded-xl">
                          Submit Late
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={() => setActiveAssignment(a)} size="sm" className="font-bold text-xs gap-1.5 rounded-xl">
                        Submit Solution <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Submit Assignment Modal */}
      {activeAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-card border border-border/80 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Submit Assignment</h3>
                <p className="text-xs text-muted-foreground truncate max-w-xs">{activeAssignment.title}</p>
              </div>
            </div>

            <form onSubmit={handleSubmitAssignment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Text Solution / Notes</label>
                <textarea
                  placeholder="Type your answer, code, or submission summary..."
                  value={textSolution}
                  onChange={(e) => setTextSolution(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Optional File URL / Document Link</label>
                <Input
                  placeholder="https://..."
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button type="button" variant="ghost" onClick={() => setActiveAssignment(null)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl font-bold gap-2">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit Work
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default StudentAssignmentsPage
