import React from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Compass, ArrowLeft, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full p-8 rounded-3xl border border-border/80 bg-card/90 shadow-2xl space-y-6"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-primary via-amber-500 to-emerald-500 text-white shadow-xl shadow-primary/20">
          <Compass className="h-10 w-10 animate-spin" style={{ animationDuration: "20s" }} />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-extrabold text-xs uppercase tracking-wider border border-primary/20">
            Error 404
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight font-heading text-foreground pt-1">
            Page Not Found
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            The page or resource you are looking for has moved, been renamed, or does not exist.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" onClick={() => navigate(-1)} className="flex-1 font-bold gap-2 text-xs">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Button onClick={() => navigate("/")} className="flex-1 font-bold gap-2 text-xs shadow-md shadow-primary/20">
            <Home className="h-4 w-4" />
            Return Home
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
export default NotFoundPage
