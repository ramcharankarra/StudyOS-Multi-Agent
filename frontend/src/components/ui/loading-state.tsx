import React from "react"
import { Loader2 } from "lucide-react"

interface LoadingStateProps {
  message?: string
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading contents..."
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 select-none min-h-[200px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
      <p className="text-sm font-semibold text-muted-foreground animate-pulse">
        {message}
      </p>
    </div>
  )
}
export default LoadingState
