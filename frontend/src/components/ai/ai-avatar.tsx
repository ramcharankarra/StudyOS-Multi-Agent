import React from "react"
import { Sparkles, Bot } from "lucide-react"

interface AIAvatarProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export const AIAvatar: React.FC<AIAvatarProps> = ({ size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "h-7 w-7 rounded-xl text-xs",
    md: "h-9 w-9 rounded-2xl text-sm",
    lg: "h-12 w-12 rounded-3xl text-base"
  }

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4.5 w-4.5",
    lg: "h-6 w-6"
  }

  return (
    <div className={`flex items-center justify-center bg-gradient-to-tr from-primary via-amber-500 to-emerald-500 text-white shadow-md shadow-primary/20 shrink-0 ${sizeClasses[size]} ${className}`}>
      <Sparkles className={iconSizes[size]} />
    </div>
  )
}
export default AIAvatar
