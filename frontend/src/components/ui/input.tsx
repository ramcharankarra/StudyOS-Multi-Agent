import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full text-left space-y-1.5">
        {label && (
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 pl-0.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-muted-foreground/60 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-11 w-full rounded-xl border border-border/80 bg-muted/30 px-4 py-2 text-sm ring-offset-background transition-all placeholder:text-muted-foreground/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:bg-card focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 duration-200",
              icon && "pl-11",
              error && "border-destructive/80 focus-visible:ring-destructive focus-visible:border-destructive",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs font-semibold text-destructive pl-0.5 animate-in fade-in duration-200">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"
