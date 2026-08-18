import React, { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/auth-context"
import { Loader2 } from "lucide-react"

export const GoogleCallbackPage: React.FC = () => {
  const navigate = useNavigate()
  const { googleAuth } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const isProcessingRef = useRef(false)

  useEffect(() => {
    // Prevent duplicate processing in React 19 / StrictMode / re-renders
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    const handleOAuthResponse = async () => {
      try {
        // Parse hash params or query params from Google redirect URL
        const hash = window.location.hash.substring(1)
        const query = window.location.search.substring(1)
        const params = new URLSearchParams(hash || query)

        const idToken = params.get("id_token")
        const accessToken = params.get("access_token")
        const credential = params.get("credential")
        const token = idToken || accessToken || credential
        const errParam = params.get("error") || params.get("error_description")

        if (errParam) {
          const errMsg = `Google OAuth Error: ${errParam}`
          if (window.opener && window.opener !== window) {
            try {
              window.opener.postMessage({ type: "GOOGLE_OAUTH_ERROR", error: errMsg }, window.location.origin)
              window.close()
            } catch (e) {}
          }
          setError(errMsg)
          return
        }

        if (!token) {
          const errMsg = "No authentication token was returned from Google."
          if (window.opener && window.opener !== window) {
            try {
              window.opener.postMessage({ type: "GOOGLE_OAUTH_ERROR", error: errMsg }, window.location.origin)
              window.close()
            } catch (e) {}
          }
          setError(errMsg)
          return
        }

        // Clean up hash/query in URL immediately so subsequent renders don't keep raw token params
        if (window.history.replaceState) {
          window.history.replaceState(null, "", window.location.pathname)
        }

        // Notify opener if running in a popup window
        if (window.opener && window.opener !== window) {
          try {
            window.opener.postMessage({ type: "GOOGLE_OAUTH_SUCCESS", token }, window.location.origin)
            window.close()
          } catch (e) {}
        }

        // Authenticate directly with backend exactly once
        const res = await googleAuth(token) as any

        if (res && res.status === "needs_role") {
          navigate("/signup", { state: { pendingGoogleToken: token, googleData: res }, replace: true })
        } else if (res && res.status === "success") {
          navigate(res.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard", { replace: true })
        } else {
          setError("Google authentication succeeded but failed to resolve user role.")
        }
      } catch (err: any) {
        console.error("Google Callback Error:", err)
        const msg = err.message || "Failed to complete Google Sign-In."
        if (window.opener && window.opener !== window) {
          try {
            window.opener.postMessage({ type: "GOOGLE_OAUTH_ERROR", error: msg }, window.location.origin)
            window.close()
          } catch (e) {}
        }
        setError(msg)
      }
    }

    handleOAuthResponse()
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      {error ? (
        <div className="max-w-md p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold space-y-3">
          <h3 className="font-extrabold text-base">Google Sign-In Failed</h3>
          <p>{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
          >
            Return to Login
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground">Authenticating with Google...</p>
        </div>
      )}
    </div>
  )
}
