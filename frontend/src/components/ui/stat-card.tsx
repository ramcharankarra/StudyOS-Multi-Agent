import React from "react"
import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  description?: string
  icon: LucideIcon
  variant?: "primary" | "secondary" | "accent" | "success"
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  description,
  icon: Icon,
  variant = "primary",
  className,
}) => {
  const iconVariants = {
    primary: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary/10 text-secondary border-secondary/20",
    accent: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
  }

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card className={cn("overflow-hidden border-border/80 bg-card/90 backdrop-blur-xs transition-shadow duration-300 hover:shadow-lg hover:border-primary/40", className)}>
        <CardContent className="p-6 flex items-center justify-between">
          <div className="space-y-1.5 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <h4 className="text-2xl font-extrabold tracking-tight text-foreground font-heading">
              {value}
            </h4>
            {description && (
              <p className="text-xs text-muted-foreground/80 font-medium">
                {description}
              </p>
            )}
          </div>
          
          <motion.div
            whileHover={{ scale: 1.1, rotate: 3 }}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl border shadow-xs shrink-0 transition-all",
              iconVariants[variant]
            )}
          >
            <Icon className="h-5.5 w-5.5" />
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
export default StatCard
