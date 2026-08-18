import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "outline" | "ghost" | "link"
  size?: "sm" | "md" | "lg" | "icon"
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, type = "button", ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center font-bold tracking-tight rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none"
    
    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/20 border-b-2 border-black/15",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/95 shadow-md shadow-secondary/20 border-b-2 border-black/15",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/95 shadow-md border-b-2 border-black/15",
      outline: "bg-card text-foreground hover:bg-muted border border-border/80 shadow-xs",
      ghost: "hover:bg-muted text-foreground",
      link: "text-primary underline-offset-4 hover:underline bg-transparent p-0 h-auto"
    }

    const sizes = {
      sm: "h-9 px-3.5 text-xs rounded-xl",
      md: "h-10.5 px-5 text-xs",
      lg: "h-12 px-6 text-sm",
      icon: "h-9 w-9 p-0 rounded-xl"
    }

    const btnElement = (
      <button
        type={type}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        ref={ref}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" />
            <span>Processing...</span>
          </>
        ) : (
          children
        )}
      </button>
    )

    return (
      <motion.div
        className="inline-block"
        whileHover={disabled || isLoading ? {} : { y: -1 }}
        whileTap={disabled || isLoading ? {} : { scale: 0.96 }}
        transition={{ type: "spring", stiffness: 450, damping: 20 }}
      >
        {btnElement}
      </motion.div>
    )
  }
)

Button.displayName = "Button"
