import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { ClipboardList, Sparkles, Plus, BookOpen, Trash2, CheckCircle2, FileText, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/context/auth-context"
import type { Assignment, Course } from "@/types"

export const TeacherAssignmentsPage: React.FC = () => {
  const { showToast } = useToast()
  const { apiFetch } = useAuth()

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false)
  const [topic, setTopic] = useState<string>("")
  const [difficulty, setDifficulty] = useState<string>("medium")

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

  const handleGenerateAIAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourseId || !topic.trim()) return

    setIsGeneratingAI(true)

    try {
      // 1. Request AI Assignment Generation
      const aiRes = await apiFetch("/api/v1/ai/generate-assignment", {
        method: "POST",
        body: JSON.stringify({
          course_id: selectedCourseId,
          topic,
          difficulty
        })
      })

      if (!aiRes.ok) throw new Error("AI Assignment generation failed")
      const aiData = await aiRes.json()

      // 2. Save generated assignment
      const saveRes = await apiFetch("/api/v1/assignments", {
        method: "POST",
        body: JSON.stringify({
          course_id: selectedCourseId,
          title: aiData.title || `AI Assignment: ${topic}`,
          description: aiData.description || topic,
          rubric: aiData.rubric || {}
        })
      })

      if (saveRes.ok) {
        showToast("AI Assignment generated & published successfully!", "success")
        setIsAIModalOpen(false)
        setTopic("")
        fetchAssignments()
      } else {
        showToast("Failed to publish AI assignment", "error")
      }
    } catch (err: any) {
      showToast("Error generating AI assignment", "error")
    } finally {
      setIsGeneratingAI(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 select-none text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold mb-2 border border-emerald-500/20">
            <ClipboardList className="h-3.5 w-3.5" /> Course Assignments
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-heading text-foreground">Teacher Assignments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create assignments with AI rubrics and review student submission progress.
          </p>
        </div>

        <Button onClick={() => setIsAIModalOpen(true)} className="font-bold gap-2 shadow-sm rounded-xl shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Sparkles className="h-4 w-4" /> Generate AI Assignment
        </Button>
      </div>

      {/* Course Selector Dropdown */}
      <div className="flex items-center gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-xs">
        <BookOpen className="h-5 w-5 text-emerald-600 shrink-0" />
        <label className="text-xs font-bold text-foreground shrink-0">Select Course:</label>
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="w-full max-w-xs h-10 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {courses.length === 0 ? (
            <option value="">No courses created</option>
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
        <Card className="p-12 text-center border-dashed border-border/80 bg-gradient-to-b from-card to-muted/20 rounded-3xl space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-xs">
            <ClipboardList className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold font-heading text-foreground">No Assignments Created Yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Use AI generation to create structured problem sets, lab reports, or homework assignments with rubrics.
            </p>
          </div>
          <Button onClick={() => setIsAIModalOpen(true)} className="font-bold text-xs gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
            <Sparkles className="h-4 w-4" /> Create AI Assignment
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => (
            <Card key={a.id} className="overflow-hidden border border-border/70 shadow-xs rounded-2xl">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                      <FileText className="h-4 w-4" />
                    </span>
                    <h3 className="text-base font-bold text-foreground truncate">{a.title}</h3>
                  </div>
                  {a.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 pl-9">{a.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-9 sm:pl-0">
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Published
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* AI Assignment Generation Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-card border border-border/80 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Generate AI Assignment</h3>
                <p className="text-xs text-muted-foreground">Specify topic & difficulty for AI problem set creation</p>
              </div>
            </div>

            <form onSubmit={handleGenerateAIAssignment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Assignment Topic / Prompt</label>
                <Input
                  placeholder="e.g. Recurrent Neural Networks & LSTM Backpropagation"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Difficulty Level</label>
                <div className="flex gap-2">
                  {(["easy", "medium", "hard"] as const).map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant={difficulty === d ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setDifficulty(d)}
                      className="capitalize font-bold text-xs flex-1 rounded-xl"
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button type="button" variant="ghost" onClick={() => setIsAIModalOpen(false)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={isGeneratingAI} className="rounded-xl font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isGeneratingAI && <Loader2 className="h-4 w-4 animate-spin" />}
                  Generate & Publish
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default TeacherAssignmentsPage
