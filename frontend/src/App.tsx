import React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ToastProvider } from "@/components/ui/toast"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { ErrorBoundary } from "@/components/ui/error-boundary"

// Layouts
import { StudentLayout } from "@/layouts/student-layout"
import { TeacherLayout } from "@/layouts/teacher-layout"

// Student Pages
import { StudentDashboardPage } from "@/pages/student/dashboard"
import { StudentCoursesPage } from "@/pages/student/courses"
import { CourseDetailPage } from "@/pages/student/course-detail"
import { StudentMaterialsPage } from "@/pages/student/materials"
import { StudentAssignmentsPage } from "@/pages/student/assignments"
import { StudentQuizzesPage } from "@/pages/student/quizzes"
import { AIWorkspacePage } from "@/pages/student/ai-workspace"
import { AIAssistantPage } from "@/pages/ai-assistant"
import { PlannerPage } from "@/pages/student/planner"
import { AnalyticsPage } from "@/pages/student/analytics"
import { NotificationsPage } from "@/pages/student/notifications"
import { ArtifactsPage } from "@/pages/student/artifacts"
import { StudentSettingsPage } from "@/pages/student/settings"

// Teacher Pages
import { TeacherDashboardPage } from "@/pages/teacher/dashboard"
import { TeacherCoursesPage } from "@/pages/teacher/courses"
import { TeacherMaterialsPage } from "@/pages/teacher/materials"
import { TeacherStudentsPage } from "@/pages/teacher/students"
import { TeacherAssignmentsPage } from "@/pages/teacher/assignments"
import { TeacherQuizzesPage } from "@/pages/teacher/quizzes"
import { TeacherSettingsPage } from "@/pages/teacher/settings"

// Auth Pages
import { LandingPage } from "@/pages/landing"
import { Login } from "@/pages/login"
import { Signup } from "@/pages/signup"
import { ForgotPassword } from "@/pages/forgot-password"
import { ResetPassword } from "@/pages/reset-password"
import { OnboardingPage } from "@/pages/onboarding"
import { NotFoundPage } from "@/pages/not-found"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

import { GoogleCallbackPage } from "@/pages/google-callback"

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="studyos-theme">
          <ToastProvider>
            <BrowserRouter>
              <AuthProvider>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/welcome" element={<LandingPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />

                  {/* Onboarding */}
                  <Route
                    path="/onboarding"
                    element={
                      <ProtectedRoute>
                        <OnboardingPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Student Panel Routes */}
                  <Route
                    path="/student/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <StudentLayout>
                          <StudentDashboardPage />
                        </StudentLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/courses"
                    element={
                      <ProtectedRoute allowedRoles={["student", "teacher"]}>
                        <StudentLayout>
                          <StudentCoursesPage />
                        </StudentLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/courses/:courseId"
                    element={
                      <ProtectedRoute allowedRoles={["student", "teacher"]}>
                        <StudentLayout>
                          <CourseDetailPage />
                        </StudentLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/materials"
                    element={
                      <ProtectedRoute allowedRoles={["student", "teacher"]}>
                        <StudentLayout>
                          <StudentMaterialsPage />
                        </StudentLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/assignments"
                    element={
                      <ProtectedRoute allowedRoles={["student", "teacher"]}>
                        <StudentLayout>
                          <StudentAssignmentsPage />
                        </StudentLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/quizzes"
                    element={
                      <ProtectedRoute allowedRoles={["student", "teacher"]}>
                        <StudentLayout>
                          <StudentQuizzesPage />
                        </StudentLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/ai-workspace"
                    element={
                      <ProtectedRoute allowedRoles={["student", "teacher"]}>
                        <StudentLayout>
                          <AIWorkspacePage />
                        </StudentLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/ai-assistant"
                    element={
                      <ProtectedRoute allowedRoles={["student", "teacher"]}>
                        <StudentLayout>
                          <AIAssistantPage />
                        </StudentLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/planner"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <StudentLayout>
                          <PlannerPage />
                        </StudentLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/analytics"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <StudentLayout>
                          <AnalyticsPage />
                        </StudentLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/artifacts"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <StudentLayout>
                          <ArtifactsPage />
                        </StudentLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/notifications"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <StudentLayout>
                          <NotificationsPage />
                        </StudentLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/settings"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <StudentLayout>
                          <StudentSettingsPage />
                        </StudentLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Teacher Panel Routes */}
                  <Route
                    path="/teacher/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={["teacher"]}>
                        <TeacherLayout>
                          <TeacherDashboardPage />
                        </TeacherLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/teacher/ai-assistant"
                    element={
                      <ProtectedRoute allowedRoles={["teacher"]}>
                        <TeacherLayout>
                          <AIAssistantPage />
                        </TeacherLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/teacher/courses"
                    element={
                      <ProtectedRoute allowedRoles={["teacher"]}>
                        <TeacherLayout>
                          <TeacherCoursesPage />
                        </TeacherLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/teacher/materials"
                    element={
                      <ProtectedRoute allowedRoles={["teacher"]}>
                        <TeacherLayout>
                          <TeacherMaterialsPage />
                        </TeacherLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/teacher/students"
                    element={
                      <ProtectedRoute allowedRoles={["teacher"]}>
                        <TeacherLayout>
                          <TeacherStudentsPage />
                        </TeacherLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/teacher/assignments"
                    element={
                      <ProtectedRoute allowedRoles={["teacher"]}>
                        <TeacherLayout>
                          <TeacherAssignmentsPage />
                        </TeacherLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/teacher/quizzes"
                    element={
                      <ProtectedRoute allowedRoles={["teacher"]}>
                        <TeacherLayout>
                          <TeacherQuizzesPage />
                        </TeacherLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/teacher/courses/:courseId"
                    element={
                      <ProtectedRoute allowedRoles={["teacher"]}>
                        <TeacherLayout>
                          <CourseDetailPage />
                        </TeacherLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/teacher/settings"
                    element={
                      <ProtectedRoute allowedRoles={["teacher"]}>
                        <TeacherLayout>
                          <TeacherSettingsPage />
                        </TeacherLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback 404 */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </AuthProvider>
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
