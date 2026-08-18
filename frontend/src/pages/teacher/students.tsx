import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/context/auth-context"
import { 
  Users, 
  BookOpen, 
  ClipboardList, 
  TrendingUp, 
  Award, 
  Sparkles, 
  BrainCircuit, 
  BarChart3, 
  Megaphone
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { StatCard } from "@/components/ui/stat-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"

interface TeacherStats {
  total_courses: number
  total_students: number
  total_assignments: number
  total_submissions: number
  submission_rate: number
  ai_suggestions: string[]
}

interface AnnouncementItem {
  id: string
  title: string
  description?: string
  priority: string
  course_id: string
  created_at: string
}

export const TeacherStudentsPage: React.FC = () => {
  const { showToast } = useToast()
  const { apiFetch } = useAuth()

  const [stats, setStats] = useState<TeacherStats | null>(null)
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Announcement modal state
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false)
  const [annTitle, setAnnTitle] = useState("")
  const [annDescription, setAnnDescription] = useState("")
  const [annCourseId, setAnnCourseId] = useState("")
  const [courses, setCourses] = useState<{id: string, title: string}[]>([])
  const [isPublishing, setIsPublishing] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [statsRes, annRes, coursesRes] = await Promise.all([
        apiFetch("/api/v1/analytics/teacher"),
        apiFetch("/api/v1/announcements"),
        apiFetch("/api/v1/courses")
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      if (annRes.ok) setAnnouncements(await annRes.json())
      if (coursesRes.ok) {
        const c = await coursesRes.json()
        setCourses(c)
        if (c.length > 0 && !annCourseId) setAnnCourseId(c[0].id)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [apiFetch, annCourseId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!annTitle.trim() || !annCourseId) return

    setIsPublishing(true)
    try {
      const res = await apiFetch("/api/v1/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          course_id: annCourseId,
          title: annTitle,
          description: annDescription,
          priority: "normal"
        })
      })

      if (res.ok) {
        showToast("Announcement published and students notified!", "success")
        setIsAnnouncementOpen(false)
        setAnnTitle("")
        setAnnDescription("")
        fetchData()
      }
    } catch (err) {
      showToast("Failed to publish announcement", "error")
    } finally {
      setIsPublishing(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 text-left select-none max-w-7xl mx-auto pb-12"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[11px] uppercase tracking-wider border border-primary/20">
                Instructor Analytics
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight font-heading">Course Analytics & Insights</h1>
            <p className="text-xs text-muted-foreground">Monitor student engagement, submission rates, and course performance</p>
          </div>
          <Button
            onClick={() => setIsAnnouncementOpen(true)}
            disabled={courses.length === 0}
            className="shadow-md shadow-primary/20 font-bold gap-2 bg-gradient-to-r from-primary via-amber-500 to-emerald-500 text-white border-0 shrink-0"
          >
            <Megaphone className="h-4 w-4" />
            Post Announcement
          </Button>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Total Courses" value={stats?.total_courses ?? 0} description="Published courses" icon={BookOpen} variant="primary" />
        <StatCard label="Enrolled Students" value={stats?.total_students ?? 0} description="Across all courses" icon={Users} variant="accent" />
        <StatCard label="Assignments" value={stats?.total_assignments ?? 0} description={`${stats?.total_submissions ?? 0} submissions`} icon={ClipboardList} variant="success" />
        <StatCard label="Submission Rate" value={`${stats?.submission_rate ?? 0}%`} description="Student engagement" icon={TrendingUp} variant="secondary" />
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Engagement Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading">Course Engagement Overview</CardTitle>
            <CardDescription>Student activity across your published courses</CardDescription>
          </CardHeader>
          <CardContent className="border-t border-border/20 pt-6">
            <div className="space-y-4">
              {[
                { label: "Courses Published", value: stats?.total_courses ?? 0, max: 10, color: "bg-primary" },
                { label: "Students Enrolled", value: stats?.total_students ?? 0, max: 50, color: "bg-amber-500" },
                { label: "Assignments Created", value: stats?.total_assignments ?? 0, max: 20, color: "bg-emerald-500" },
                { label: "Student Submissions", value: stats?.total_submissions ?? 0, max: 100, color: "bg-violet-500" },
              ].map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-foreground">{item.label}</span>
                    <span className="text-muted-foreground">{item.value}</span>
                  </div>
                  <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full ${item.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submission Rate Ring */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="font-heading">Submission Rate</CardTitle>
            <CardDescription>Overall student assignment completion</CardDescription>
          </CardHeader>
          <CardContent className="border-t border-border/20 pt-6 flex-1 flex flex-col items-center justify-center">
            <div className="relative h-36 w-36">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/40" />
                <motion.circle
                  cx="60" cy="60" r="50" fill="none" strokeWidth="10"
                  strokeLinecap="round"
                  className="text-emerald-500"
                  stroke="currentColor"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - (stats?.submission_rate ?? 0) / 100) }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-foreground font-heading">{stats?.submission_rate ?? 0}%</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Engagement</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Insights */}
      {stats?.ai_suggestions && stats.ai_suggestions.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="p-5 bg-gradient-to-r from-primary/10 via-amber-500/10 to-emerald-500/10 border-primary/20 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-primary uppercase tracking-wider font-heading">
              <Sparkles className="h-4 w-4" />
              AI Teaching Insights
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {stats.ai_suggestions.map((s, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-card/80 border border-border/50 flex items-start gap-2.5">
                  <BrainCircuit className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground/90 font-medium leading-relaxed">{s}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Announcements List */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-amber-500" />
              Course Announcements
            </CardTitle>
            <CardDescription>Posted announcements visible to enrolled students</CardDescription>
          </CardHeader>
          <CardContent className="border-t border-border/20 pt-6">
            {announcements.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Megaphone className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-bold text-muted-foreground">No announcements published yet</p>
                <p className="text-xs text-muted-foreground">Post an announcement to notify enrolled students.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div key={a.id} className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground">{a.title}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        a.priority === "urgent" ? "bg-red-500/15 text-red-600" :
                        a.priority === "important" ? "bg-amber-500/15 text-amber-600" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {a.priority}
                      </span>
                    </div>
                    {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                    <span className="text-[10px] text-muted-foreground/70">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Announcement Modal */}
      {isAnnouncementOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-card border border-border/80 rounded-3xl p-6 shadow-2xl text-left"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-primary via-amber-500 to-emerald-500 text-white flex items-center justify-center shadow-md">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg font-heading">Post Announcement</h3>
                <p className="text-xs text-muted-foreground">Students will be notified automatically</p>
              </div>
            </div>

            <form onSubmit={handlePublishAnnouncement} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">Course</label>
                <select
                  value={annCourseId}
                  onChange={(e) => setAnnCourseId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-border/80 bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>

              <Input
                label="Announcement Title"
                type="text"
                placeholder="e.g. Midterm Exam Schedule Update"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                required
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Add additional details for students..."
                  value={annDescription}
                  onChange={(e) => setAnnDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsAnnouncementOpen(false)} disabled={isPublishing}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isPublishing} disabled={!annTitle.trim()} className="font-bold gap-2 shadow-md shadow-primary/20">
                  <Megaphone className="h-4 w-4" />
                  Publish Announcement
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
export default TeacherStudentsPage
