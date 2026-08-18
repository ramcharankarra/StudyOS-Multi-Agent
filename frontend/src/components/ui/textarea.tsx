import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, rows = 4, ...props }, ref) => {
    return (
      <div className="w-full text-left space-y-1.5">
        {label && (
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 pl-0.5">
            {label}
          </label>
        )}
        <textarea
          rows={rows}
          className={cn(
            "flex w-full rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-sm ring-offset-background transition-all placeholder:text-muted-foreground/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:bg-card focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 duration-200 resize-none",
            error && "border-destructive/80 focus-visible:ring-destructive focus-visible:border-destructive",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-xs font-semibold text-destructive pl-0.5 animate-in fade-in duration-200">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = "Textarea"
