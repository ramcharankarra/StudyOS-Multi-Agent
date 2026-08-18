import React, { useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/auth-context"
import { AuthLayout } from "@/components/auth-layout"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from "lucide-react"

export const ForgotPassword: React.FC = () => {
  const { forgotPassword } = useAuth()

  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [devResetUrl, setDevResetUrl] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setDevResetUrl("")
    setIsLoading(true)

    try {
      const res = await forgotPassword(email)
      setSuccess(true)
      // Check if dev URL was returned (development ease)
      if (res && res.dev_reset_url) {
        setDevResetUrl(res.dev_reset_url)
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.")
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
            <CardTitle className="text-3xl font-extrabold tracking-tight">Reset password</CardTitle>
            <CardDescription>
              We'll send you instructions to reset your password
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive text-left leading-relaxed animate-in fade-in duration-200">
                {error}
              </div>
            )}

            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="h-4.5 w-4.5" />}
                  required
                />

                <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
                  <Send className="mr-2 h-4 w-4" />
                  Send Reset Link
                </Button>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5 py-4 text-center"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-bold text-lg">Check your inbox</h4>
                  <p className="text-sm text-muted-foreground/80 leading-relaxed">
                    If an account exists for <strong className="text-foreground">{email}</strong>, a password reset link has been logged in the backend console.
                  </p>
                </div>

                {/* Developer Alert Sandbox box */}
                {devResetUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-left space-y-2 mt-4"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-primary select-none">
                      <AlertCircle className="h-4 w-4" />
                      DEVELOPER SANDBOX MODE
                    </div>
                    <p className="text-xs text-muted-foreground leading-normal">
                      We've caught the generated token here so you can test the reset workflow directly without having to copy-paste it from the backend terminal logs.
                    </p>
                    <div className="mt-2 text-center">
                      <Link to={devResetUrl.replace("http://localhost:5173", "")}>
                        <Button variant="primary" size="sm" className="w-full text-xs font-semibold">
                          Proceed to Reset Password Page
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

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
