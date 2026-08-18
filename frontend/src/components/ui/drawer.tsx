import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export const Drawer = DialogPrimitive.Root
export const DrawerTrigger = DialogPrimitive.Trigger
export const DrawerPortal = DialogPrimitive.Portal

export const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40 backdrop-blur-xs",
      className
    )}
    {...props}
  />
))
DrawerOverlay.displayName = DialogPrimitive.Overlay.displayName

export const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { 
    isOpen?: boolean
    side?: "left" | "right" 
  }
>(({ className, children, isOpen = true, side = "right", ...props }, ref) => (
  <DrawerPortal>
    <AnimatePresence>
      {isOpen && (
        <>
          <DrawerOverlay />
          <DialogPrimitive.Content
            ref={ref}
            asChild
            {...props}
          >
            <motion.div
              initial={{ x: side === "right" ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: side === "right" ? "100%" : "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className={cn(
                "fixed inset-y-0 z-50 w-full max-w-sm bg-card p-6 shadow-2xl border-l border-border/80 flex flex-col focus:outline-none",
                side === "left" ? "left-0 border-r" : "right-0 border-l",
                className
              )}
            >
              {children}
              <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer focus:outline-none">
                <X className="h-4.5 w-4.5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </motion.div>
          </DialogPrimitive.Content>
        </>
      )}
    </AnimatePresence>
  </DrawerPortal>
))
DrawerContent.displayName = DialogPrimitive.Content.displayName
export default Drawer
