import React, { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bot,
  Send,
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  Search,
  BookOpen,
  Check,
  ThumbsUp,
  ThumbsDown,
  Download,
  Paperclip,
  Pin,
  X,
  MessageSquare,
  Code2,
  FileSearch,
  BookMarked
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/context/auth-context"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  message: string
  created_at?: string
}

interface ChatThread {
  session_id: string
  title: string
  message_count: number
  last_active: string
}

export const AIAssistantPage: React.FC = () => {
  const { showToast } = useToast()
  const { user, apiFetch } = useAuth()
  const [searchParams] = useSearchParams()
  const courseIdFromUrl = searchParams.get("course_id") || undefined

  const [threads, setThreads] = useState<ChatThread[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>(`session_${Date.now()}`)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputPrompt, setInputPrompt] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Attached file state
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null)
  const [attachedFileText, setAttachedFileText] = useState<string | null>(null)
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false)

  // Pinned threads map
  const [pinnedSessionIds, setPinnedSessionIds] = useState<Record<string, boolean>>({})

  // Feedback states
  const [likedMessages, setLikedMessages] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Fetch Chat Threads Sidebar History
  const fetchThreads = useCallback(async () => {
    try {
      const res = await apiFetch("/api/v1/ai/threads")
      if (res.ok) {
        const data = await res.json()
        setThreads(data)
      }
    } catch (e) {
      console.error(e)
    }
  }, [apiFetch])

  // Fetch Messages for Active Session
  const fetchMessages = useCallback(async (sessionId: string) => {
    try {
      const res = await apiFetch(`/api/v1/ai/threads/${sessionId}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch (e) {
      console.error(e)
    }
  }, [apiFetch])

  useEffect(() => {
    fetchThreads()
  }, [fetchThreads])

  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId)
    }
  }, [activeSessionId, fetchMessages])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  // Start New Chat Thread
  const handleNewChat = () => {
    const newSession = `session_${Date.now()}`
    setActiveSessionId(newSession)
    setMessages([])
    setAttachedFileName(null)
    setAttachedFileText(null)
  }

  // Handle File Upload Attachment inside Chat
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await apiFetch("/api/v1/ai/chat/upload-file", {
        method: "POST",
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        setAttachedFileName(data.filename)
        setAttachedFileText(data.extracted_text)
        showToast(`Attached '${data.filename}'`, "success")
      } else {
        showToast("Unable to process file. Please try again.", "error")
      }
    } catch (e) {
      showToast("Error processing file upload", "error")
    } finally {
      setIsUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Delete Chat Thread
  const handleDeleteThread = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await apiFetch(`/api/v1/ai/threads/${sessionId}`, { method: "DELETE" })
      if (res.ok) {
        showToast("Conversation deleted", "info")
        fetchThreads()
        if (activeSessionId === sessionId) {
          handleNewChat()
        }
      }
    } catch (e) {
      showToast("Failed to delete conversation", "error")
    }
  }

  const handleTogglePinThread = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPinnedSessionIds((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }))
  }

  // Submit Prompt Directly to AI Assistant LLM Endpoint
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputPrompt
    if (!promptToSend.trim() || isLoading) return

    const tempUserMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      message: attachedFileName ? `[Attached File: ${attachedFileName}]\n${promptToSend}` : promptToSend,
      created_at: new Date().toISOString()
    }

    setMessages((prev) => [...prev, tempUserMsg])
    if (!customPrompt) setInputPrompt("")
    setIsLoading(true)

    try {
      const res = await apiFetch("/api/v1/ai/chat/assistant", {
        method: "POST",
        body: JSON.stringify({
          prompt: promptToSend,
          session_id: activeSessionId,
          attached_file_text: attachedFileText || undefined,
          course_id: courseIdFromUrl
        })
      })

      if (res.ok) {
        const data = await res.json()
        const assistantMsg: ChatMessage = {
          id: `ast_${Date.now()}`,
          role: "assistant",
          message: data.response,
          created_at: new Date().toISOString()
        }
        setMessages((prev) => [...prev, assistantMsg])
        setAttachedFileName(null)
        setAttachedFileText(null)
        fetchThreads()
      } else {
        showToast("Unable to generate a response. Please try again.", "error")
      }
    } catch (e) {
      showToast("Unable to generate a response. Please try again.", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyMessage = (msg: ChatMessage) => {
    navigator.clipboard.writeText(msg.message)
    setCopiedId(msg.id)
    showToast("Copied to clipboard", "success")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleExportChat = () => {
    if (messages.length === 0) return
    const formatted = messages.map((m) => `### ${m.role.toUpperCase()}\n${m.message}\n`).join("\n---\n\n")
    const blob = new Blob([formatted], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `AI_Assistant_Conversation.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast("Conversation exported", "success")
  }

  // Group threads into timeline sections
  const now = new Date()
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayMs = todayMs - 86400000
  const sevenDaysMs = todayMs - 7 * 86400000

  const filteredThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pinnedThreads = filteredThreads.filter((t) => pinnedSessionIds[t.session_id])
  const unpinnedThreads = filteredThreads.filter((t) => !pinnedSessionIds[t.session_id])

  const todayThreads: ChatThread[] = []
  const yesterdayThreads: ChatThread[] = []
  const last7DaysThreads: ChatThread[] = []
  const olderThreads: ChatThread[] = []

  unpinnedThreads.forEach((t) => {
    const tMs = new Date(t.last_active).getTime()
    if (tMs >= todayMs) todayThreads.push(t)
    else if (tMs >= yesterdayMs) yesterdayThreads.push(t)
    else if (tMs >= sevenDaysMs) last7DaysThreads.push(t)
    else olderThreads.push(t)
  })

  // 4 Clean suggestion cards
  const suggestionCards = [
    { title: "Explain a concept", prompt: "Explain a complex topic clearly with key principles and examples", icon: BookOpen },
    { title: "Analyze a document", prompt: "Analyze and summarize the key findings of this document", icon: FileSearch },
    { title: "Write or debug code", prompt: "Write clean code or debug an issue with detailed explanation", icon: Code2 },
    { title: "Create study material", prompt: "Generate structured study notes and flashcards for review", icon: BookMarked }
  ]

  return (
    <div className="h-[calc(100vh-5rem)] flex gap-4 select-none max-w-7xl mx-auto overflow-hidden text-left font-sans">
      
      {/* SIDEBAR: CONVERSATION HISTORY */}
      <div className="w-64 bg-card border border-border/80 rounded-3xl flex flex-col overflow-hidden shrink-0 shadow-xs">
        
        {/* NEW CHAT BUTTON */}
        <div className="p-3.5 border-b border-border/60 space-y-2.5">
          <Button
            onClick={handleNewChat}
            className="w-full font-bold text-xs gap-2 rounded-2xl h-10 shadow-xs bg-foreground text-background hover:bg-foreground/90"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>

          {/* SEARCH CHATS */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border/60 bg-muted/20 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
            />
          </div>
        </div>

        {/* THREADS TIMELINE LIST */}
        <div className="p-2 overflow-y-auto flex-1 space-y-3">
          {pinnedThreads.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pinned</div>
              {pinnedThreads.map((t) => (
                <ThreadRow
                  key={t.session_id}
                  thread={t}
                  isActive={t.session_id === activeSessionId}
                  isPinned={true}
                  onSelect={() => setActiveSessionId(t.session_id)}
                  onPin={(e) => handleTogglePinThread(t.session_id, e)}
                  onDelete={(e) => handleDeleteThread(t.session_id, e)}
                />
              ))}
            </div>
          )}

          {todayThreads.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Today</div>
              {todayThreads.map((t) => (
                <ThreadRow
                  key={t.session_id}
                  thread={t}
                  isActive={t.session_id === activeSessionId}
                  isPinned={false}
                  onSelect={() => setActiveSessionId(t.session_id)}
                  onPin={(e) => handleTogglePinThread(t.session_id, e)}
                  onDelete={(e) => handleDeleteThread(t.session_id, e)}
                />
              ))}
            </div>
          )}

          {yesterdayThreads.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Yesterday</div>
              {yesterdayThreads.map((t) => (
                <ThreadRow
                  key={t.session_id}
                  thread={t}
                  isActive={t.session_id === activeSessionId}
                  isPinned={false}
                  onSelect={() => setActiveSessionId(t.session_id)}
                  onPin={(e) => handleTogglePinThread(t.session_id, e)}
                  onDelete={(e) => handleDeleteThread(t.session_id, e)}
                />
              ))}
            </div>
          )}

          {last7DaysThreads.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Previous 7 Days</div>
              {last7DaysThreads.map((t) => (
                <ThreadRow
                  key={t.session_id}
                  thread={t}
                  isActive={t.session_id === activeSessionId}
                  isPinned={false}
                  onSelect={() => setActiveSessionId(t.session_id)}
                  onPin={(e) => handleTogglePinThread(t.session_id, e)}
                  onDelete={(e) => handleDeleteThread(t.session_id, e)}
                />
              ))}
            </div>
          )}

          {olderThreads.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Older</div>
              {olderThreads.map((t) => (
                <ThreadRow
                  key={t.session_id}
                  thread={t}
                  isActive={t.session_id === activeSessionId}
                  isPinned={false}
                  onSelect={() => setActiveSessionId(t.session_id)}
                  onPin={(e) => handleTogglePinThread(t.session_id, e)}
                  onDelete={(e) => handleDeleteThread(t.session_id, e)}
                />
              ))}
            </div>
          )}

          {filteredThreads.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-6">No conversations found</p>
          )}
        </div>
      </div>

      {/* MAIN CONVERSATION WINDOW */}
      <div className="flex-1 bg-card border border-border/80 rounded-3xl flex flex-col overflow-hidden shadow-xs">
        
        {/* CLEAN MINIMAL HEADER */}
        <div className="px-6 py-3.5 border-b border-border/60 flex items-center justify-between bg-muted/10">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold font-heading text-foreground">MindOS</h1>
            <span className="text-[10px] font-semibold text-primary/80 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              Think. Learn. Create.
            </span>
          </div>

          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleExportChat} className="rounded-xl text-xs text-muted-foreground hover:text-foreground">
              <Download className="h-3.5 w-3.5 mr-1" /> Export
            </Button>
          )}
        </div>

        {/* MESSAGES & EMPTY SCREEN CONTAINER */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-card">
          {messages.length === 0 ? (
            /* CLEAN CHATGPT-STYLE EMPTY SCREEN */
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto space-y-8 text-center py-8">
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-extrabold font-heading text-foreground tracking-tight">
                  MindOS
                </h2>
                <p className="text-xs font-bold text-primary tracking-widest font-heading uppercase">
                  Think. Learn. Create.
                </p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed pt-1">
                  General-purpose AI assistant for coding, math, research, writing, brainstorming, and file analysis.
                </p>
                <div className="pt-3">
                  <Button onClick={handleNewChat} variant="outline" className="font-bold text-xs rounded-xl px-5 h-9">
                    New Conversation
                  </Button>
                </div>
              </div>

              {/* 4 CLEAN SUGGESTION CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left pt-4">
                {suggestionCards.map((card, idx) => {
                  const IconComp = card.icon
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(card.prompt)}
                      className="p-4 rounded-2xl border border-border/80 hover:border-foreground/30 bg-muted/10 hover:bg-muted/30 transition-all text-left flex items-start gap-3 group cursor-pointer"
                    >
                      <div className="p-2 rounded-xl bg-muted/40 text-foreground shrink-0 group-hover:bg-foreground group-hover:text-background transition-colors">
                        <IconComp className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="font-bold text-xs text-foreground font-heading">{card.title}</h4>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            /* CHAT MESSAGES */
            messages.map((m) => {
              const isUser = m.role === "user"
              return (
                <div
                  key={m.id}
                  className={`flex gap-4 max-w-4xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto w-full"}`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isUser
                        ? "bg-foreground text-background"
                        : "bg-muted text-foreground border border-border/80"
                    }`}
                  >
                    {isUser ? user?.name?.[0] || "U" : <Bot className="h-4 w-4" />}
                  </div>

                  <div className={`space-y-2 min-w-0 ${isUser ? "max-w-xl" : "flex-1"}`}>
                    <div
                      className={`p-4 text-xs md:text-sm leading-relaxed ${
                        isUser
                          ? "bg-foreground text-background rounded-3xl rounded-tr-xs"
                          : "bg-transparent text-foreground font-sans border-0 p-0"
                      }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap font-sans">{m.message}</div>
                      ) : (
                        <MarkdownRenderer content={m.message} />
                      )}
                    </div>

                    {/* ASSISTANT ACTION TOOLBAR (COPY, REGENERATE, LIKE/DISLIKE ONLY) */}
                    {!isUser && (
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleCopyMessage(m)}
                            className="hover:text-foreground flex items-center gap-1 cursor-pointer"
                            title="Copy"
                          >
                            {copiedId === m.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copiedId === m.id ? "Copied" : "Copy"}</span>
                          </button>
                          <button
                            onClick={() => handleSendMessage(messages[messages.length - 2]?.message || m.message)}
                            className="hover:text-foreground flex items-center gap-1 cursor-pointer"
                            title="Regenerate"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Regenerate</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setLikedMessages(prev => ({ ...prev, [m.id]: true }))}
                            className={`hover:text-foreground ${likedMessages[m.id] === true ? "text-emerald-500" : ""}`}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setLikedMessages(prev => ({ ...prev, [m.id]: false }))}
                            className={`hover:text-foreground ${likedMessages[m.id] === false ? "text-red-500" : ""}`}
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}

          {/* ANIMATED THINKING INDICATOR */}
          {isLoading && (
            <div className="flex items-center gap-3 max-w-xl text-xs text-muted-foreground py-2">
              <div className="h-7 w-7 rounded-full bg-muted border border-border/80 flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-foreground animate-pulse" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* INPUT PROMPT FOOTER & ATTACHMENT */}
        <div className="p-4 border-t border-border/60 bg-muted/10 space-y-2">
          {attachedFileName && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-muted border border-border text-xs text-foreground font-medium max-w-fit mx-auto">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{attachedFileName}</span>
              <button onClick={() => { setAttachedFileName(null); setAttachedFileText(null) }} className="hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="relative flex items-center max-w-3xl mx-auto gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              isLoading={isUploadingFile}
              className="rounded-2xl shrink-0 text-muted-foreground hover:text-foreground"
              title="Attach File"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <textarea
              rows={1}
              placeholder="Message MindOS..."
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              className="w-full pl-4 pr-12 py-3 rounded-2xl border border-border/80 bg-background text-xs md:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/40 resize-none font-sans"
            />
            <Button
              size="icon"
              disabled={!inputPrompt.trim() || isLoading}
              onClick={() => handleSendMessage()}
              className="absolute right-2 rounded-xl h-8 w-8 shadow-xs bg-foreground text-background hover:bg-foreground/90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}

function ThreadRow({
  thread,
  isActive,
  isPinned,
  onSelect,
  onPin,
  onDelete
}: {
  thread: ChatThread
  isActive: boolean
  isPinned: boolean
  onSelect: () => void
  onPin: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`p-2.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer group ${
        isActive
          ? "bg-muted text-foreground font-bold border border-border/80"
          : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 pr-2">
        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{thread.title}</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onPin}
          className={`p-1 rounded-md transition-all ${
            isPinned ? "text-amber-500" : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
          }`}
          title={isPinned ? "Unpin" : "Pin"}
        >
          <Pin className={`h-3 w-3 ${isPinned ? "fill-current" : ""}`} />
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
          title="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

export default AIAssistantPage
