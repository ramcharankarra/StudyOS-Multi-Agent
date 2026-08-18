import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Loader2, AlertCircle, BrainCircuit, Sparkles, BookOpen, Target, Zap } from "lucide-react"

interface ExecutionStep {
  step: string
  agent: string
  status: "completed" | "executing" | "error" | "skipped" | string
  detail: string
}

interface AgentThinkingTimelineProps {
  steps: ExecutionStep[]
  isThinking: boolean
  intent?: string
  executionTimeMs?: number
}

const AGENT_ICONS: Record<string, React.ReactNode> = {
  CoordinatorAgent: <BrainCircuit className="h-3.5 w-3.5" />,
  LearningAgent: <BookOpen className="h-3.5 w-3.5" />,
  AssessmentAgent: <Target className="h-3.5 w-3.5" />,
  PlannerAgent: <Sparkles className="h-3.5 w-3.5" />,
  MemoryAgent: <Zap className="h-3.5 w-3.5" />,
  CourseManagementAgent: <BookOpen className="h-3.5 w-3.5" />,
}

const THINKING_LABELS = [
  "Understanding your question...",
  "Classifying intent...",
  "Retrieving learning context...",
  "Reading course materials...",
  "Checking conversation memory...",
  "Generating response...",
]

export const AgentThinkingTimeline: React.FC<AgentThinkingTimelineProps> = ({
  steps,
  isThinking,
  intent,
  executionTimeMs
}) => {

  if (!isThinking && steps.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex items-start gap-3 text-left"
    >
      {/* AI Avatar */}
      <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-primary via-amber-500 to-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-primary/20 mt-0.5">
        <BrainCircuit className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        {/* Thinking Header */}
        {isThinking && steps.length === 0 && (
          <div className="flex items-center gap-2 py-1.5">
            <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
            <span className="text-xs font-bold text-primary animate-pulse">
              {THINKING_LABELS[Math.floor(Math.random() * THINKING_LABELS.length)]}
            </span>
          </div>
        )}

        {/* Execution Steps Timeline */}
        {steps.length > 0 && (
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1.5">
            {/* Intent Badge */}
            {intent && (
              <div className="flex items-center gap-2 pb-1 border-b border-border/30 mb-1.5">
                <BrainCircuit className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
                  Coordinator Agent
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">
                  Intent: {intent}
                </span>
                {executionTimeMs !== undefined && (
                  <span className="ml-auto text-[10px] text-muted-foreground font-medium">
                    {executionTimeMs}ms
                  </span>
                )}
              </div>
            )}

            {/* Steps */}
            <AnimatePresence>
              {steps.map((step, idx) => {
                const icon = AGENT_ICONS[step.agent] || <Zap className="h-3.5 w-3.5" />
                const statusColor =
                  step.status === "completed" ? "text-emerald-500"
                    : step.status === "executing" ? "text-primary"
                    : step.status === "error" ? "text-red-500"
                    : "text-muted-foreground"

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="flex items-center gap-2 text-xs"
                  >
                    {/* Status Icon */}
                    <div className={`shrink-0 ${statusColor}`}>
                      {step.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                        step.status === "executing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                        step.status === "error" ? <AlertCircle className="h-3.5 w-3.5" /> :
                        <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40" />
                      }
                    </div>

                    {/* Agent Icon */}
                    <div className="text-muted-foreground shrink-0">{icon}</div>

                    {/* Step Detail */}
                    <span className={`truncate font-medium ${step.status === "completed" ? "text-foreground/70" : "text-foreground"}`}>
                      {step.detail}
                    </span>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Thinking spinner at end of active pipeline */}
            {isThinking && (
              <div className="flex items-center gap-2 text-xs pt-1">
                <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                <span className="text-primary font-bold animate-pulse">Aggregating response...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default AgentThinkingTimeline
