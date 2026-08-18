import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "destructive" | "outline"
  onDelete?: () => void
  icon?: React.ReactNode
}

export const Chip: React.FC<ChipProps> = ({
  className,
  variant = "outline",
  onDelete,
  icon,
  children,
  ...props
}) => {
  const baseStyles = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all select-none tracking-wide"
  
  const variants = {
    primary: "bg-primary/10 text-primary border border-primary/20",
    secondary: "bg-secondary/10 text-secondary border border-secondary/20",
    success: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400",
    destructive: "bg-destructive/10 text-destructive border border-destructive/20",
    outline: "border border-border/80 text-foreground bg-card"
  }

  return (
    <div
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="leading-none">{children}</span>
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer text-current shrink-0"
        >
          <X className="h-3 w-3 stroke-[2.5]" />
        </button>
      )}
    </div>
  )
}
export default Chip
