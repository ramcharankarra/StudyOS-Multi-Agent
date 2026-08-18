import React from "react"
import { CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

interface SuccessStateProps {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export const SuccessState: React.FC<SuccessStateProps> = ({
  title = "Syllabus completed successfully!",
  description = "Excellent work completing all assigned tasks. Keep up the high learning pace!",
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 select-none max-w-lg mx-auto">
      
      {/* Animated Bouncy Checkmark Circle */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-6 border border-emerald-500/20 shadow-inner"
      >
        <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-lg font-extrabold text-foreground tracking-tight mb-2"
      >
        {title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-muted-foreground/85 leading-relaxed font-medium mb-6 max-w-sm"
      >
        {description}
      </motion.p>

      {actionLabel && onAction && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button onClick={onAction} variant="secondary" size="md">
            {actionLabel}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </div>
  )
}
export default SuccessState
