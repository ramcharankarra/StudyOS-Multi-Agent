import React from "react"
import { motion } from "framer-motion"
import { User } from "lucide-react"
import { AIAvatar } from "@/components/ai/ai-avatar"

interface ChatMessageProps {
  role: "USER" | "ASSISTANT"
  message: string
  timestamp?: string
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, message, timestamp }) => {
  const isUser = role === "USER"

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {isUser ? (
        <div className="h-9 w-9 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
          <User className="h-4.5 w-4.5" />
        </div>
      ) : (
        <AIAvatar size="md" />
      )}

      <div
        className={`max-w-[80%] p-4 rounded-3xl text-xs leading-relaxed font-sans text-left shadow-xs ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-xs"
            : "bg-card border border-border/80 text-foreground rounded-tl-xs"
        }`}
      >
        <p className="whitespace-pre-wrap">{message}</p>
        {timestamp && (
          <span className={`block text-[9px] mt-1.5 opacity-70 ${isUser ? "text-right text-primary-foreground/80" : "text-left text-muted-foreground"}`}>
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </motion.div>
  )
}
export default ChatMessage
