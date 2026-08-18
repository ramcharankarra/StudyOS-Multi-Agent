import React, { useState, useEffect } from "react"
import { User, Mail, Shield, Volume2, Palette, Settings } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/toast"
import { AppearanceSettings } from "@/components/appearance-settings"
import { motion } from "framer-motion"
import { useAuth } from "@/context/auth-context"

export const TeacherSettingsPage: React.FC = () => {
  const { showToast } = useToast()
  const { user, updateProfile, changePassword } = useAuth()
  const [activeTab, setActiveTab] = useState<"appearance" | "profile" | "alerts">("appearance")

  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [chimesEnabled, setChimesEnabled] = useState(true)

  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setEmail(user.email || "")
    }
  }, [user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (name !== user?.name || email !== user?.email) {
        await updateProfile(name, email)
      }

      if (currentPassword || password || confirmPassword) {
        if (!currentPassword) {
          showToast("Current password is required to set a new password.", "error")
          setIsSubmitting(false)
          return
        }
        if (password !== confirmPassword) {
          showToast("New password and confirmation password do not match.", "error")
          setIsSubmitting(false)
          return
        }
        await changePassword(currentPassword, password, confirmPassword)
        setCurrentPassword("")
        setPassword("")
        setConfirmPassword("")
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save settings changes.", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left select-none pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">Educator Settings</h1>
          <p className="text-xs text-muted-foreground">Manage theme presets, classroom profile, and alerts</p>
        </div>
      </div>

      {/* Tabs Navigation Pills */}
      <div className="flex items-center gap-2 p-1.5 bg-muted/60 rounded-2xl border border-border/60 overflow-x-auto">
        <button
          onClick={() => setActiveTab("appearance")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "appearance"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Palette className="h-4 w-4" />
          Appearance & Themes
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "profile"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <User className="h-4 w-4" />
          Profile Details
        </button>

        <button
          onClick={() => setActiveTab("alerts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "alerts"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Settings className="h-4 w-4" />
          Classroom Alerts
        </button>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "appearance" && <AppearanceSettings />}

        {activeTab === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>Update your personal information and classroom account settings</CardDescription>
            </CardHeader>
            
            <CardContent className="border-t border-border/20 pt-6">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    icon={<User className="h-4 w-4" />}
                    required
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={<Mail className="h-4 w-4" />}
                    required
                  />
                </div>

                <div className="border-t border-border/10 my-4 pt-4 space-y-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                    Change Password
                  </h4>
                  {user?.has_password === false ? (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-2.5">
                      <Shield className="h-4 w-4 shrink-0" />
                      <span>Your account was created via Google Sign-In and does not use a local password.</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Input
                          label="Current Password"
                          type="password"
                          placeholder="••••••••"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          icon={<Shield className="h-4 w-4" />}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="New Password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          icon={<Shield className="h-4 w-4" />}
                        />
                        <Input
                          label="Confirm New Password"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          icon={<Shield className="h-4 w-4" />}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" isLoading={isSubmitting}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "alerts" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Classroom Alerts</CardTitle>
                <CardDescription>Configure alerts for student activities and course submissions</CardDescription>
              </CardHeader>
              <CardContent className="border-t border-border/20 pt-6 space-y-4">
                <div className="flex items-start gap-3.5 py-2.5 border-b border-border/10">
                  <Checkbox id="submit-notify" defaultChecked />
                  <div className="space-y-0.5 leading-none">
                    <label htmlFor="submit-notify" className="text-sm font-bold text-foreground cursor-pointer">
                      Student Submissions
                    </label>
                    <p className="text-xs text-muted-foreground/80 mt-1">Receive daily email summaries when students submit quizzes or tasks.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3.5 py-2.5">
                  <Checkbox id="ask-notify" defaultChecked />
                  <div className="space-y-0.5 leading-none">
                    <label htmlFor="ask-notify" className="text-sm font-bold text-foreground cursor-pointer">
                      Student Queries
                    </label>
                    <p className="text-xs text-muted-foreground/80 mt-1">Get immediate alerts when students request course code entries.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System preferences</CardTitle>
                <CardDescription>Configure interactive parameters</CardDescription>
              </CardHeader>
              <CardContent className="border-t border-border/20 pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 text-left">
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                      Auditory Actions Feedback
                    </span>
                    <p className="text-xs text-muted-foreground/80">Play subtle, friendly chime sounds on successful changes.</p>
                  </div>
                  <Switch
                    checked={chimesEnabled}
                    onCheckedChange={(checked) => {
                      setChimesEnabled(checked)
                      showToast(checked ? "Auditory chimes enabled" : "Auditory chimes muted", "info")
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>

    </div>
  )
}
export default TeacherSettingsPage
