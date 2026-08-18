import React, { useState, useEffect } from "react"
import { User, Mail, Shield, Volume2, Sparkles, MessageSquare, Palette, Settings } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/toast"
import { AppearanceSettings } from "@/components/appearance-settings"
import { motion } from "framer-motion"
import { useAuth } from "@/context/auth-context"

export const StudentSettingsPage: React.FC = () => {
  const { showToast } = useToast()
  const { user, updateProfile, changePassword } = useAuth()
  const [activeTab, setActiveTab] = useState<"appearance" | "profile" | "notifications" | "ai">("appearance")

  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [aiPersonality, setAiPersonality] = useState("conversational")
  const [chimesEnabled, setChimesEnabled] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      // 1. Update Profile (Name & Email) if changed
      if (name !== user?.name || email !== user?.email) {
        await updateProfile(name, email)
      }

      // 2. Change Password if any password field is filled
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
          <h1 className="text-2xl font-bold font-heading">Everything is Ready</h1>
          <p className="text-xs text-muted-foreground">Customize your StudyOS experience.</p>
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
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "notifications"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Settings className="h-4 w-4" />
          Notifications
        </button>

        <button
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "ai"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          AI & Preferences
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
              <CardDescription>Update your personal information and student account settings</CardDescription>
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
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "notifications" && (
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how and when you receive course alerts</CardDescription>
            </CardHeader>
            <CardContent className="border-t border-border/20 pt-6 space-y-4">
              <div className="flex items-start gap-3.5 py-2.5 border-b border-border/10">
                <Checkbox id="assign-notify" defaultChecked />
                <div className="space-y-0.5 leading-none">
                  <label htmlFor="assign-notify" className="text-sm font-bold text-foreground cursor-pointer">
                    Assignments & Homeworks
                  </label>
                  <p className="text-xs text-muted-foreground/80 mt-1">Receive immediate notifications when teachers publish new homeworks.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3.5 py-2.5">
                <Checkbox id="quiz-notify" defaultChecked />
                <div className="space-y-0.5 leading-none">
                  <label htmlFor="quiz-notify" className="text-sm font-bold text-foreground cursor-pointer">
                    Quiz Grades & Scores
                  </label>
                  <p className="text-xs text-muted-foreground/80 mt-1">Receive notifications when your quizzes are graded by teachers.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "ai" && (
          <Card>
            <CardHeader>
              <CardTitle>AI & System Behavior</CardTitle>
              <CardDescription>Customize active AI tutor behaviors and interface properties</CardDescription>
            </CardHeader>
            <CardContent className="border-t border-border/20 pt-6 space-y-6">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  AI Tutor Personality
                </h4>
                <RadioGroup value={aiPersonality} onValueChange={setAiPersonality}>
                  <div className="flex items-start gap-3.5 py-1">
                    <RadioGroupItem value="conversational" id="ai-conv" />
                    <div className="space-y-0.5 leading-none">
                      <label htmlFor="ai-conv" className="text-sm font-bold text-foreground cursor-pointer flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        Conversational & Friendly
                      </label>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">Explains using structured examples and checks understanding.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3.5 py-1">
                    <RadioGroupItem value="direct" id="ai-dir" />
                    <div className="space-y-0.5 leading-none">
                      <label htmlFor="ai-dir" className="text-sm font-bold text-foreground cursor-pointer flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Direct & Precise
                      </label>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">Provides direct answers and formal reference documentation.</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center justify-between border-t border-border/10 pt-4.5">
                <div className="space-y-0.5 text-left">
                  <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    System Sound Effects
                  </span>
                  <p className="text-xs text-muted-foreground/80">Play subtle sound effects on interactive actions.</p>
                </div>
                <Switch
                  checked={chimesEnabled}
                  onCheckedChange={(checked) => {
                    setChimesEnabled(checked)
                    showToast(checked ? "System sound effects enabled" : "System sounds muted", "info")
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
      
    </div>
  )
}
export default StudentSettingsPage
