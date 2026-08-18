import React, { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { HelpCircle, CheckCircle2, Award, Clock, ArrowRight, ArrowLeft, BookOpen, Sparkles, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/context/auth-context"
import type { Quiz, Question, Course } from "@/types"

export const StudentQuizzesPage: React.FC = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { apiFetch } = useAuth()

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Quiz Attempt State
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQIndex, setCurrentQIndex] = useState<number>(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Result state
  const [resultScore, setResultScore] = useState<number | null>(null)
  const [breakdown, setBreakdown] = useState<Array<{ question_id: string; question_text: string; student_answer: string; correct_answer: string; is_correct: boolean; explanation?: string }>>([])

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

  // Fetch quizzes for course
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

  const startQuiz = async (quiz: Quiz) => {
    setActiveQuiz(quiz)
    setCurrentQIndex(0)
    setAnswers({})
    setResultScore(null)

    try {
      const res = await apiFetch(`/api/v1/quizzes/${quiz.id}`)
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.questions || [])
      }
    } catch (e) {
      showToast("Failed to load quiz questions", "error")
    }
  }

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return
    setIsSubmitting(true)

    const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
      question_id: qId,
      student_answer: ans
    }))

    try {
      const res = await apiFetch(`/api/v1/quizzes/${activeQuiz.id}/attempt`, {
        method: "POST",
        body: JSON.stringify({ answers: formattedAnswers })
      })

      if (!res.ok) throw new Error("Quiz submission failed")

      const data = await res.json()
      setResultScore(data.score_percentage)
      setBreakdown(data.breakdown || [])
      showToast(`Quiz completed! You scored ${data.score_percentage}%`, "success")

    } catch (err: any) {
      showToast(err.message || "Failed to submit quiz", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 text-left select-none max-w-7xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold text-[11px] uppercase tracking-wider border border-amber-500/20">
              Interactive Practice
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-heading">Course Quizzes</h1>
          <p className="text-xs text-muted-foreground">Test your knowledge with AI-generated and teacher-assigned quizzes</p>
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
              <option value="">No enrolled courses</option>
            ) : (
              courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))
            )}
          </select>
        </div>
      </Card>

      {/* Quizzes Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-40 rounded-2xl bg-muted/40 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border/80 bg-gradient-to-b from-card to-muted/20 rounded-3xl space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 border border-violet-500/20 shadow-xs">
            <HelpCircle className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold font-heading text-foreground">No Quizzes Available</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Practice quizzes will automatically appear here.
            </p>
          </div>
          <Button onClick={() => navigate("/student/courses")} size="sm" className="font-bold text-xs gap-1.5 rounded-xl">
            <BookOpen className="h-4 w-4" />
            Browse Courses
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {quizzes.map((q) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="hover-lift border-border/80 h-full flex flex-col justify-between">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/25 text-[10px] uppercase font-extrabold">
                      Available
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(q.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-base font-heading text-foreground line-clamp-1">{q.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-sans">
                      {q.description || "Course practice evaluation."}
                    </p>
                  </div>

                  <Button
                    onClick={() => startQuiz(q)}
                    className="w-full font-bold gap-2 shadow-md shadow-primary/20"
                  >
                    Attempt Quiz
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quiz Taking Modal */}
      {activeQuiz && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-card border border-border/80 rounded-3xl p-6 shadow-2xl text-left relative overflow-hidden max-h-[90vh] flex flex-col"
          >
            {resultScore !== null ? (
              /* Score Reveal Card & Breakdown */
              <div className="py-6 space-y-6 overflow-y-auto pr-1">
                <div className="text-center space-y-3">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-primary via-amber-500 to-emerald-500 text-white shadow-xl shadow-primary/30">
                    <Award className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold font-heading">Quiz Completed!</h3>
                    <p className="text-xs text-muted-foreground">Assessment Agent evaluated your answers against course material</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 max-w-xs mx-auto space-y-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Final Score</span>
                    <div className="text-3xl font-extrabold text-primary font-heading">{resultScore}%</div>
                  </div>
                </div>

                {/* Question Review Breakdown */}
                {breakdown.length > 0 && (
                  <div className="space-y-4 border-t border-border/40 pt-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Question Review</h4>
                    <div className="space-y-3">
                      {breakdown.map((item, bIdx) => (
                        <div key={bIdx} className={`p-4 rounded-2xl border text-xs space-y-2 ${
                          item.is_correct ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-foreground">Q{bIdx + 1}. {item.question_text}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0 ${
                              item.is_correct ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"
                            }`}>
                              {item.is_correct ? "Correct" : "Incorrect"}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground space-y-1">
                            <div>Your Answer: <strong className={item.is_correct ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>{item.student_answer}</strong></div>
                            {!item.is_correct && <div>Correct Answer: <strong className="text-emerald-600 font-bold">{item.correct_answer}</strong></div>}
                            {item.explanation && (
                              <div className="p-2.5 rounded-xl bg-card border border-border/40 text-[11px] text-foreground/80 mt-1.5">
                                💡 {item.explanation}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-center pt-2">
                  <Button onClick={() => setActiveQuiz(null)} className="font-bold px-8 shadow-md rounded-xl">
                    Close Review
                  </Button>
                </div>
              </div>
            ) : questions.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="h-10 w-10 animate-spin border-4 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-xs font-bold text-muted-foreground">Loading quiz questions...</p>
              </div>
            ) : (
              /* Active Question Form */
              <div className="space-y-6">
                {/* Header with Progress Bar */}
                <div className="space-y-2 border-b border-border/40 pb-4">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span>{activeQuiz.title}</span>
                    <span>Question {currentQIndex + 1} of {questions.length}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question */}
                {questions[currentQIndex] && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-extrabold font-heading text-foreground">
                      {questions[currentQIndex].question_text}
                    </h3>

                    {/* Options */}
                    <div className="space-y-2.5">
                      {(questions[currentQIndex].options || ["True", "False"]).map((opt: string, oIdx: number) => {
                        const qId = questions[currentQIndex].id
                        const isSelected = answers[qId] === opt

                        return (
                          <div
                            key={oIdx}
                            onClick={() => setAnswers((prev) => ({ ...prev, [qId]: opt }))}
                            className={`p-3.5 rounded-2xl border text-xs font-semibold cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? "border-primary bg-primary/10 text-primary shadow-xs"
                                : "border-border/80 bg-background hover:bg-muted text-foreground"
                            }`}
                          >
                            <span>{opt}</span>
                            <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                              {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                  <Button
                    variant="outline"
                    disabled={currentQIndex === 0}
                    onClick={() => setCurrentQIndex((prev) => prev - 1)}
                    className="font-bold gap-2 text-xs"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  {currentQIndex === questions.length - 1 ? (
                    <Button
                      onClick={handleSubmitQuiz}
                      isLoading={isSubmitting}
                      className="font-bold gap-2 text-xs shadow-md shadow-primary/20"
                    >
                      Submit Quiz
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setCurrentQIndex((prev) => prev + 1)}
                      className="font-bold gap-2 text-xs shadow-md shadow-primary/20"
                    >
                      Next Question
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

    </div>
  )
}
export default StudentQuizzesPage
