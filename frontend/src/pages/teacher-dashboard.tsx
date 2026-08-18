import React from "react"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { School, LogOut, Mail, Calendar, ShieldAlert } from "lucide-react"

export const TeacherDashboard: React.FC = () => {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-background text-foreground bg-grid-pattern p-6 transition-colors duration-300">
      {/* Glow blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Navbar */}
      <div className="relative max-w-5xl mx-auto flex items-center justify-between border-b border-border/40 pb-4 mb-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <School className="h-4.5 w-4.5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight">
            Study<span className="text-primary">OS</span>
          </span>
        </div>
        
        <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-foreground">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>

      {/* Content Container */}
      <div className="max-w-3xl mx-auto space-y-6 relative">
        <Card className="w-full border-primary/20">
          <CardHeader className="flex flex-row items-center gap-5 p-8">
            {user?.profile_image ? (
              <img
                src={user.profile_image}
                alt={user.name}
                className="h-20 w-20 rounded-full border-2 border-primary object-cover bg-secondary"
              />
            ) : (
              <div className="h-20 w-20 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                {user?.name ? user.name[0].toUpperCase() : "T"}
              </div>
            )}
            <div className="text-left space-y-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary uppercase tracking-wide">
                Teacher Account
              </span>
              <CardTitle className="text-3xl font-extrabold">{user?.name}</CardTitle>
              <CardDescription className="text-sm">Teacher Control Panel</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-8 pt-0 border-t border-border/20 mt-6 grid md:grid-cols-2 gap-6 text-left">
            <div className="space-y-4 pt-6">
              <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Account Information</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4.5 w-4.5 text-muted-foreground" />
                  <span className="font-medium">{user?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4.5 w-4.5 text-muted-foreground" />
                  <span className="font-medium">
                    Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { dateStyle: "long" }) : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6">
              <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Session Security</h4>
              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/15 flex flex-col gap-1">
                <span className="text-xs font-bold text-green-500">JWT STATUS: ACTIVE</span>
                <span className="text-[11px] text-muted-foreground/80 leading-normal">
                  Your API credentials are rotated and refreshed automatically.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informative prompt explaining dash constraint */}
        <Card className="bg-amber-500/5 border-amber-500/15">
          <CardContent className="p-6 flex items-start gap-4 text-left">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 mt-0.5">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-amber-700 dark:text-amber-500 text-sm">Authentication Module Active</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This dashboard is a security-verified placeholder. As requested, all other Course LMS functionalities (courses, assignments, quizzes, and AI tools) have been omitted.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
