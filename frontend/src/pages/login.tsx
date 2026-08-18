import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/context/auth-context"
import { AuthLayout } from "@/components/auth-layout"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { GoogleOAuthButton } from "@/components/google-oauth-button"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Lock, LogIn, Globe, GraduationCap, School, Eye, EyeOff } from "lucide-react"

export const Login: React.FC = () => {
  const { login, googleAuth } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  // Google Simulator state
  const [isGoogleSimOpen, setIsGoogleSimOpen] = useState(false)
  const [pendingGoogleData, setPendingGoogleData] = useState<{
    token: string
    email: string
    name: string
  } | null>(null)
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher" | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const user = await login(email, password)
      if (user.role === "teacher") {
        navigate("/teacher/dashboard")
      } else {
        navigate("/student/dashboard")
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSuccess = async (token: string) => {
    setError("")
    setIsLoading(true)
    try {
      const res = await googleAuth(token) as any
      if (res && res.status === "needs_role") {
        setPendingGoogleData({
          token,
          email: res.email || "",
          name: res.name || ""
        })
      } else if (res && res.status === "success") {
        navigate(res.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard")
      }
    } catch (err: any) {
      setError(err.message || "Google sign-in failed.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompleteGoogleSignup = async () => {
    if (!pendingGoogleData || !selectedRole) return
    setError("")
    setIsLoading(true)
    try {
      const res = await googleAuth(pendingGoogleData.token, selectedRole)
      if (res && res.status === "success") {
        navigate(selectedRole === "teacher" ? "/teacher/dashboard" : "/student/ai-workspace")
      }
    } catch (err: any) {
      setError(err.message || "Google registration failed.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      headline="An AI-powered Education Workspace"
      subheadline="Your AI team plans, executes, and delivers complete learning artifacts automatically."
    >
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full"
      >
        <Card className="w-full border-border/80 shadow-xl shadow-black/5 bg-card/90 backdrop-blur-md">
          <AnimatePresence mode="wait">
            {!pendingGoogleData ? (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-3xl font-extrabold tracking-tight font-heading">Welcome back</CardTitle>
                  <CardDescription className="text-sm">
                    Enter your email to access your AI Education Workspace
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5 pt-4">
                  {/* Google OAuth Button first */}
                  <GoogleOAuthButton
                    onSuccess={handleGoogleSuccess}
                    onError={(err) => setError(err)}
                    isLoading={isLoading}
                  />

                  <div className="relative flex items-center justify-center my-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/40" />
                    </div>
                    <span className="relative bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground/60 font-bold select-none">
                      OR
                    </span>
                  </div>

                  {error && (
                    <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive text-left leading-relaxed animate-in fade-in duration-200">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    <Input
                      label="Email"
                      type="email"
                      placeholder="you@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      icon={<Mail className="h-4.5 w-4.5" />}
                      required
                    />

                    <div className="space-y-1.5 relative">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground/80">Password</label>
                        <Link
                          to="/forgot-password"
                          className="text-xs font-semibold text-primary hover:underline transition-colors"
                        >
                          Forgot Password?
                        </Link>
                      </div>
                      <div className="relative flex items-center">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          icon={<Lock className="h-4.5 w-4.5" />}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-primary/30"
                        />
                        Remember Me
                      </label>
                    </div>

                    <Button type="submit" className="w-full mt-2 font-bold shadow-md shadow-primary/20" isLoading={isLoading} size="lg">
                      <LogIn className="mr-2 h-4 w-4" />
                      Login
                    </Button>
                  </form>

                  <p className="text-center text-xs text-muted-foreground mt-5 select-none font-medium">
                    Don't have an account?{" "}
                    <Link
                      to="/signup"
                      className="font-bold text-primary hover:underline transition-all"
                    >
                      Sign up
                    </Link>
                  </p>
                </CardContent>
              </motion.div>
            ) : (
              <motion.div
                key="google-role"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-extrabold font-heading">How will you use StudyOS?</CardTitle>
                  <CardDescription className="text-sm">
                    Select your role to complete setting up your account.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {error && (
                    <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive text-left">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedRole("student")}
                      className={`flex flex-col items-center justify-center p-5 rounded-2xl border text-center transition-all cursor-pointer ${
                        selectedRole === "student"
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-muted/20 hover:bg-muted/40"
                      }`}
                    >
                      <GraduationCap className="h-6 w-6 text-primary mb-2" />
                      <span className="font-bold text-sm">Student</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRole("teacher")}
                      className={`flex flex-col items-center justify-center p-5 rounded-2xl border text-center transition-all cursor-pointer ${
                        selectedRole === "teacher"
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-muted/20 hover:bg-muted/40"
                      }`}
                    >
                      <School className="h-6 w-6 text-primary mb-2" />
                      <span className="font-bold text-sm">Teacher</span>
                    </button>
                  </div>

                  <Button
                    onClick={handleCompleteGoogleSignup}
                    className="w-full font-bold shadow-md shadow-primary/20"
                    disabled={!selectedRole}
                    isLoading={isLoading}
                    size="lg"
                  >
                    Complete Account
                  </Button>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </AuthLayout>
  )
}
export default Login
