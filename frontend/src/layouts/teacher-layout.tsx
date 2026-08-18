import React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useUIStore } from "@/store/ui-store"
import { useThemeStore } from "@/store/theme-store"
import {
  School,
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
  Users,
  FileText,
  Bot,
  ClipboardList,
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

interface TeacherLayoutProps {
  children: React.ReactNode
}

export const TeacherLayout: React.FC<TeacherLayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user, isLoading, logout } = useAuth()

  // UI states
  const {
    isSidebarExpanded,
    isMobileSidebarOpen,
    isNotificationPanelOpen,
    toggleSidebar,
    setMobileSidebarOpen,
    toggleNotificationPanel,
    setNotificationPanelOpen
  } = useUIStore()
  
  const { theme, toggleTheme } = useThemeStore()

  // Sidebar Grouped Section definition
  const sections = [
    {
      title: "Learning",
      items: [
        { label: "Dashboard", path: "/teacher/dashboard", icon: LayoutDashboard },
        { label: "MindOS", path: "/teacher/ai-assistant", icon: Bot },
        { label: "Courses", path: "/teacher/courses", icon: BookOpen },
        { label: "Materials", path: "/teacher/materials", icon: FileText },
        { label: "Students", path: "/teacher/students", icon: Users },
        { label: "Assignments", path: "/teacher/assignments", icon: ClipboardList },
        { label: "Quizzes", path: "/teacher/quizzes", icon: HelpCircle },
      ]
    },
    {
      title: "Account",
      items: [
        { label: "Settings", path: "/teacher/settings", icon: Settings },
      ]
    }
  ]

  // Flattened items for easy title checking
  const allNavItems = sections.flatMap(sec => sec.items)

  // Map path to active module name for dynamic HSL themes
  const getModuleFromPath = (path: string): string => {
    if (path.includes("/teacher/dashboard")) return "dashboard"
    if (path.includes("/teacher/courses")) return "courses"
    if (path.includes("/teacher/students")) return "analytics"
    if (path.includes("/teacher/quizzes")) return "quizzes"
    if (path.includes("/teacher/settings")) return "settings"
    return "dashboard"
  }

  const activeModule = getModuleFromPath(location.pathname)

  // Strict Role Guard: Redirect to Student Dashboard if logged-in user is a student
  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate("/login", { replace: true })
      } else if (user.role.toLowerCase() !== "teacher") {
        showToast("Access forbidden: Redirected to Student Dashboard", "error")
        navigate("/student/dashboard", { replace: true })
      }
    }
  }, [user, isLoading, navigate, showToast])

  // Handle logout
  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  if (isLoading || !user || user.role.toLowerCase() !== "teacher") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // Generate breadcrumb nodes
  const pathParts = location.pathname.split("/").filter(Boolean)

  return (
    <TooltipProvider>
      <div 
        data-module={activeModule}
        className="relative min-h-screen bg-background text-foreground flex overflow-hidden transition-colors duration-300"
      >
        
        {/* ======================================================== */}
        {/* DESKTOP SIDEBAR                                          */}
        {/* ======================================================== */}
        <motion.aside
          initial={false}
          animate={{ width: isSidebarExpanded ? "260px" : "78px" }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="hidden md:flex flex-col bg-card border-r border-border/80 select-none relative z-20 shrink-0 h-screen"
        >
          {/* Logo Brand Header */}
          <div className="flex h-16 items-center px-5 border-b border-border/40 gap-3 overflow-hidden shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-md shadow-secondary/20 shrink-0">
              <School className="h-5 w-5" />
            </div>
            {isSidebarExpanded && (
              <span className="font-extrabold text-lg tracking-tight">
                Study<span className="text-secondary">OS</span>
                <span className="text-[9px] uppercase font-black text-muted-foreground/60 tracking-widest ml-2 border border-border/40 px-1 py-0.5 rounded bg-muted/20">TEACHER</span>
              </span>
            )}
          </div>

          {/* Grouped Links Navigation */}
          <nav className="flex-1 px-3 py-5 space-y-5 overflow-y-auto">
            {sections.map((section) => (
              <div key={section.title} className="space-y-1.5">
                {isSidebarExpanded ? (
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-3.5 mb-2">
                    {section.title}
                  </h4>
                ) : (
                  <div className="h-px bg-border/40 mx-2 mb-2" />
                )}
                
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.path
                    const Icon = item.icon
                    
                    const itemElement = (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3.5 py-2.5 px-3.5 rounded-xl text-sm font-bold tracking-tight transition-all duration-200 hover-lift ${
                          isActive
                            ? "bg-secondary text-secondary-foreground border-b-4 border-black/15 shadow-sm shadow-secondary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {isSidebarExpanded && <span>{item.label}</span>}
                      </Link>
                    )

                    if (!isSidebarExpanded) {
                      return (
                        <Tooltip key={item.path} delayDuration={100}>
                          <TooltipTrigger asChild>
                            {itemElement}
                          </TooltipTrigger>
                          <TooltipContent side="right" className="font-bold">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      )
                    }

                    return itemElement
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Expand/Collapse Trigger */}
          <div className="p-3 border-t border-border/40 flex justify-end shrink-0">
            <button
              onClick={toggleSidebar}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {isSidebarExpanded ? <ChevronLeft className="h-4.5 w-4.5" /> : <ChevronRight className="h-4.5 w-4.5" />}
            </button>
          </div>
        </motion.aside>

        {/* ======================================================== */}
        {/* MOBILE DRAWER SIDEBAR                                    */}
        {/* ======================================================== */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileSidebarOpen(false)}
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
              />
              
              {/* Sidebar Content */}
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col md:hidden select-none"
              >
                <div className="flex h-16 items-center justify-between px-5 border-b border-border/40 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-md shadow-secondary/25">
                      <School className="h-5 w-5" />
                    </div>
                    <span className="font-extrabold text-lg tracking-tight">
                      Study<span className="text-secondary">OS</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="p-1 rounded-lg border border-border hover:bg-muted cursor-pointer"
                  >
                    <X className="h-4.5 w-4.5 text-muted-foreground" />
                  </button>
                </div>
                
                <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
                  {sections.map((section) => (
                    <div key={section.title} className="space-y-1.5">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-3.5 mb-1.5">
                        {section.title}
                      </h4>
                      <div className="space-y-1">
                        {section.items.map((item) => {
                          const isActive = location.pathname === item.path
                          const Icon = item.icon
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setMobileSidebarOpen(false)}
                              className={`flex items-center gap-3.5 py-2.5 px-3.5 rounded-xl text-sm font-bold tracking-tight transition-all ${
                                isActive
                                  ? "bg-secondary text-secondary-foreground border-b-4 border-black/15 shadow-sm shadow-secondary/10"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                              }`}
                            >
                              <Icon className="h-5 w-5" />
                              <span>{item.label}</span>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </nav>
                
                <div className="p-4 border-t border-border/40 shrink-0">
                  <Button variant="outline" className="w-full text-left" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ======================================================== */}
        {/* MAIN PANEL CONTENT                                       */}
        {/* ======================================================== */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          
          {/* Sticky Header with Glass Blur */}
          <header className="h-16 border-b border-border/45 bg-card/75 backdrop-blur-md flex items-center justify-between px-6 z-10 shrink-0 sticky top-0 shadow-sm">
            <div className="flex items-center gap-4">
              {/* Hamburger Button (Mobile only) */}
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden flex h-9.5 w-9.5 items-center justify-center rounded-xl border border-border/60 bg-background/50 hover:bg-secondary cursor-pointer"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              {/* Dynamic Breadcrumbs */}
              <Breadcrumb className="hidden sm:block">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink onClick={() => navigate("/teacher/dashboard")}>StudyOS</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  {pathParts.slice(0, -1).map((part, index) => (
                    <React.Fragment key={part}>
                      <BreadcrumbItem>
                        <span className="capitalize text-muted-foreground/80">{part}</span>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                    </React.Fragment>
                  ))}
                  <BreadcrumbItem>
                    <BreadcrumbPage className="capitalize text-primary">
                      {allNavItems.find((item) => location.pathname === item.path)?.label || pathParts[pathParts.length - 1] || "Dashboard"}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Header controls menu */}
            <div className="flex items-center gap-3">
              {/* Search component */}
              <SearchBar className="hidden md:block" />

              {/* Notification panel toggle */}
              <button
                onClick={toggleNotificationPanel}
                className="relative flex h-9.5 w-9.5 items-center justify-center rounded-xl border border-border/60 bg-background/50 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-secondary" />
              </button>

              {/* Theme Toggle button */}
              <button
                onClick={toggleTheme}
                className="flex h-9.5 w-9.5 items-center justify-center rounded-xl border border-border/60 bg-background/50 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Toggle Theme"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 focus:outline-none cursor-pointer">
                    <Avatar className="h-9 w-9 border-2 border-secondary/20">
                      <AvatarImage src={user?.profile_image || ""} />
                      <AvatarFallback className="font-extrabold">{user?.name ? user.name.substring(0, 2).toUpperCase() : user?.email ? user.email.substring(0, 2).toUpperCase() : "TE"}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-xs font-bold leading-none">{user?.name || user?.email || "Teacher"}</p>
                      <p className="text-[10px] text-muted-foreground leading-none">{user?.email || ""}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/teacher/settings")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>My Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/teacher/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Account Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Router content wrapper */}
          <main className="flex-1 overflow-y-auto p-6 bg-education-grid/10 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="w-full h-full text-left"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* ======================================================== */}
        {/* SLIDING NOTIFICATION DRAWER                              */}
        {/* ======================================================== */}
        <AnimatePresence>
          {isNotificationPanelOpen && (
            <>
              {/* Drawer Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setNotificationPanelOpen(false)}
                className="fixed inset-0 z-30 bg-black/35 backdrop-blur-xs"
              />
              
              {/* Drawer panel */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="fixed inset-y-0 right-0 z-45 w-96 bg-card border-l border-border p-6 shadow-2xl flex flex-col select-none text-left"
              >
                <div className="flex items-center justify-between border-b border-border/20 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-secondary animate-bounce" />
                    <h3 className="font-extrabold text-lg leading-none">Notifications</h3>
                  </div>
                  <button
                    onClick={() => setNotificationPanelOpen(false)}
                    className="p-1 rounded-lg border border-border hover:bg-muted cursor-pointer"
                  >
                    <X className="h-4.5 w-4.5 text-muted-foreground" />
                  </button>
                </div>
                
                {/* Empty Notifications list */}
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border/60 rounded-2xl bg-muted/15">
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground/60 mb-4 border-b border-black/5 shadow-inner">
                    <Bell className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold mb-1">No notifications</h4>
                  <p className="text-xs text-muted-foreground/80 max-w-[200px] leading-relaxed">
                    We'll notify you when new student requests come in or questions are raised.
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </TooltipProvider>
  )
}
export default TeacherLayout
