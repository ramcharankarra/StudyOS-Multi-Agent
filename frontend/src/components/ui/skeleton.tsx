import React from "react"
import { cn } from "@/lib/utils"

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-muted/65 border border-border/10",
        className
      )}
      {...props}
    />
  )
}
export default Skeleton
