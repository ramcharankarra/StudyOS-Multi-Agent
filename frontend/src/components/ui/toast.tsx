import React, { createContext, useContext, useState, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react"

type ToastType = "success" | "error" | "info"

interface ToastMessage {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    
    // Automatically remove toast after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
              className="pointer-events-auto flex items-center justify-between p-4.5 rounded-xl border border-border bg-card text-foreground shadow-lg relative overflow-hidden"
            >
              {/* Left highlight indicator based on type */}
              <div 
                className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  toast.type === "success" ? "bg-emerald-500" :
                  toast.type === "error" ? "bg-destructive" : "bg-primary"
                }`}
              />
              
              <div className="flex items-start gap-3.5 pl-2.5">
                <div className="mt-0.5 shrink-0">
                  {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                  {toast.type === "error" && <AlertTriangle className="h-5 w-5 text-destructive" />}
                  {toast.type === "info" && <Info className="h-5 w-5 text-primary" />}
                </div>
                <p className="text-sm font-bold leading-normal pr-6 text-left select-none tracking-wide">
                  {toast.message}
                </p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-muted-foreground/40 hover:text-foreground p-1 rounded-md transition-colors cursor-pointer self-start shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
export default ToastProvider
