import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { 
  FileText, 
  Plus, 
  BookOpen, 
  CheckCircle2, 
  Calendar, 
  Loader2, 
  Eye, 
  X, 
  Users, 
  ExternalLink,
  Trash2,
  AlertTriangle
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/context/auth-context"
import type { Assignment, Course } from "@/types"

interface SubmissionRecord {
  id: string | null
  assignment_id: string
  student_id: string
  student_name: string
  student_email: string
  file_url?: string | null
  status: string
  submitted?: boolean
  score?: number | null
  total_points?: number | null
  percentage?: number | null
  submitted_at?: string | null
}

interface AssignmentDetailsResponse extends Assignment {
  course_title?: string
  status?: string
}

export const TeacherAssignmentsPage: React.FC = () => {
  const { showToast } = useToast()
  const { apiFetch } = useAuth()

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Creation Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [isPublishing, setIsPublishing] = useState<boolean>(false)

  // Detail & Submissions Viewer Modal state
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentDetailsResponse | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false)
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([])
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<"details" | "submissions">("details")
  
  // Sorting preference persisted in localStorage
  const [sortOrder, setSortOrder] = useState<"highest_to_lowest" | "lowest_to_highest">(() => {
    return (localStorage.getItem("teacher_assignment_performance_sort") as any) || "highest_to_lowest"
  })

  // Deletion Modal state
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  // Form Fields for Creation
  const [title, setTitle] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [deadline, setDeadline] = useState<string>("")

  const handleSortChange = (val: "highest_to_lowest" | "lowest_to_highest") => {
    setSortOrder(val)
    localStorage.setItem("teacher_assignment_performance_sort", val)
  }

  // Fetch teacher's courses
  const fetchCourses = useCallback(async () => {
    try {
      const res = await apiFetch("/api/v1/courses")
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

  // Fetch assignments for selected course
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

  const handleOpenDetailModal = async (assignment: Assignment, defaultTab: "details" | "submissions" = "details") => {
    setActiveTab(defaultTab)
    setIsDetailModalOpen(true)
    setIsLoadingDetails(true)
    setIsLoadingSubmissions(true)

    try {
      // 1. Fetch single assignment details
      const detailRes = await apiFetch(`/api/v1/assignments/${assignment.id}`)
      if (detailRes.ok) {
        const detailData = await detailRes.json()
        setSelectedAssignment(detailData)
      } else {
        setSelectedAssignment(assignment)
      }

      // 2. Fetch student submissions roster
      const subRes = await apiFetch(`/api/v1/assignments/${assignment.id}/submissions`)
      if (subRes.ok) {
        const subData = await subRes.json()
        setSubmissions(subData)
      } else {
        setSubmissions([])
      }
    } catch (err) {
      console.error("Error loading assignment details:", err)
      showToast("Failed to load assignment details", "error")
    } finally {
      setIsLoadingDetails(false)
      setIsLoadingSubmissions(false)
    }
  }

  const handleOpenModal = () => {
    setTitle("")
    setDescription("")
    setDeadline("")
    setIsModalOpen(true)
  }

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourseId || !title.trim() || !description.trim()) return

    setIsPublishing(true)
    try {
      const res = await apiFetch("/api/v1/assignments", {
        method: "POST",
        body: JSON.stringify({
          course_id: selectedCourseId,
          title,
          description,
          deadline: deadline ? new Date(deadline).toISOString() : null
        })
      })

      if (!res.ok) throw new Error("Failed to create assignment")

      showToast("Assignment published successfully!", "success")
      setIsModalOpen(false)
      setTitle("")
      setDescription("")
      setDeadline("")
      fetchAssignments()
    } catch (err: any) {
      showToast(err.message || "Failed to publish assignment", "error")
    } finally {
      setIsPublishing(false)
    }
  }

  const handlePromptDelete = (e: React.MouseEvent, assignment: Assignment) => {
    e.stopPropagation()
    setAssignmentToDelete(assignment)
    setIsDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return
    setIsDeleting(true)
    try {
      const res = await apiFetch(`/api/v1/assignments/${assignmentToDelete.id}`, {
        method: "DELETE"
      })
      if (!res.ok) throw new Error("Failed to delete assignment")

      showToast("Assignment deleted successfully!", "success")
      setIsDeleteConfirmOpen(false)
      setIsDetailModalOpen(false)
      setAssignmentToDelete(null)
      fetchAssignments()
    } catch (err: any) {
      showToast(err.message || "Failed to delete assignment", "error")
    } finally {
      setIsDeleting(false)
    }
  }

  const sortedSubmissions = [...submissions].sort((a, b) => {
    const scoreA = a.submitted ? (a.score ?? 0) : -1
    const scoreB = b.submitted ? (b.score ?? 0) : -1
    if (sortOrder === "highest_to_lowest") {
      return scoreB - scoreA
    } else {
      return scoreA - scoreB
    }
  })

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[11px] uppercase tracking-wider border border-emerald-500/20">
              Assignment Engine
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-heading">Course Assignments</h1>
          <p className="text-xs text-muted-foreground">Manage and publish assignments for your course students</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button onClick={handleOpenModal} disabled={!selectedCourseId} className="font-bold gap-2 rounded-xl shadow-md shadow-primary/20" size="lg">
            <Plus className="h-4 w-4" /> Create Assignment
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="p-4 bg-card/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">Course:</label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-border/80 bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[220px]"
          >
            {courses.length === 0 ? (
              <option value="">No courses available</option>
            ) : (
              courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))
            )}
          </select>
        </div>
      </Card>

      {/* Assignments List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 rounded-2xl bg-muted/40 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border/80 bg-gradient-to-b from-card to-muted/20">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600 mb-4 shadow-sm">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold font-heading mb-1">No assignments created yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
            Create custom assignments for your students with detailed instructions and deadlines.
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={handleOpenModal} disabled={!selectedCourseId} className="font-bold gap-2 rounded-xl">
              <Plus className="h-4 w-4" /> Create Assignment
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card 
                onClick={() => handleOpenDetailModal(a)}
                className="hover-lift border-border/80 cursor-pointer hover:border-emerald-500/50 transition-all group"
              >
                <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px] uppercase">
                        Published
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        {courses.find(c => c.id === a.course_id)?.title || "Course"}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold font-heading text-foreground group-hover:text-emerald-600 transition-colors">
                      {a.title}
                    </h3>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {a.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs pt-1">
                      {a.deadline ? (
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <Calendar className="h-3.5 w-3.5" />
                          Due: {new Date(a.deadline).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No deadline set</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenDetailModal(a, "submissions")
                      }}
                      className="font-bold text-xs gap-1.5 rounded-xl border-border/80"
                    >
                      <Users className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{a.submission_count ?? 0} Submissions</span>
                    </Button>

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenDetailModal(a, "details")
                      }}
                      className="font-bold text-xs gap-1.5 rounded-xl hover:bg-emerald-500/10 text-emerald-600"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Details
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handlePromptDelete(e, a)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-500/10 p-2 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* ASSIGNMENT DETAIL & SUBMISSIONS MODAL                    */}
      {/* ======================================================== */}
      {isDetailModalOpen && selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl bg-card border border-border/80 rounded-3xl p-6 shadow-2xl text-left my-8 max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 mb-4 shrink-0 border-b border-border/40 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold font-heading text-foreground">{selectedAssignment.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Course: <span className="font-semibold text-foreground">{selectedAssignment.course_title || courses.find(c => c.id === selectedAssignment.course_id)?.title || "Course"}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex gap-2 border-b border-border/60 pb-3 shrink-0">
              <Button
                variant={activeTab === "details" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("details")}
                className="font-bold text-xs gap-2 rounded-xl"
              >
                <FileText className="h-4 w-4" /> Assignment Overview
              </Button>
              <Button
                variant={activeTab === "submissions" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("submissions")}
                className="font-bold text-xs gap-2 rounded-xl"
              >
                <Users className="h-4 w-4" /> Student Submissions & Marks ({submissions.length})
              </Button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto space-y-4 flex-1 pr-1 py-2">
              {isLoadingDetails ? (
                <div className="p-8 text-center space-y-2">
                  <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground">Loading assignment details...</p>
                </div>
              ) : activeTab === "details" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/60">
                    {selectedAssignment.deadline ? (
                      <span className="flex items-center gap-1.5 text-amber-600 font-bold">
                        <Calendar className="h-4 w-4" />
                        Deadline: {new Date(selectedAssignment.deadline).toLocaleString()}
                      </span>
                    ) : (
                      <span>No deadline set</span>
                    )}
                    <span className="flex items-center gap-1.5 text-emerald-600 font-bold ml-auto">
                      <Users className="h-4 w-4" />
                      {selectedAssignment.submission_count ?? submissions.filter(s => s.submitted).length} Submissions Received
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground font-heading">
                      Instructions & Problem Statement
                    </h4>
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {selectedAssignment.description}
                    </div>
                  </div>
                </div>
              ) : (
                /* Submissions & Marks Roster Tab */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/20 p-3.5 rounded-2xl border border-border/60">
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground font-heading">
                        Student Performance Roster
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {submissions.length} total enrolled students
                      </p>
                    </div>

                    {/* Sorting Control */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-muted-foreground shrink-0">Sort By Performance:</label>
                      <select
                        value={sortOrder}
                        onChange={(e) => handleSortChange(e.target.value as any)}
                        className="px-3 py-1.5 rounded-xl border border-border/80 bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="highest_to_lowest">Highest → Lowest (Default)</option>
                        <option value="lowest_to_highest">Lowest → Highest</option>
                      </select>
                    </div>
                  </div>

                  {isLoadingSubmissions ? (
                    <div className="p-8 text-center space-y-2">
                      <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mx-auto" />
                      <p className="text-xs text-muted-foreground">Loading student roster...</p>
                    </div>
                  ) : sortedSubmissions.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-border/60 rounded-2xl">
                      <p className="text-xs text-muted-foreground">No students enrolled in this course yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-border/80">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/40 text-muted-foreground border-b border-border/80 font-bold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="p-3">Student Name</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Submission Status</th>
                            <th className="p-3">Marks Obtained</th>
                            <th className="p-3">Percentage</th>
                            <th className="p-3">Submitted At</th>
                            <th className="p-3">Work File / Link</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {sortedSubmissions.map((sub) => (
                            <tr key={sub.student_id} className="hover:bg-muted/20 transition-colors">
                              <td className="p-3 font-bold text-foreground">{sub.student_name}</td>
                              <td className="p-3 text-muted-foreground text-[11px]">{sub.student_email}</td>
                              <td className="p-3">
                                {sub.submitted ? (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                                    sub.status === "GRADED" 
                                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                                      : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                  }`}>
                                    {sub.status === "GRADED" ? "Graded" : "Submitted"}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] uppercase font-bold">
                                    Not Submitted
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-bold">
                                {sub.submitted 
                                  ? (sub.score !== null && sub.score !== undefined ? `${sub.score} / ${sub.total_points || 100}` : "Not Graded")
                                  : "—"}
                              </td>
                              <td className="p-3 font-extrabold text-emerald-600">
                                {sub.submitted && sub.percentage !== null && sub.percentage !== undefined 
                                  ? `${sub.percentage}%` 
                                  : "—"}
                              </td>
                              <td className="p-3 text-[11px] text-muted-foreground">
                                {sub.submitted && sub.submitted_at 
                                  ? new Date(sub.submitted_at).toLocaleString() 
                                  : "—"}
                              </td>
                              <td className="p-3">
                                {sub.submitted && sub.file_url ? (
                                  sub.file_url.startsWith("http://") || sub.file_url.startsWith("https://") ? (
                                    <a
                                      href={sub.file_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-emerald-600 font-bold hover:underline flex items-center gap-1 text-[11px]"
                                    >
                                      View File <ExternalLink className="h-3 w-3" />
                                    </a>
                                  ) : (
                                    <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[120px] block">
                                      {sub.file_url}
                                    </span>
                                  )
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border/60 shrink-0">
              <Button
                type="button"
                variant="ghost"
                onClick={(e) => handlePromptDelete(e, selectedAssignment)}
                className="text-red-500 hover:text-red-700 hover:bg-red-500/10 font-bold text-xs gap-1.5 rounded-xl"
              >
                <Trash2 className="h-4 w-4" /> Delete Assignment
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsDetailModalOpen(false)} className="rounded-xl font-bold">
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Creation Modal (Manual Only) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-card border border-border/80 rounded-3xl p-6 shadow-2xl text-left my-8 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center gap-2.5 mb-4 shrink-0 border-b border-border/40 pb-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-primary via-emerald-600 to-amber-500 text-white flex items-center justify-center shadow-md">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg font-heading">
                  Create Assignment
                </h3>
                <p className="text-xs text-muted-foreground">
                  Enter assignment title, instructions, and deadline manually
                </p>
              </div>
            </div>

            <div className="overflow-y-auto pr-1 space-y-4 flex-1">
              <form onSubmit={handleCreateAssignment} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Assignment Title</label>
                  <Input
                    placeholder="e.g. Assignment 1: PyTorch Attention Mechanisms"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Instructions & Rubric</label>
                  <textarea
                    placeholder="Provide clear instructions for students..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={5}
                    className="w-full p-3 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-sans leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Submission Deadline (Optional)</label>
                  <Input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isPublishing}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isPublishing} disabled={!title.trim() || !description.trim()} className="font-bold gap-2 shadow-md shadow-primary/20 rounded-xl">
                    <CheckCircle2 className="h-4 w-4" />
                    Publish Assignment
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {isDeleteConfirmOpen && assignmentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-card border border-border/80 rounded-3xl p-6 shadow-2xl text-left space-y-4"
          >
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg font-heading text-foreground">Delete this assignment?</h3>
                <p className="text-xs text-muted-foreground">Permanent action</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-foreground">"{assignmentToDelete.title}"</strong>? Student submissions and related assignment data may also be removed.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
              <Button type="button" variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2 rounded-xl border-0 shadow-md shadow-red-500/20"
              >
                <Trash2 className="h-4 w-4" /> Delete Assignment
              </Button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  )
}
export default TeacherAssignmentsPage
