import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { resolveFileUrl } from "@/utils/url-resolver"
import { 
  FileText, 
  Search, 
  Download, 
  BookOpen, 
  Sparkles, 
  File, 
  CheckCircle2, 
  ExternalLink 
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import type { Material, Course } from "@/types"

export const StudentMaterialsPage: React.FC = () => {
  const { apiFetch } = useAuth()

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [materials, setMaterials] = useState<Material[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedType, setSelectedType] = useState<string>("ALL")

  // Fetch enrolled courses
  const fetchCourses = useCallback(async () => {
    try {
      const res = await apiFetch("/api/v1/courses/enrolled")
      if (res.ok) {
        const data = await res.json()
        setCourses(data)
        if (data.length > 0 && !selectedCourseId) {
          setSelectedCourseId(data[0].id)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }, [apiFetch, selectedCourseId])

  // Fetch materials for selected course
  const fetchMaterials = useCallback(async () => {
    if (!selectedCourseId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await apiFetch(`/api/v1/materials/course/${selectedCourseId}`)
      if (res.ok) {
        const data = await res.json()
        setMaterials(data)
      } else {
        setMaterials([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCourseId])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  useEffect(() => {
    if (selectedCourseId) {
      fetchMaterials()
    }
  }, [selectedCourseId, fetchMaterials])

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ((m as any).description && (m as any).description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesType = selectedType === "ALL" || m.file_type === selectedType
    return matchesSearch && matchesType
  })

  const getFileBadgeColor = (type: string) => {
    switch (type) {
      case "PDF": return "bg-red-500/15 text-red-600 border-red-500/25"
      case "PPT": return "bg-amber-500/15 text-amber-600 border-amber-500/25"
      case "DOCX": return "bg-blue-500/15 text-blue-600 border-blue-500/25"
      case "IMAGE": return "bg-emerald-500/15 text-emerald-600 border-emerald-500/25"
      default: return "bg-primary/15 text-primary border-primary/25"
    }
  }

  return (
    <div className="space-y-6 text-left select-none max-w-7xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[11px] uppercase tracking-wider border border-primary/20">
              Learning Hub
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-heading">Learning Materials & Notes</h1>
          <p className="text-xs text-muted-foreground">Access slides, PDFs, and documents published by your course instructors</p>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="p-4 bg-card/80 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Course Selector */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">Select Course:</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-border/80 bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[200px]"
            >
              {courses.length === 0 ? (
                <option value="">No enrolled courses</option>
              ) : (
                courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))
              )}
            </select>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notes & documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-border/80 bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {["ALL", "PDF", "PPT", "DOCX", "TXT", "IMAGE"].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedType === t
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Materials Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 rounded-2xl bg-muted/40 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border/80 bg-gradient-to-b from-card to-muted/20">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary mb-4 shadow-sm">
            <BookOpen className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold font-heading mb-1">No materials available</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed mb-4">
            Your teacher has not uploaded learning resources for this course yet. Check back soon or request course slides.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMaterials.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="hover-lift border-border/80 flex flex-col justify-between h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase border ${getFileBadgeColor(m.file_type)}`}>
                      {m.file_type}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      Ready
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-base text-foreground font-heading line-clamp-1">{m.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-sans">
                      {(m as any).description || "Course study document."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 border-t border-border/20 pt-3">
                    <span>{((m as any).file_size ? ((m as any).file_size / (1024 * 1024)).toFixed(2) : "1.20")} MB</span>
                    <span>{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>

                  <a
                    href={resolveFileUrl(m.file_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all text-center shadow-md shadow-primary/20"
                  >
                    <Download className="h-4 w-4" />
                    Download / View Document
                  </a>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

    </div>
  )
}
export default StudentMaterialsPage
