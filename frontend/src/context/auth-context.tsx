import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useToast } from "@/components/ui/toast"

export interface User {
  id: string
  email: string
  name: string
  role: "student" | "teacher"
  profile_image?: string
  created_at: string
  has_password?: boolean
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  accessToken: string | null
  login: (email: string, password: string) => Promise<User>
  register: (name: string, email: string, password: string, role: string) => Promise<User>
  googleAuth: (token: string, role?: string) => Promise<{ status: string; email?: string; name?: string; google_id?: string }>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<{ dev_reset_url?: string }>
  resetPassword: (password: string, token: string) => Promise<void>
  refreshAccessToken: () => Promise<string | null>
  updateProfile: (name: string, email: string) => Promise<User>
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<any>
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const { showToast } = useToast()

  const API_URL = import.meta.env.VITE_API_BASE_URL || ""

  // Helper for fetching with authorization header
  const apiFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers || {})
    const token = accessToken || localStorage.getItem("access_token")
    
    // Add Bearer Token if available
    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }
    
    // Default Content-Type to JSON unless sending FormData
    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }

    const finalUrl = url.startsWith("http") ? url : `${API_URL}${url}`
    
    // Enable credentials (cookies) for refresh token
    const fetchOptions: RequestInit = {
      ...options,
      headers,
      credentials: "include" // REQUIRED to send HttpOnly cookies
    }

    let response = await fetch(finalUrl, fetchOptions)

    // Handle Token Expired (401)
    if (response.status === 401 && !url.includes("/auth/login") && !url.includes("/auth/refresh")) {
      // Attempt token refresh
      const newAccessToken = await refreshAccessToken()
      if (newAccessToken) {
        // Retry original request with new token
        headers.set("Authorization", `Bearer ${newAccessToken}`)
        response = await fetch(finalUrl, {
          ...fetchOptions,
          headers
        })
      }
    }

    return response
  }, [accessToken])

  // Refresh access token
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: localStorage.getItem("rt_fallback") || undefined }),
        credentials: "include"
      })

      if (response.ok) {
        const data = await response.json()
        setAccessToken(data.access_token)
        localStorage.setItem("access_token", data.access_token)
        if (data.refresh_token) {
          localStorage.setItem("rt_fallback", data.refresh_token)
        }
        return data.access_token
      } else {
        // Refresh token invalid -> logout
        setAccessToken(null)
        setUser(null)
        localStorage.removeItem("access_token")
        localStorage.removeItem("rt_fallback")
        return null
      }
    } catch (e) {
      console.error("Token refresh failed:", e)
      return null
    }
  }, [])

  // Check user auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      let token = accessToken || localStorage.getItem("access_token")
      if (!token) {
        token = await refreshAccessToken()
      }
      if (token) {
        try {
          const res = await fetch(`${API_URL}/api/v1/auth/me`, {
            headers: { "Authorization": `Bearer ${token}` }
          })
          if (res.ok) {
            const userData = await res.json()
            setUser(userData)
            setAccessToken(token)
            localStorage.setItem("access_token", token)
          } else {
            // Token rejected by auth/me, try refreshing
            const refreshedToken = await refreshAccessToken()
            if (refreshedToken) {
              const res2 = await fetch(`${API_URL}/api/v1/auth/me`, {
                headers: { "Authorization": `Bearer ${refreshedToken}` }
              })
              if (res2.ok) {
                const userData = await res2.json()
                setUser(userData)
              }
            }
          }
        } catch (e) {
          console.error("Fetch current user failed:", e)
        }
      }
      setIsLoading(false)
    }
    initAuth()
  }, [])

  // Login
  const login = useCallback(async (email: string, password: string): Promise<User> => {
    // Purge stale auth state before new login
    setAccessToken(null)
    setUser(null)
    localStorage.removeItem("access_token")
    localStorage.removeItem("rt_fallback")
    sessionStorage.clear()

    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.detail || "Incorrect email or password.")
    }

    const data = await response.json()
    setAccessToken(data.access_token)
    localStorage.setItem("access_token", data.access_token)
    if (data.refresh_token) {
      localStorage.setItem("rt_fallback", data.refresh_token)
    }

    // Get user details
    const userRes = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { "Authorization": `Bearer ${data.access_token}` }
    })
    const userData = await userRes.json()
    setUser(userData)
    showToast(`Welcome back, ${userData.name}!`, "success")
    return userData
  }, [showToast])

  // Register (creates user and automatically logs user in with JWT access + refresh tokens!)
  const register = useCallback(async (name: string, email: string, password: string, role: string): Promise<User> => {
    // Purge stale auth state before new registration
    setAccessToken(null)
    setUser(null)
    localStorage.removeItem("access_token")
    localStorage.removeItem("rt_fallback")
    sessionStorage.clear()

    const response = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.detail || "Registration failed. Try a different email.")
    }

    // Automatically log user in right after signup!
    return await login(email, password)
  }, [login])

  // Google OAuth (handles registration and login redirects)
  const googleAuth = useCallback(async (token: string, role?: string) => {
    // Purge stale auth state before google login
    setAccessToken(null)
    setUser(null)
    localStorage.removeItem("access_token")
    localStorage.removeItem("rt_fallback")
    sessionStorage.clear()

    const response = await fetch(`${API_URL}/api/v1/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, role })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.detail || "Google Authentication failed.")
    }

    const data = await response.json()
    
    if (data.status === "needs_role") {
      // Return details to frontend to prompt role selection
      return data
    }

    setAccessToken(data.access_token)
    localStorage.setItem("access_token", data.access_token)
    if (data.refresh_token) {
      localStorage.setItem("rt_fallback", data.refresh_token)
    }

    // Get user details
    try {
      const userRes = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { "Authorization": `Bearer ${data.access_token}` }
      })
      if (userRes.ok) {
        const userData = await userRes.json()
        setUser(userData)
        showToast(`Authenticated with Google as ${userData.name}!`, "success")
      } else {
        setUser({
          id: "google-user",
          email: data.email || "",
          name: data.name || "StudyOS User",
          role: data.role || "student",
          created_at: new Date().toISOString()
        })
      }
    } catch (e) {
      setUser({
        id: "google-user",
        email: data.email || "",
        name: data.name || "StudyOS User",
        role: data.role || "student",
        created_at: new Date().toISOString()
      })
    }
    
    return data
  }, [showToast])

  // Logout
  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: localStorage.getItem("rt_fallback") || undefined })
      })
    } catch (e) {
      console.error("Logout request failed:", e)
    } finally {
      setAccessToken(null)
      setUser(null)
      localStorage.removeItem("access_token")
      localStorage.removeItem("rt_fallback")
      sessionStorage.clear()
      showToast("Logged out successfully.", "info")
    }
  }, [apiFetch, showToast])

  // Forgot Password
  const forgotPassword = useCallback(async (email: string) => {
    const response = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.detail || "Failed to trigger password reset.")
    }

    return await response.json()
  }, [])

  // Reset Password
  const resetPassword = useCallback(async (password: string, token: string) => {
    const response = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_password: password, token })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.detail || "Failed to reset password. Link may be expired.")
    }

    showToast("Password reset successfully! You can now log in.", "success")
  }, [showToast])

  // Update User Profile
  const updateProfile = useCallback(async (name: string, email: string): Promise<User> => {
    const res = await apiFetch("/api/v1/users/profile", {
      method: "PUT",
      body: JSON.stringify({ name, email })
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || "Failed to update profile details.")
    }

    const updatedUser = await res.json()
    setUser(updatedUser)
    showToast("Profile updated successfully", "success")
    return updatedUser
  }, [apiFetch, showToast])

  // Secure Change Password (verifies current password on backend)
  const changePassword = useCallback(async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    const res = await apiFetch("/api/v1/auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      })
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || "Failed to change password.")
    }

    const data = await res.json()
    showToast("Password updated successfully!", "success")
    return data
  }, [apiFetch, showToast])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        accessToken,
        login,
        register,
        googleAuth,
        logout,
        forgotPassword,
        resetPassword,
        refreshAccessToken,
        updateProfile,
        changePassword,
        apiFetch
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
