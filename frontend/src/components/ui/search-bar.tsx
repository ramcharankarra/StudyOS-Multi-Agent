import React, { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Search, BookOpen, FileText, ClipboardList, HelpCircle, Megaphone, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"

interface SearchResultItem {
  id: string
  title: string
  description?: string
  link: string
}

interface SearchResults {
  courses: SearchResultItem[]
  materials: SearchResultItem[]
  assignments: SearchResultItem[]
  quizzes: SearchResultItem[]
  announcements: SearchResultItem[]
}

interface SearchBarProps {
  placeholder?: string
  className?: string
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search workspace... (Press ⌘K)",
  className,
}) => {
  const navigate = useNavigate()
  const { apiFetch } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Perform backend search
  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null)
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    try {
      const res = await apiFetch(`/api/v1/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results)
        setIsOpen(true)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, performSearch])

  const handleSelectResult = (link: string) => {
    setIsOpen(false)
    setQuery("")
    navigate(link)
  }

  const hasResults = results && (
    results.courses.length > 0 ||
    results.materials.length > 0 ||
    results.assignments.length > 0 ||
    results.quizzes.length > 0 ||
    results.announcements.length > 0
  )

  return (
    <div ref={dropdownRef} className={cn("relative w-full max-w-md select-none", className)}>
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
          className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-12 text-xs font-medium transition-all placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary shadow-xs"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
        ) : (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground tracking-wide uppercase">
            <span>⌘</span>
            <span>K</span>
          </div>
        )}
      </div>

      {/* Live Dropdown Results */}
      {isOpen && query.trim() && (
        <div className="absolute left-0 right-0 top-12 z-50 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl p-3 space-y-3 text-left max-h-96 overflow-y-auto">
          {!hasResults ? (
            <p className="text-xs text-muted-foreground text-center py-4">No matching records found in database.</p>
          ) : (
            <>
              {results.courses.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-2">Courses</span>
                  {results.courses.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectResult(item.link)}
                      className="p-2 rounded-xl hover:bg-muted cursor-pointer transition-all flex items-center gap-2 text-xs font-bold text-foreground"
                    >
                      <BookOpen className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {results.materials.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-2">Materials</span>
                  {results.materials.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectResult(item.link)}
                      className="p-2 rounded-xl hover:bg-muted cursor-pointer transition-all flex items-center gap-2 text-xs font-bold text-foreground"
                    >
                      <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {results.assignments.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-2">Assignments</span>
                  {results.assignments.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectResult(item.link)}
                      className="p-2 rounded-xl hover:bg-muted cursor-pointer transition-all flex items-center gap-2 text-xs font-bold text-foreground"
                    >
                      <ClipboardList className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {results.quizzes.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-2">Quizzes</span>
                  {results.quizzes.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectResult(item.link)}
                      className="p-2 rounded-xl hover:bg-muted cursor-pointer transition-all flex items-center gap-2 text-xs font-bold text-foreground"
                    >
                      <HelpCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
export default SearchBar
