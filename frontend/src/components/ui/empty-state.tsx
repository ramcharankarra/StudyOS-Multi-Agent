import React from "react"
import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-2xl border border-dashed border-border/80 bg-card/65 select-none"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border-b-2 border-black/10 shadow-inner mb-5">
        <Icon className="h-7 w-7" />
      </div>
      
      <h3 className="text-lg font-extrabold text-foreground tracking-tight mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-muted-foreground/80 max-w-sm mb-6 leading-relaxed font-medium">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </motion.div>
  )
}
export default EmptyState
