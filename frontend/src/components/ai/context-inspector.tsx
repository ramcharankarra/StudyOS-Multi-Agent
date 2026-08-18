import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  BrainCircuit, 
  BookOpen, 
  FileText, 
  BellRing, 
  CheckSquare, 
  HelpCircle, 
  Layers, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Cpu
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/auth-context"

interface ContextInspectorData {
  target_course: { id: string; title: string; description?: string } | null
  enrolled_courses: { id: string; title: string }[]
  materials_count: number
  announcements_count: number
  assignments_count: number
  quizzes_count: number
  discussions_count: number
  planner_events_count: number
  weak_topics: string[]
  strong_topics: string[]
  rag_chunks_indexed: number
  materials: { id: string; title: string; file_type: string }[]
  announcements: { id: string; title: string; priority: string }[]
  assignments: { id: string; title: string; due_date: string }[]
}

export const ContextInspector: React.FC<{ currentGoal?: string }> = React.memo(({ currentGoal }) => {
  const { apiFetch } = useAuth()
  const [data, setData] = useState<ContextInspectorData | null>(null)
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    let isMounted = true
    const fetchContextInspector = async () => {
      try {
        const res = await apiFetch(`/api/v1/context/inspector?goal=${encodeURIComponent(currentGoal || "")}`)
        if (res.ok && isMounted) {
          const result = await res.json()
          setData(result)
        }
      } catch (e) {
        console.error("Context Inspector fetch failed:", e)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchContextInspector()
    return () => { isMounted = false }
  }, [apiFetch])

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl bg-card border border-border/60 p-4 animate-pulse flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-primary animate-spin" />
          <span>Discovering Classroom Brain Intelligence...</span>
        </div>
      </div>
    )
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-card via-primary/5 to-card shadow-sm overflow-hidden text-left">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Header Summary */}
        <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/20 shadow-sm shrink-0">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-foreground font-heading">AI Classroom Brain</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-extrabold bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Auto-Discovered
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {data.target_course ? `Matched: ${data.target_course.title}` : `Accessing ${data.enrolled_courses.length} enrolled courses`} • {data.rag_chunks_indexed} RAG Knowledge Chunks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-3 text-xs font-bold text-muted-foreground pr-2">
              <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-blue-500" /> {data.materials_count} PDFs</span>
              <span className="flex items-center gap-1"><BellRing className="h-3.5 w-3.5 text-amber-500" /> {data.announcements_count} Notices</span>
              <span className="flex items-center gap-1"><CheckSquare className="h-3.5 w-3.5 text-emerald-500" /> {data.assignments_count} Tasks</span>
            </div>
            <button className="p-1 rounded-lg hover:bg-muted/80 text-muted-foreground">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Detailed Inspection Drawer */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-4 pt-3 border-t border-border/50 text-xs"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-background/80 border border-border/60 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-blue-500" /> Materials & PDFs
                  </span>
                  <p className="font-extrabold text-sm text-foreground">{data.materials_count} Indexed</p>
                </div>

                <div className="p-3 rounded-xl bg-background/80 border border-border/60 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <BellRing className="h-3.5 w-3.5 text-amber-500" /> Teacher Notices
                  </span>
                  <p className="font-extrabold text-sm text-foreground">{data.announcements_count} Announcements</p>
                </div>

                <div className="p-3 rounded-xl bg-background/80 border border-border/60 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <CheckSquare className="h-3.5 w-3.5 text-emerald-500" /> Assignments
                  </span>
                  <p className="font-extrabold text-sm text-foreground">{data.assignments_count} Active</p>
                </div>

                <div className="p-3 rounded-xl bg-background/80 border border-border/60 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Cpu className="h-3.5 w-3.5 text-violet-500" /> RAG Knowledge
                  </span>
                  <p className="font-extrabold text-sm text-foreground">{data.rag_chunks_indexed} Chunks</p>
                </div>
              </div>

              {/* Resource List Snippets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Discovered PDFs */}
                {data.materials.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Discovered Course Materials:</span>
                    <div className="space-y-1">
                      {data.materials.map((m) => (
                        <div key={m.id} className="p-2 rounded-lg bg-card border border-border/50 font-bold flex items-center justify-between text-foreground">
                          <span className="truncate">{m.title}</span>
                          <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono shrink-0">{m.file_type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discovered Announcements */}
                {data.announcements.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Discovered Teacher Announcements:</span>
                    <div className="space-y-1">
                      {data.announcements.map((a) => (
                        <div key={a.id} className="p-2 rounded-lg bg-card border border-border/50 font-bold flex items-center justify-between text-foreground">
                          <span className="truncate">{a.title}</span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 text-[10px] font-extrabold shrink-0">{a.priority}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
})
