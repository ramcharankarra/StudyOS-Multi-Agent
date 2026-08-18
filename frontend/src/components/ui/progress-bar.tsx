import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ProgressBarProps {
  value: number // 0 to 100
  variant?: "primary" | "secondary" | "success"
  showLabel?: boolean
  className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  variant = "primary",
  showLabel = false,
  className
}) => {
  const percentage = Math.min(Math.max(value, 0), 100)

  const variants = {
    primary: "bg-primary",
    secondary: "bg-secondary",
    success: "bg-emerald-500"
  }

  return (
    <div className={cn("w-full space-y-1.5 select-none", className)}>
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
        {showLabel && <span>Progress</span>}
        {showLabel && <span>{Math.round(percentage)}%</span>}
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted border border-border/10">
        <motion.div
          className={cn("h-full rounded-full", variants[variant])}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
        />
      </div>
    </div>
  )
}
export default ProgressBar
