import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

interface GoogleOAuthButtonProps {
  onSuccess: (token: string) => void
  onError?: (error: string) => void
  isLoading?: boolean
  className?: string
  text?: string
}

export const GoogleOAuthButton: React.FC<GoogleOAuthButtonProps> = ({
  onSuccess,
  onError,
  isLoading = false,
  className = "",
  text = "Continue with Google"
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // Configure Client ID strictly from environment variable
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ""

  useEffect(() => {
    // Listen for postMessage from Google Callback popup window
    const handleMessage = (event: MessageEvent) => {
      // Validate origin for security
      if (event.origin !== window.location.origin) return

      if (event.data?.type === "GOOGLE_OAUTH_SUCCESS" && event.data?.token) {
        setIsAuthenticating(false)
        onSuccess(event.data.token)
      } else if (event.data?.type === "GOOGLE_OAUTH_ERROR") {
        setIsAuthenticating(false)
        if (onError) {
          onError(event.data.error || "Google sign-in failed.")
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [onSuccess, onError])

  const handleStartGoogleOAuth = () => {
    try {
      setIsAuthenticating(true)
      
      const envRedirect = import.meta.env.VITE_GOOGLE_REDIRECT_URI
      const redirectUri = (envRedirect && !envRedirect.includes("localhost") && !envRedirect.includes("127.0.0.1"))
        ? envRedirect
        : `${window.location.origin}/auth/google/callback`
      const nonce = Math.random().toString(36).substring(2, 15)
      
      // Standard Official Google OAuth 2.0 Authorization Endpoint
      const googleAuthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token%20id_token` +
        `&scope=${encodeURIComponent("openid email profile")}` +
        `&prompt=select_account` +
        `&nonce=${nonce}`

      // Direct navigation ensures 100% browser compatibility (Safari, Chrome, Firefox, iOS)
      // preventing popup blockers and cross-origin blank screens
      window.location.href = googleAuthUrl
    } catch (err: any) {
      setIsAuthenticating(false)
      if (onError) {
        onError(err.message || "Failed to launch Google Sign-In.")
      }
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={isLoading || isAuthenticating}
      onClick={handleStartGoogleOAuth}
      className={`w-full relative flex items-center justify-center gap-3 font-semibold text-sm transition-all duration-200 border border-border/80 hover:border-border bg-card hover:bg-muted/50 text-foreground rounded-xl shadow-xs hover:shadow-md cursor-pointer ${className}`}
    >
      {/* Standard Google G Logo (Official SVG Vector) */}
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </svg>
      <span>{isAuthenticating ? "Opening Google..." : text}</span>
    </Button>
  )
}
