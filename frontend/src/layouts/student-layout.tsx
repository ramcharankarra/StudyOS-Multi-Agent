import React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useUIStore } from "@/store/ui-store"
import { useThemeStore } from "@/store/theme-store"
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  Bell,
  Sun,
  Moon,
  LogOut,
  User,
  X,
  ClipboardList,
  Sparkles,
  Calendar,
  BarChart3,
  FileText,
  Rocket,
  FolderKanban,
  Bot,
  Megaphone
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchBar } from "@/components/ui/search-bar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/toast"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import { motion, AnimatePresence } from "framer-motion"

import { useAuth } from "@/context/auth-context"

interface StudentLayoutProps {
  children: React.ReactNode
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user, isLoading, logout } = useAuth()

  // Strict Role Guard: Redirect to Teacher Dashboard if logged-in user is a teacher
  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate("/login", { replace: true })
      } else if (user.role.toLowerCase() !== "student") {
        showToast("Access forbidden: Redirected to Teacher Dashboard", "error")
        navigate("/teacher/dashboard", { replace: true })
      }
    }
  }, [user, isLoading, navigate, showToast])

  // Handle logout
  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }
  
  // UI states
  const {
    isSidebarExpanded,
    toggleSidebar,
    isMobileSidebarOpen,
    setMobileSidebarOpen,
  } = useUIStore()
  
  const { theme, toggleTheme } = useThemeStore()

  // Sidebar Grouped Section definition — Workspace is default top item
  const sections = [
    {
      title: "Workspace",
      items: [
        { label: "Mission Workspace", path: "/student/ai-workspace", icon: Rocket },
        { label: "Courses", path: "/student/courses", icon: BookOpen },
        { label: "Materials", path: "/student/materials", icon: FileText },
        { label: "Assignments", path: "/student/assignments", icon: ClipboardList },
        { label: "Quizzes", path: "/student/quizzes", icon: HelpCircle },
      ]
    },
    {
      title: "AI & Tools",
      items: [
        { label: "MindOS", path: "/student/ai-assistant", icon: Bot },
        { label: "Planner", path: "/student/planner", icon: Calendar },
        { label: "Artifacts", path: "/student/artifacts", icon: FolderKanban },
        { label: "Analytics", path: "/student/analytics", icon: BarChart3 },
        { label: "Notifications", path: "/student/notifications", icon: Bell },
      ]
    },
    {
      title: "Account",
      items: [
        { label: "Settings", path: "/student/settings", icon: Settings },
      ]
    }
  ]

  // Flattened items for easy title checking
  const allNavItems = sections.flatMap(sec => sec.items)

  // Map path to active module name for dynamic color palettes
  const getModuleFromPath = (path: string): string => {
    if (path.includes("/student/ai-workspace")) return "ai"
    if (path.includes("/student/courses")) return "courses"
    if (path.includes("/student/assignments")) return "assignments"
    if (path.includes("/student/quizzes")) return "quizzes"
    if (path.includes("/student/planner")) return "planner"
    if (path.includes("/student/artifacts")) return "artifacts"
    if (path.includes("/student/analytics")) return "analytics"
    if (path.includes("/student/notifications")) return "notifications"
    if (path.includes("/student/settings")) return "settings"
    return "ai"
  }

  const activeModule = getModuleFromPath(location.pathname)

  if (isLoading || !user || user.role.toLowerCase() !== "student") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const currentNavItem = allNavItems.find(item => location.pathname.startsWith(item.path))
  const pageTitle = currentNavItem ? currentNavItem.label : "Mission Workspace"

  return (
    <div 
      className="min-h-screen bg-background text-foreground flex overflow-hidden selection:bg-primary/20 selection:text-primary transition-colors duration-300 font-sans"
      data-module={activeModule}
    >
      {/* MOBILE OVERLAY */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR COMPONENT */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-card/85 backdrop-blur-xl border-r border-border/80
          transition-all duration-300 ease-in-out select-none shadow-xs
          ${isSidebarExpanded ? "w-64" : "w-20"}
          ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* LOGO & COLLAPSE HEADER */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border/40">
          <Link to="/student/ai-workspace" className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary via-amber-500 to-emerald-500 text-white shadow-md shadow-primary/20 shrink-0">
              <Rocket className="h-5 w-5" />
            </div>
            {isSidebarExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col text-left"
              >
                <span className="font-extrabold text-base tracking-tight font-heading leading-none">
                  StudyOS
                </span>
                <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mt-0.5">
                  Mission Workspace
                </span>
              </motion.div>
            )}
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="hidden lg:flex h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
          >
            {isSidebarExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* NAVIGATION ITEMS LIST */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-6">
          <TooltipProvider delayDuration={0}>
            {sections.map((section, idx) => (
              <div key={idx} className="space-y-1.5 text-left">
                {isSidebarExpanded && (
                  <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 select-none">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location.pathname.startsWith(item.path)
                    const Icon = item.icon

                    const navContent = (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileSidebarOpen(false)}
                        className={`
                          flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-semibold
                          transition-all duration-200 group relative cursor-pointer
                          ${isActive 
                            ? "bg-primary/10 text-primary font-bold shadow-xs border border-primary/20" 
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          }
                        `}
                      >
                        <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-primary" : ""}`} />
                        
                        {isSidebarExpanded && (
                          <span className="truncate">{item.label}</span>
                        )}

                        {isActive && (
                          <motion.div
                            layoutId="activeSideIndicator"
                            className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                      </Link>
                    )

                    if (!isSidebarExpanded) {
                      return (
                        <Tooltip key={item.path}>
                          <TooltipTrigger asChild>
                            {navContent}
                          </TooltipTrigger>
                          <TooltipContent side="right" className="font-bold text-xs">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      )
                    }

                    return navContent
                  })}
                </div>
              </div>
            ))}
          </TooltipProvider>
        </div>

        {/* SIDEBAR FOOTER & PROFILE */}
        <div className="p-3 border-t border-border/40 bg-card/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/60 transition-all text-left cursor-pointer outline-none">
                <Avatar className="h-9 w-9 border border-border/80 shrink-0">
                  <AvatarImage src={user?.profile_image || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {user?.name ? user.name.substring(0, 2).toUpperCase() : user?.email ? user.email.substring(0, 2).toUpperCase() : "ST"}
                  </AvatarFallback>
                </Avatar>
                {isSidebarExpanded && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-foreground leading-tight">{user?.name || user?.email || "Student"}</p>
                    <p className="text-[10px] text-muted-foreground truncate font-medium">{user?.email || ""}</p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl">
              <DropdownMenuLabel className="text-xs font-bold">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/student/settings")} className="text-xs font-medium cursor-pointer">
                <User className="mr-2 h-4 w-4" /> Settings & Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-xs font-bold text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarExpanded ? "lg:pl-64" : "lg:pl-20"}`}>
        
        {/* TOP NAVBAR */}
        <header className="h-16 border-b border-border/40 bg-card/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 select-none">
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <Breadcrumb className="hidden sm:flex">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/student/ai-workspace" className="text-xs font-bold text-muted-foreground hover:text-foreground">StudyOS</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-xs font-bold text-foreground">{pageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-3">
            <SearchBar placeholder="Search learning workspace..." />

            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-xl border-border/80 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/student/notifications")}
              className="h-9 w-9 rounded-xl border-border/80 text-muted-foreground hover:text-foreground cursor-pointer relative"
            >
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* MAIN BODY CONTENT */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
export default StudentLayout
