import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Sparkles, GraduationCap, School, ArrowRight, CheckCircle2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/components/ui/toast"

export const OnboardingPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Student specific onboarding state
  const [studyGoal, setStudyGoal] = useState("Master course concepts & pass quizzes")
  const [focusSubject, setFocusSubject] = useState("")

  // Teacher specific onboarding state
  const [department, setDepartment] = useState("")
  const [courseSubject, setCourseSubject] = useState("")

  const isTeacher = user?.role === "teacher"

  const handleFinishOnboarding = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
      showToast("Profile setup complete! Welcome to StudyOS.", "success")
      if (isTeacher) {
        navigate("/teacher/dashboard")
      } else {
        navigate("/student/dashboard")
      }
    }, 600)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 select-none relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <Card className="border-border/80 shadow-xl shadow-black/5 bg-card/95 backdrop-blur-md">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary mb-3 shadow-sm">
              {isTeacher ? <School className="h-6 w-6" /> : <GraduationCap className="h-6 w-6" />}
            </div>
            <CardTitle className="text-2xl font-extrabold font-heading">
              Welcome to StudyOS, {user?.name || "Educator"}!
            </CardTitle>
            <CardDescription className="text-sm">
              {isTeacher
                ? "Let's set up your teaching profile before entering your teacher dashboard."
                : "Let's customize your AI learning preferences before entering your student workspace."}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleFinishOnboarding} className="space-y-4 text-left">
              {isTeacher ? (
                <>
                  <Input
                    label="Department / Faculty"
                    type="text"
                    placeholder="e.g. Computer Science, Mathematics"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                  />
                  <Input
                    label="Primary Teaching Subjects"
                    type="text"
                    placeholder="e.g. Data Structures, Algorithms"
                    value={courseSubject}
                    onChange={(e) => setCourseSubject(e.target.value)}
                    required
                  />
                </>
              ) : (
                <>
                  <Input
                    label="Primary Focus Area"
                    type="text"
                    placeholder="e.g. Computer Science, Engineering, History"
                    value={focusSubject}
                    onChange={(e) => setFocusSubject(e.target.value)}
                    required
                  />
                  <Input
                    label="Learning Goal"
                    type="text"
                    value={studyGoal}
                    onChange={(e) => setStudyGoal(e.target.value)}
                    required
                  />
                </>
              )}

              <Button
                type="submit"
                className="w-full mt-4 font-bold shadow-md shadow-primary/20 gap-2"
                size="lg"
                isLoading={isLoading}
              >
                Complete Onboarding
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
export default OnboardingPage
