import React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  description = "An error occurred while loading this content. Please try again.",
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-2xl border border-destructive/20 bg-destructive/5 select-none max-w-lg mx-auto">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-4">
        <AlertCircle className="h-6 w-6" />
      </div>
      
      <h3 className="text-base font-bold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground/80 leading-relaxed font-medium mb-5">{description}</p>
      
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="bg-card">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Retry Request
        </Button>
      )}
    </div>
  )
}
export default ErrorState
