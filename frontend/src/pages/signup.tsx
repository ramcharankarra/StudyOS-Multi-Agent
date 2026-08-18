import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/context/auth-context"
import { AuthLayout } from "@/components/auth-layout"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { GoogleOAuthButton } from "@/components/google-oauth-button"
import { motion, AnimatePresence } from "framer-motion"
import { User, Mail, Lock, UserPlus, Globe, GraduationCap, School, Eye, EyeOff } from "lucide-react"

export const Signup: React.FC = () => {
  const { register, googleAuth } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [role, setRole] = useState<"student" | "teacher">("student")
  
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Google Simulator state
  const [isGoogleSimOpen, setIsGoogleSimOpen] = useState(false)
  const [pendingGoogleData, setPendingGoogleData] = useState<{
    token: string
    email: string
    name: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    setIsLoading(true)

    try {
      await register(name, email, password, role)
      if (role === "teacher") {
        navigate("/teacher/dashboard")
      } else {
        navigate("/student/dashboard")
      }
    } catch (err: any) {
      setError(err.message || "Registration failed.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSuccess = async (token: string) => {
    setError("")
    setIsLoading(true)
    try {
      const res = await googleAuth(token, role) as any
      if (res && res.status === "needs_role") {
        setPendingGoogleData({
          token,
          email: res.email || "",
          name: res.name || ""
        })
      } else if (res && res.status === "success") {
        navigate(res.role === "teacher" ? "/teacher/dashboard" : "/student/ai-workspace")
      }
    } catch (err: any) {
      setError(err.message || "Google registration failed.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompleteGoogleSignup = async () => {
    if (!pendingGoogleData) return
    setError("")
    setIsLoading(true)
    try {
      const res = await googleAuth(pendingGoogleData.token, role)
      if (res && res.status === "success") {
        navigate(role === "teacher" ? "/teacher/dashboard" : "/student/ai-workspace")
      }
    } catch (err: any) {
      setError(err.message || "Google registration failed.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      headline="Join the AI Education Revolution"
      subheadline="An AI-powered workspace where autonomous agents plan, execute, and deliver learning goals."
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
                key="signup-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-3xl font-extrabold tracking-tight font-heading">Create Account</CardTitle>
                  <CardDescription className="text-sm">
                    Select your role and create your AI Education Workspace account
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-2">
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
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive text-left leading-relaxed">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
                    <Input
                      label="Full Name"
                      type="text"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      icon={<User className="h-4.5 w-4.5" />}
                      required
                    />

                    <Input
                      label="Email"
                      type="email"
                      placeholder="you@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      icon={<Mail className="h-4.5 w-4.5" />}
                      required
                    />

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground/80">Password</label>
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

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground/80">Confirm Password</label>
                      <div className="relative flex items-center">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          icon={<Lock className="h-4.5 w-4.5" />}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-bold text-foreground/80">Role Selection</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setRole("student")}
                          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            role === "student"
                              ? "border-primary bg-primary/10 text-primary shadow-xs"
                              : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                          }`}
                        >
                          <GraduationCap className="h-4 w-4" />
                          Student
                        </button>

                        <button
                          type="button"
                          onClick={() => setRole("teacher")}
                          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            role === "teacher"
                              ? "border-primary bg-primary/10 text-primary shadow-xs"
                              : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                          }`}
                        >
                          <School className="h-4 w-4" />
                          Teacher
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full font-bold shadow-md shadow-primary/20 mt-2" isLoading={isLoading} size="lg">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account
                    </Button>
                  </form>

                  <p className="text-center text-xs text-muted-foreground mt-4 select-none font-medium">
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="font-bold text-primary hover:underline transition-all"
                    >
                      Login
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
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setRole("student")}
                      className={`p-5 rounded-2xl border text-center font-bold text-xs flex flex-col items-center gap-2 ${
                        role === "student" ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-muted/20"
                      }`}
                    >
                      <GraduationCap className="h-6 w-6" />
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("teacher")}
                      className={`p-5 rounded-2xl border text-center font-bold text-xs flex flex-col items-center gap-2 ${
                        role === "teacher" ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-muted/20"
                      }`}
                    >
                      <School className="h-6 w-6" />
                      Teacher
                    </button>
                  </div>

                  <Button onClick={handleCompleteGoogleSignup} className="w-full font-bold" isLoading={isLoading} size="lg">
                    Create Account
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
export default Signup
