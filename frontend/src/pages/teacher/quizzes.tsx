import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { HelpCircle, Sparkles, Plus, BookOpen, Trash2, CheckCircle2, AlertCircle, FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/context/auth-context"
import type { Quiz, Course } from "@/types"

export const TeacherQuizzesPage: React.FC = () => {
  const { showToast } = useToast()
  const { apiFetch } = useAuth()

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false)
  const [difficulty, setDifficulty] = useState<string>("medium")
  const [numQuestions, setNumQuestions] = useState<number>(5)

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

  const handleGenerateAIQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourseId) return

    setIsGeneratingAI(true)

    try {
      // 1. Request AI Quiz Generation from AssessmentAgent
      const aiRes = await apiFetch("/api/v1/ai/generate-quiz", {
        method: "POST",
        body: JSON.stringify({
          course_id: selectedCourseId,
          difficulty,
          num_questions: numQuestions
        })
      })

      if (!aiRes.ok) throw new Error("AI Quiz generation failed")
      const aiData = await aiRes.json()
      const quizData = aiData.quiz

      // 2. Save generated quiz to database
      const saveRes = await apiFetch("/api/v1/quizzes", {
        method: "POST",
        body: JSON.stringify({
          course_id: selectedCourseId,
          title: quizData.title,
          description: quizData.description,
          questions: quizData.questions
        })
      })

      if (!saveRes.ok) throw new Error("Failed to publish AI Quiz")

      showToast("AI Quiz generated and published successfully!", "success")
      setIsAIModalOpen(false)
      fetchQuizzes()

    } catch (err: any) {
      showToast(err.message || "Quiz generation failed", "error")
    } finally {
      setIsGeneratingAI(false)
    }
  }

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
          <p className="text-xs text-muted-foreground">Generate AI-powered quizzes from course materials or build custom questionnaires</p>
        </div>

        <Button
          onClick={() => setIsAIModalOpen(true)}
          disabled={!selectedCourseId}
          className="shadow-md shadow-primary/20 font-bold gap-2 bg-gradient-to-r from-primary via-amber-500 to-emerald-500 text-white border-0 shrink-0"
          size="lg"
        >
          <Sparkles className="h-5 w-5" />
          Generate Quiz with AI
        </Button>
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
          <h3 className="text-lg font-bold font-heading mb-1">No quizzes available</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
            Generate your first AI quiz automatically using course materials or uploaded slides.
          </p>
          <Button onClick={() => setIsAIModalOpen(true)} disabled={!selectedCourseId} className="font-bold gap-2">
            <Sparkles className="h-4 w-4" />
            Generate First AI Quiz
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
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase font-bold">
                      Published
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(q.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-base font-heading text-foreground line-clamp-1">{q.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-sans">
                      {q.description || "Interactive course evaluation."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-foreground/80 border-t border-border/20 pt-3">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
                      MCQ & Subjective
                    </span>
                    <span className="text-emerald-600">Active</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* AI Quiz Generation Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-card border border-border/80 rounded-3xl p-6 shadow-2xl text-left"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-primary via-amber-500 to-emerald-500 text-white flex items-center justify-center shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg font-heading">Generate AI Quiz</h3>
                <p className="text-xs text-muted-foreground">Assessment Agent generates questions from course materials</p>
              </div>
            </div>

            <form onSubmit={handleGenerateAIQuiz} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">Difficulty Level</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-border/80 bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="easy">Easy (Foundational Concepts)</option>
                  <option value="medium">Medium (Balanced Analysis)</option>
                  <option value="hard">Hard (Advanced Application)</option>
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

              <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-[11px] text-muted-foreground leading-relaxed">
                The Assessment Agent will extract key topics from course materials and build MCQs with explanations and answer keys automatically.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsAIModalOpen(false)} disabled={isGeneratingAI}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isGeneratingAI} className="font-bold gap-2 shadow-md shadow-primary/20">
                  <Sparkles className="h-4 w-4" />
                  Generate & Publish Quiz
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  )
}
export default TeacherQuizzesPage
