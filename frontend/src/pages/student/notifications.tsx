import React, { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Bell, 
  CheckCircle2, 
  Trash2, 
  BookOpen, 
  HelpCircle, 
  Award, 
  Sparkles, 
  ClipboardList, 
  Megaphone,
  Flame,
  BrainCircuit,
  Check,
  MessageSquare,
  Send,
  Clock
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/context/auth-context"

interface NotificationItem {
  id: string
  title: string
  description?: string
  type: string
  is_read: boolean
  link?: string
  created_at: string
}

interface AnnouncementItem {
  id: string
  title: string
  description: string
  priority: "normal" | "important" | "urgent"
  course_id: string
  course_name: string
  teacher_name: string
  comment_count: number
  created_at: string
}

interface CommentItem {
  id: string
  author_id: string
  author_name: string
  author_role: string
  content: string
  created_at: string
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  assignment: <ClipboardList className="h-4 w-4" />,
  quiz: <HelpCircle className="h-4 w-4" />,
  grade: <Award className="h-4 w-4" />,
  announcement: <Megaphone className="h-4 w-4" />,
  ai_recommendation: <BrainCircuit className="h-4 w-4" />,
  streak: <Flame className="h-4 w-4" />,
  achievement: <Sparkles className="h-4 w-4" />,
  general: <Bell className="h-4 w-4" />,
}

const TYPE_COLORS: Record<string, string> = {
  assignment: "bg-primary/15 text-primary border-primary/25",
  quiz: "bg-amber-500/15 text-amber-600 border-amber-500/25",
  grade: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
  announcement: "bg-violet-500/15 text-violet-600 border-violet-500/25",
  ai_recommendation: "bg-primary/15 text-primary border-primary/25",
  streak: "bg-red-500/15 text-red-600 border-red-500/25",
  achievement: "bg-amber-500/15 text-amber-600 border-amber-500/25",
  general: "bg-muted text-muted-foreground border-border/40",
}

export const NotificationsPage: React.FC = () => {
  const { showToast } = useToast()
  const { apiFetch } = useAuth()
  const [activeTab, setActiveTab] = useState<"announcements" | "notifications">("announcements")
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Comments State
  const [activeCommentsAnnId, setActiveCommentsAnnId] = useState<string | null>(null)
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentItem[]>>({})
  const [newCommentText, setNewCommentText] = useState("")
  const [isCommenting, setIsCommenting] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [notifRes, annRes] = await Promise.all([
        apiFetch("/api/v1/notifications"),
        apiFetch("/api/v1/announcements")
      ])
      if (notifRes.ok) setNotifications(await notifRes.json())
      if (annRes.ok) setAnnouncements(await annRes.json())
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleMarkAllRead = async () => {
    try {
      const res = await apiFetch("/api/v1/notifications/read", { method: "PUT" })
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        showToast("All notifications marked as read", "success")
      }
    } catch (e) {
      showToast("Failed to update", "error")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await apiFetch(`/api/v1/notifications/${id}`, { method: "DELETE" })
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
        showToast("Notification removed", "info")
      }
    } catch (e) {
      showToast("Failed to delete", "error")
    }
  }

  const toggleComments = async (annId: string) => {
    if (activeCommentsAnnId === annId) {
      setActiveCommentsAnnId(null)
      return
    }

    setActiveCommentsAnnId(annId)
    try {
      const res = await apiFetch(`/api/v1/announcements/${annId}/comments`)
      if (res.ok) {
        const comments = await res.json()
        setCommentsMap((prev) => ({ ...prev, [annId]: comments || [] }))
      }
    } catch (err: any) {
      showToast("Failed to load discussion comments", "error")
    }
  }

  const handlePostComment = async (annId: string) => {
    if (!newCommentText.trim()) return

    try {
      setIsCommenting(true)
      const res = await apiFetch(`/api/v1/announcements/${annId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: newCommentText.trim() })
      })

      if (res.ok) {
        const newComment = await res.json()
        setCommentsMap((prev) => ({
          ...prev,
          [annId]: [...(prev[annId] || []), newComment]
        }))
        setNewCommentText("")
        showToast("Comment posted", "success")
      } else {
        const errData = await res.json().catch(() => ({}))
        showToast(errData.detail || "Failed to post comment", "error")
      }
    } catch (err: any) {
      showToast("Failed to post comment", "error")
    } finally {
      setIsCommenting(false)
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[11px] uppercase tracking-wider border border-primary/20">
              Classroom & Updates
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {unreadCount} new
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-heading">Announcements & Notifications</h1>
          <p className="text-xs text-muted-foreground mt-1">Course announcements, exam updates, and discussions</p>
        </div>

        <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-2xl border border-border/60 shrink-0">
          <Button
            variant={activeTab === "announcements" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("announcements")}
            className="font-bold text-xs gap-1.5 rounded-xl"
          >
            <Megaphone className="h-4 w-4" /> Announcements ({announcements.length})
          </Button>
          <Button
            variant={activeTab === "notifications" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("notifications")}
            className="font-bold text-xs gap-1.5 rounded-xl"
          >
            <Bell className="h-4 w-4" /> Alerts ({notifications.length})
          </Button>
        </div>
      </div>

      {/* Announcements Tab */}
      {activeTab === "announcements" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <div key={n} className="h-28 rounded-2xl bg-muted/40 animate-pulse border border-border/40" />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-border/80 bg-gradient-to-b from-card to-muted/20 rounded-3xl space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <Megaphone className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold font-heading text-foreground">No Announcements Yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  No announcements published for your enrolled courses yet.
                </p>
              </div>
            </Card>
          ) : (
            announcements.map((ann) => {
              const isCommentsOpen = activeCommentsAnnId === ann.id
              const comments = commentsMap[ann.id] || []

              return (
                <Card key={ann.id} className="overflow-hidden border border-border/70 shadow-xs rounded-2xl transition-all">
                  <CardHeader className="p-5 pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Badge variant="outline" className="font-bold text-[10px] bg-primary/5 text-primary border-primary/20">
                        <BookOpen className="h-3 w-3 mr-1" /> {ann.course_name}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {new Date(ann.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <CardTitle className="text-lg font-bold font-heading pt-1 text-foreground">
                      {ann.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-medium">By {ann.teacher_name}</p>
                  </CardHeader>

                  <CardContent className="p-5 pt-1 space-y-4">
                    {ann.description && (
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line bg-muted/30 p-3.5 rounded-xl border border-border/40">
                        {ann.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between border-t border-border/50 pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleComments(ann.id)}
                        className="font-bold text-xs gap-2 rounded-xl text-primary hover:bg-primary/10"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Discussion ({ann.comment_count || comments.length})
                      </Button>
                    </div>

                    <AnimatePresence>
                      {isCommentsOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 pt-2 border-t border-border/40"
                        >
                          <h4 className="text-xs font-bold text-foreground">Class Discussion</h4>

                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {comments.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic py-2">No comments yet. Be the first enrolled student to comment!</p>
                            ) : (
                              comments.map((c) => (
                                <div key={c.id} className="p-3 rounded-xl bg-background border border-border/60 text-xs space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-foreground flex items-center gap-1.5">
                                      {c.author_name}
                                      <Badge variant="secondary" className="text-[9px] py-0 font-bold capitalize">
                                        {c.author_role}
                                      </Badge>
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-foreground/90 leading-relaxed">{c.content}</p>
                                </div>
                              ))
                            )}
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <Input
                              placeholder="Ask a question or reply..."
                              value={newCommentText}
                              onChange={(e) => setNewCommentText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handlePostComment(ann.id)}
                              className="text-xs rounded-xl h-9"
                            />
                            <Button
                              size="sm"
                              onClick={() => handlePostComment(ann.id)}
                              disabled={isCommenting || !newCommentText.trim()}
                              className="h-9 px-3 font-bold rounded-xl gap-1 shrink-0"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="space-y-3">
          {notifications.length > 0 && (
            <div className="flex justify-end mb-2">
              <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="font-bold gap-2 text-xs">
                <Check className="h-4 w-4" /> Mark All Read
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-20 rounded-2xl bg-muted/40 animate-pulse border border-border/40" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-border/80 bg-gradient-to-b from-card to-muted/20 rounded-3xl space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <Bell className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold font-heading text-foreground">You're All Caught Up</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  No announcements or notifications yet.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-2.5">
              <AnimatePresence>
                {notifications.map((n) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <Card className={`p-4 border-border/80 transition-all ${!n.is_read ? "bg-primary/[0.03] border-l-4 border-l-primary" : "bg-card"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${TYPE_COLORS[n.type] || TYPE_COLORS.general}`}>
                            {TYPE_ICONS[n.type] || TYPE_ICONS.general}
                          </div>
                          <div className="min-w-0">
                            <h4 className={`text-sm font-bold truncate ${!n.is_read ? "text-foreground" : "text-foreground/70"}`}>
                              {n.title}
                            </h4>
                            {n.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{n.description}</p>
                            )}
                            <span className="text-[10px] text-muted-foreground/70 mt-1 block">
                              {new Date(n.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDelete(n.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationsPage
