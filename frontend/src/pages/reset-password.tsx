import React, { useState, useEffect } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "@/context/auth-context"
import { AuthLayout } from "@/components/auth-layout"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Lock, ArrowLeft, KeyRound, AlertCircle } from "lucide-react"

export const ResetPassword: React.FC = () => {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [token, setToken] = useState("")

  useEffect(() => {
    const t = searchParams.get("token")
    if (t) {
      setToken(t)
    } else {
      setError("No token found. Please verify your reset link.")
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!token) {
      setError("Password reset token is missing.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsLoading(true)

    try {
      await resetPassword(password, token)
      navigate("/login")
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Link may be expired or invalid.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full"
      >
        <Card className="w-full">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-extrabold tracking-tight">Create new password</CardTitle>
            <CardDescription>
              Your new password must be different from previous passwords.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive text-left leading-relaxed animate-in fade-in duration-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="New Password"
                type="password"
                placeholder="minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="h-4.5 w-4.5" />}
                required
                disabled={!token}
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="h-4.5 w-4.5" />}
                required
                disabled={!token}
              />

              <Button type="submit" className="w-full mt-2" isLoading={isLoading} disabled={!token}>
                <KeyRound className="mr-2 h-4 w-4" />
                Reset Password
              </Button>
            </form>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AuthLayout>
  )
}
