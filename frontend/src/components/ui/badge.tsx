import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "destructive" | "success" | "warning"
}

export function Badge({ className, variant = "primary", ...props }: BadgeProps) {
  const baseStyles = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors select-none tracking-wide"
  
  const variants = {
    primary: "bg-primary/10 text-primary border border-primary/20",
    secondary: "bg-secondary/10 text-secondary border border-secondary/20",
    accent: "bg-accent/15 text-accent-foreground border border-accent/20",
    outline: "border border-border/80 text-foreground bg-card",
    destructive: "bg-destructive/10 text-destructive border border-destructive/20",
    success: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400"
  }

  return (
    <span className={cn(baseStyles, variants[variant], className)} {...props} />
  )
}
