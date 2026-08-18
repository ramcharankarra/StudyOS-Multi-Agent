import React, { useState } from "react"
import { motion } from "framer-motion"
import { Sparkles, Copy, Check, Bot } from "lucide-react"

interface AIResponseCardProps {
  title?: string
  content: string
  agentName?: string
}

export const AIResponseCard: React.FC<AIResponseCardProps> = ({
  title = "StudyOS AI Response",
  content,
  agentName = "LearningAgent"
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl border border-primary/20 bg-card/95 shadow-md shadow-primary/5 space-y-3 relative text-left"
    >
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="font-bold text-xs font-heading">{title}</span>
          <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
            {agentName}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Copy Response"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="text-xs text-foreground/90 leading-relaxed font-sans whitespace-pre-wrap">
        {content}
      </div>
    </motion.div>
  )
}
export default AIResponseCard
