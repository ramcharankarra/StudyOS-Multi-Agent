import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { 
  HelpCircle, 
  Sparkles, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Calendar, 
  Loader2, 
  Eye, 
  X, 
  CheckCheck,
  Users,
  AlertTriangle
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/context/auth-context"
import type { Quiz, Course } from "@/types"

interface StudentAttemptRecord {
  id: string | null
  quiz_id: string
  student_id: string
  student_name: string
  student_email: string
  status: string
  attempted: boolean
  score: number | null
  total_points: number | null
  percentage: number | null
  completed_at: string | null
}

interface EditableQuestion {
  id?: string
  question_text: string
  question_type: string
  options: string[]
  correct_answer: string
  explanation?: string
  points: number
}

interface DetailedQuizResponse extends Quiz {
  course_title?: string
  questions?: EditableQuestion[]
}

export const TeacherQuizzesPage: React.FC = () => {
  const { showToast } = useToast()
  const { apiFetch } = useAuth()

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Creation Modal state (Manual or AI Draft)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [createMode, setCreateMode] = useState<"manual" | "ai">("manual")
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false)
  const [isPublishing, setIsPublishing] = useState<boolean>(false)

  // Detail Modal State
  const [selectedQuiz, setSelectedQuiz] = useState<DetailedQuizResponse | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false)
  const [attempts, setAttempts] = useState<StudentAttemptRecord[]>([])
  const [isLoadingAttempts, setIsLoadingAttempts] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<"questions" | "performance">("questions")

  // Sorting preference persisted in localStorage
  const [sortOrder, setSortOrder] = useState<"highest_to_lowest" | "lowest_to_highest">(() => {
    return (localStorage.getItem("teacher_quiz_performance_sort") as any) || "highest_to_lowest"
  })

  // Deletion Confirmation State
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  // AI Prompt Fields
  const [goal, setGoal] = useState<string>("")
  const [difficulty, setDifficulty] = useState<string>("medium")
  const [numQuestions, setNumQuestions] = useState<number>(5)

  // Quiz Form Fields
  const [title, setTitle] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [deadline, setDeadline] = useState<string>("")
  const [questions, setQuestions] = useState<EditableQuestion[]>([])

  const handleSortChange = (val: "highest_to_lowest" | "lowest_to_highest") => {
    setSortOrder(val)
    localStorage.setItem("teacher_quiz_performance_sort", val)
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

  // Fetch quizzes for selected course
  const fetchQuizzes = useCallback(async () => {
    if (!selectedCourseId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await apiFetch(`/api/v1/quizzes/course/${selectedCourseId}`)
      if (res.ok) {
        const data = await res.json()
        setQuizzes(data)
      } else {
        setQuizzes([])
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
      fetchQuizzes()
    }
  }, [selectedCourseId, fetchQuizzes])

  const handleOpenDetailModal = async (quiz: Quiz, defaultTab: "questions" | "performance" = "questions") => {
    setActiveTab(defaultTab)
    setIsDetailModalOpen(true)
    setIsLoadingDetails(true)
    setIsLoadingAttempts(true)

    try {
      // 1. Fetch Quiz Details (Questions & Answer keys)
      const res = await apiFetch(`/api/v1/quizzes/${quiz.id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedQuiz(data)
      } else {
        setSelectedQuiz(quiz)
      }

      // 2. Fetch Student Attempts Performance Roster
      const attRes = await apiFetch(`/api/v1/quizzes/${quiz.id}/attempts`)
      if (attRes.ok) {
        const attData = await attRes.json()
        setAttempts(attData)
      } else {
        setAttempts([])
      }
    } catch (err) {
      console.error("Failed to load quiz details:", err)
      showToast("Error loading quiz details", "error")
    } finally {
      setIsLoadingDetails(false)
      setIsLoadingAttempts(false)
    }
  }

  const handleOpenModal = (mode: "manual" | "ai") => {
    setCreateMode(mode)
    setTitle("")
    setDescription("")
    setGoal("")
    setDeadline("")
    if (mode === "ai") {
      setQuestions([])
    } else {
      setQuestions([
        {
          question_text: "",
          question_type: "MCQ",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correct_answer: "Option A",
          explanation: "",
          points: 10
        }
      ])
    }
    setIsModalOpen(true)
  }

  const handleGenerateAIQuiz = async () => {
    if (!selectedCourseId) return
    setIsGeneratingAI(true)

    try {
      const aiRes = await apiFetch("/api/v1/ai/generate-quiz", {
        method: "POST",
        body: JSON.stringify({
          course_id: selectedCourseId,
          goal: goal || undefined,
          difficulty,
          num_questions: numQuestions
        })
      })

      if (!aiRes.ok) throw new Error("AI Quiz generation failed")
      const aiData = await aiRes.json()
      const quizData = aiData.quiz || aiData.data || aiData

      setTitle(quizData.title || `Assessment: ${goal || "Practice Quiz"}`)
      setDescription(quizData.description || "Grounded assessment generated from course materials.")
      
      const rawQs = quizData.questions || []
      const formattedQs: EditableQuestion[] = rawQs.map((q: any) => ({
        question_text: q.question_text || q.question || "",
        question_type: "MCQ",
        options: q.options && q.options.length >= 2 ? q.options : ["Option A", "Option B", "Option C", "Option D"],
        correct_answer: q.correct_answer || q.answer || (q.options ? q.options[0] : "Option A"),
        explanation: q.explanation || "",
        points: q.points || 10
      }))

      setQuestions(formattedQs)
      showToast("AI Quiz Draft generated! Review questions and set deadline.", "success")

    } catch (err: any) {
      showToast(err.message || "Quiz generation failed", "error")
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        question_text: "",
        question_type: "MCQ",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correct_answer: "Option A",
        explanation: "",
        points: 10
      }
    ])
  }

  const handleRemoveQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleUpdateQuestion = (index: number, field: keyof EditableQuestion, value: any) => {
    setQuestions((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourseId || !title.trim() || questions.length === 0) return

    setIsPublishing(true)
    try {
      const saveRes = await apiFetch("/api/v1/quizzes", {
        method: "POST",
        body: JSON.stringify({
          course_id: selectedCourseId,
          title,
          description,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          questions
        })
      })

      if (!saveRes.ok) throw new Error("Failed to publish Quiz")

      showToast("Quiz published successfully!", "success")
      setIsModalOpen(false)
      setTitle("")
      setDescription("")
      setDeadline("")
      setQuestions([])
      fetchQuizzes()

    } catch (err: any) {
      showToast(err.message || "Failed to save quiz", "error")
    } finally {
      setIsPublishing(false)
    }
  }

  // Handle Quiz Deletion Confirmation
  const handlePromptDeleteQuiz = (e: React.MouseEvent, quiz: Quiz) => {
    e.stopPropagation()
    setQuizToDelete(quiz)
    setIsDeleteConfirmOpen(true)
  }

  const handleConfirmDeleteQuiz = async () => {
    if (!quizToDelete) return
    setIsDeleting(true)

    try {
      const res = await apiFetch(`/api/v1/quizzes/${quizToDelete.id}`, {
        method: "DELETE"
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || "Failed to delete quiz")
      }

      showToast("Quiz deleted successfully.", "success")
      setIsDeleteConfirmOpen(false)
      setQuizToDelete(null)
      if (selectedQuiz?.id === quizToDelete.id) {
        setIsDetailModalOpen(false)
      }
      fetchQuizzes()

    } catch (err: any) {
      showToast(err.message || "Failed to delete quiz", "error")
    } finally {
      setIsDeleting(false)
    }
  }

  // Sorted Attempts List
  const sortedAttempts = [...attempts].sort((a, b) => {
    if (a.attempted !== b.attempted) {
      return a.attempted ? -1 : 1
    }
    const scoreA = a.score !== null && a.score !== undefined ? a.score : -1
    const scoreB = b.score !== null && b.score !== undefined ? b.score : -1
    return sortOrder === "highest_to_lowest" ? scoreB - scoreA : scoreA - scoreB
  })

  return (
    <div className="space-y-6 text-left select-none max-w-7xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold text-[11px] uppercase tracking-wider border border-amber-500/20">
              Assessment Engine
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-heading">Course Quizzes & Assessments</h1>
          <p className="text-xs text-muted-foreground">Generate AI quizzes grounded in course material or build custom questionnaires</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button onClick={() => handleOpenModal("manual")} variant="outline" className="font-bold gap-2 rounded-xl" size="lg">
            <Plus className="h-4 w-4" /> Create Manually
          </Button>
          <Button
            onClick={() => handleOpenModal("ai")}
            disabled={!selectedCourseId}
            className="shadow-md shadow-primary/20 font-bold gap-2 bg-gradient-to-r from-primary via-amber-500 to-emerald-500 text-white border-0 shrink-0 rounded-xl"
            size="lg"
          >
            <Sparkles className="h-5 w-5" /> Generate with AI
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

      {/* Quizzes List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-40 rounded-2xl bg-muted/40 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border/80 bg-gradient-to-b from-card to-muted/20">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-600 mb-4 shadow-sm">
            <HelpCircle className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold font-heading mb-1">No quizzes created yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
            Create custom quizzes manually or generate grounded questions with AssessmentAgent.
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => handleOpenModal("manual")} variant="outline" className="font-bold gap-2 rounded-xl">
              <Plus className="h-4 w-4" /> Create Manually
            </Button>
            <Button onClick={() => handleOpenModal("ai")} disabled={!selectedCourseId} className="font-bold gap-2 rounded-xl">
              <Sparkles className="h-4 w-4" /> Generate with AI
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {quizzes.map((q) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card 
                onClick={() => handleOpenDetailModal(q)}
                className="hover-lift border-border/80 h-full flex flex-col justify-between cursor-pointer hover:border-amber-500/50 transition-all group"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase font-bold">
                      Published
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(q.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-base font-heading text-foreground group-hover:text-amber-600 transition-colors line-clamp-1">{q.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-sans">
                      {q.description || "Interactive course evaluation."}
                    </p>
                  </div>

                  {q.deadline && (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Deadline: {new Date(q.deadline).toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-bold text-foreground/80 border-t border-border/20 pt-3">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
                      {q.question_count ?? 0} Questions
                    </span>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs font-bold text-amber-600 gap-1 p-0 hover:bg-transparent">
                        <Eye className="h-3.5 w-3.5" /> View Details
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handlePromptDeleteQuiz(e, q)}
                        className="h-7 text-red-500 hover:text-red-700 hover:bg-red-500/10 p-1.5 rounded-lg"
                        title="Delete Quiz"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* QUIZ DETAIL MODAL                                        */}
      {/* ======================================================== */}
      {isDetailModalOpen && selectedQuiz && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-3xl bg-card border border-border/80 rounded-3xl p-6 shadow-2xl text-left my-8 max-h-[90vh] flex flex-col space-y-4"
          >
            <div className="flex items-start justify-between border-b border-border/60 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold font-heading text-foreground">{selectedQuiz.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Course: <span className="font-semibold text-foreground">{selectedQuiz.course_title || courses.find(c => c.id === selectedQuiz.course_id)?.title || "Course"}</span>
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
                variant={activeTab === "questions" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("questions")}
                className="font-bold text-xs gap-2 rounded-xl"
              >
                <HelpCircle className="h-4 w-4" /> Questions & Answer Keys ({selectedQuiz.questions?.length ?? 0})
              </Button>
              <Button
                variant={activeTab === "performance" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("performance")}
                className="font-bold text-xs gap-2 rounded-xl"
              >
                <Users className="h-4 w-4" /> Student Performance & Attempts ({attempts.length})
              </Button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1 pr-1">
              {isLoadingDetails ? (
                <div className="p-8 text-center space-y-2">
                  <Loader2 className="h-8 w-8 text-amber-600 animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground">Loading quiz details...</p>
                </div>
              ) : activeTab === "questions" ? (
                <div className="space-y-4">
                  {selectedQuiz.description && (
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-xs text-foreground">
                      {selectedQuiz.description}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs">
                    {selectedQuiz.deadline && (
                      <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                        <Calendar className="h-3.5 w-3.5" />
                        Deadline: {new Date(selectedQuiz.deadline).toLocaleString()}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                      <Users className="h-3.5 w-3.5" />
                      {selectedQuiz.attempt_count ?? 0} Total Attempts
                    </span>
                  </div>

                  <div className="space-y-3 border-t border-border/40 pt-3">
                    {selectedQuiz.questions?.map((q, idx) => (
                      <div key={q.id || idx} className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-primary">Question {idx + 1} ({q.points} pts)</span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-muted border border-border">
                            {q.question_type}
                          </span>
                        </div>

                        <p className="text-sm font-bold text-foreground">{q.question_text}</p>

                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = (opt.trim().toLowerCase() === (q.correct_answer || "").trim().toLowerCase())
                              return (
                                <div
                                  key={oIdx}
                                  className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
                                    isCorrect 
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold" 
                                      : "bg-background border-border/60 text-muted-foreground"
                                  }`}
                                >
                                  <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                                  {isCorrect && <CheckCheck className="h-4 w-4 text-emerald-600 shrink-0" />}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {q.explanation && (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 mt-2">
                            <strong>Explanation:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Sorting Header */}
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Student Ranking Roster ({attempts.length})
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-bold text-muted-foreground">Sort By Performance:</label>
                      <select
                        value={sortOrder}
                        onChange={(e) => handleSortChange(e.target.value as any)}
                        className="px-2.5 py-1 rounded-xl border border-border/80 bg-background text-xs font-bold text-foreground focus:outline-none"
                      >
                        <option value="highest_to_lowest">Highest → Lowest (Default)</option>
                        <option value="lowest_to_highest">Lowest → Highest</option>
                      </select>
                    </div>
                  </div>

                  {isLoadingAttempts ? (
                    <div className="p-8 text-center space-y-2">
                      <Loader2 className="h-8 w-8 text-amber-600 animate-spin mx-auto" />
                      <p className="text-xs text-muted-foreground">Loading student attempt performance...</p>
                    </div>
                  ) : attempts.length === 0 ? (
                    <div className="p-8 text-center border-dashed border-border/80 bg-muted/20 rounded-2xl space-y-2">
                      <Users className="h-8 w-8 text-muted-foreground mx-auto" />
                      <h4 className="text-sm font-bold text-foreground">No Enrolled Students</h4>
                      <p className="text-xs text-muted-foreground">
                        No students are currently enrolled in this course.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-border/80">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border/80 text-muted-foreground font-bold uppercase text-[10px] tracking-wider">
                            <th className="p-3">Student</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Marks Obtained</th>
                            <th className="p-3">Percentage</th>
                            <th className="p-3">Completed Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40 bg-card">
                          {sortedAttempts.map((att, idx) => (
                            <tr key={att.id || idx} className="hover:bg-muted/20 transition-colors">
                              <td className="p-3">
                                <div className="font-bold text-foreground">{att.student_name}</div>
                                <div className="text-[11px] text-muted-foreground">{att.student_email}</div>
                              </td>
                              <td className="p-3">
                                {att.attempted ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] uppercase font-bold">
                                    COMPLETED
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border text-[10px] uppercase font-bold">
                                    NOT ATTEMPTED
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-bold">
                                {att.attempted ? `${att.score} / ${att.total_points || 100}` : "—"}
                              </td>
                              <td className="p-3 font-extrabold text-emerald-600">
                                {att.attempted && att.percentage !== null && att.percentage !== undefined ? `${att.percentage}%` : "—"}
                              </td>
                              <td className="p-3 text-[11px] text-muted-foreground">
                                {att.attempted && att.completed_at ? new Date(att.completed_at).toLocaleString() : "—"}
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
                onClick={(e) => handlePromptDeleteQuiz(e, selectedQuiz)}
                className="text-red-500 hover:text-red-700 hover:bg-red-500/10 font-bold text-xs gap-1.5 rounded-xl"
              >
                <Trash2 className="h-4 w-4" /> Delete Quiz
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsDetailModalOpen(false)} className="rounded-xl font-bold">
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Creation Modal (Manual or AI Draft) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-3xl bg-card border border-border/80 rounded-3xl p-6 shadow-2xl text-left my-8 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center gap-2.5 mb-4 shrink-0 border-b border-border/40 pb-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-primary via-amber-500 to-emerald-500 text-white flex items-center justify-center shadow-md">
                {createMode === "ai" ? <Sparkles className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-extrabold text-lg font-heading">
                  {createMode === "ai" ? "Generate Quiz with AI" : "Create Manual Quiz"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {createMode === "ai" ? "AssessmentAgent generates grounded questions, which you can edit & publish" : "Build quiz questions manually and set student deadline"}
                </p>
              </div>
            </div>

            <div className="overflow-y-auto pr-1 space-y-5 flex-1">
              {createMode === "ai" && questions.length === 0 && (
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/80">Topic / Focus Goal (Optional)</label>
                    <Input
                      placeholder="e.g. Midterm Exam on Data Structures & Trees"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground/80">Difficulty Level</label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-border/80 bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground/80">Number of Questions</label>
                      <input
                        type="number"
                        min={2}
                        max={20}
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(parseInt(e.target.value) || 5)}
                        className="w-full px-3.5 py-2 rounded-xl border border-border/80 bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateAIQuiz}
                    disabled={isGeneratingAI}
                    className="w-full font-bold gap-2 shadow-md shadow-primary/20 rounded-xl"
                  >
                    {isGeneratingAI && <Loader2 className="h-4 w-4 animate-spin" />}
                    Generate AI Draft
                  </Button>
                </div>
              )}

              <form onSubmit={handleSaveQuiz} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Quiz Title</label>
                    <Input
                      placeholder="e.g. Unit 3 Assessment: Tree Traversals"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Deadline (Optional)</label>
                    <Input
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Quiz Description</label>
                  <textarea
                    placeholder="Brief description for students..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full p-3 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Questions Section */}
                <div className="space-y-4 border-t border-border/40 pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground font-heading">
                      Quiz Questions ({questions.length})
                    </h4>
                    <div className="flex items-center gap-2">
                      {createMode === "ai" && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setQuestions([])} className="font-bold text-xs gap-1.5 rounded-xl text-amber-600 hover:bg-amber-500/10">
                          <Sparkles className="h-3.5 w-3.5" /> Re-generate with AI
                        </Button>
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={handleAddQuestion} className="font-bold text-xs gap-1.5 rounded-xl">
                        <Plus className="h-3.5 w-3.5" /> Add Question
                      </Button>
                    </div>
                  </div>

                  {questions.map((q, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-primary">Question {idx + 1}</span>
                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <Input
                        placeholder="Question Text"
                        value={q.question_text}
                        onChange={(e) => handleUpdateQuestion(idx, "question_text", e.target.value)}
                        required
                        className="rounded-xl bg-background"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-muted-foreground w-4">{String.fromCharCode(65 + oIdx)}.</span>
                            <Input
                              placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...q.options]
                                newOpts[oIdx] = e.target.value
                                handleUpdateQuestion(idx, "options", newOpts)
                              }}
                              className="rounded-xl bg-background text-xs"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-emerald-600">Correct Answer</label>
                          <select
                            value={q.correct_answer}
                            onChange={(e) => handleUpdateQuestion(idx, "correct_answer", e.target.value)}
                            className="w-full p-2 rounded-xl border border-emerald-500/40 bg-background text-xs font-bold text-foreground"
                          >
                            {q.options.map((opt, oIdx) => (
                              <option key={oIdx} value={opt}>{opt || `Option ${String.fromCharCode(65 + oIdx)}`}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-muted-foreground">Explanation / Feedback</label>
                          <Input
                            placeholder="Explanation of correct answer"
                            value={q.explanation || ""}
                            onChange={(e) => handleUpdateQuestion(idx, "explanation", e.target.value)}
                            className="rounded-xl bg-background text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isPublishing}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isPublishing} disabled={!title.trim() || questions.length === 0} className="font-bold gap-2 shadow-md shadow-primary/20 rounded-xl">
                    <CheckCircle2 className="h-4 w-4" />
                    Publish Quiz
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DELETE QUIZ CONFIRMATION DIALOG                          */}
      {/* ======================================================== */}
      {isDeleteConfirmOpen && quizToDelete && (
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
                <h3 className="font-extrabold text-lg font-heading text-foreground">Delete this quiz?</h3>
                <p className="text-xs text-muted-foreground">Permanent action</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-foreground">"{quizToDelete.title}"</strong>? Student attempts and answers associated with this quiz may also be removed.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
              <Button type="button" variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDeleteQuiz}
                isLoading={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2 rounded-xl border-0 shadow-md shadow-red-500/20"
              >
                <Trash2 className="h-4 w-4" /> Delete Quiz
              </Button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  )
}
export default TeacherQuizzesPage
