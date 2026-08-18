import React from "react"
import { motion } from "framer-motion"
import { Sparkles, ArrowUpRight } from "lucide-react"

interface PromptSuggestionCardProps {
  title: string
  prompt: string
  onClick: (prompt: string) => void
}

export const PromptSuggestionCard: React.FC<PromptSuggestionCardProps> = ({ title, prompt, onClick }) => {
  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(prompt)}
      className="p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/50 text-left cursor-pointer transition-all shadow-xs space-y-1.5 flex flex-col justify-between"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="font-bold text-xs font-heading">{title}</span>
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{prompt}</p>
    </motion.button>
  )
}
export default PromptSuggestionCard
