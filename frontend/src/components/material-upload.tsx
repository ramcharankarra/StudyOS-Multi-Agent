import React, { useState, useRef } from "react"
import { motion } from "framer-motion"
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/context/auth-context"

interface MaterialUploadProps {
  courseId: string
  onSuccess: () => void
  onClose: () => void
}

export const MaterialUpload: React.FC<MaterialUploadProps> = ({ courseId, onSuccess, onClose }) => {
  const { showToast } = useToast()
  const { apiFetch } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)

  const handleFileSelect = (file: File) => {
    setError("")
    if (file.size > 50 * 1024 * 1024) {
      setError("File size exceeds maximum limit of 50MB")
      return
    }
    setSelectedFile(file)
    if (!title) {
      const name = file.name.substring(0, file.name.lastIndexOf(".")) || file.name
      setTitle(name)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setError("Please select a document or file to upload.")
      return
    }

    if (!courseId) {
      setError("No valid course selected. Please select a course before uploading.")
      showToast("No course selected.", "error")
      return
    }

    setIsUploading(true)
    setError("")
    setUploadProgress(20)

    try {
      const formData = new FormData()
      formData.append("course_id", courseId)
      formData.append("title", title.trim())
      if (description.trim()) {
        formData.append("description", description.trim())
      }
      formData.append("file", selectedFile)

      setUploadProgress(50)

      const response = await apiFetch("/api/v1/materials/upload", {
        method: "POST",
        body: formData
      })

      setUploadProgress(85)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.detail || errorData.message || `Upload failed with status HTTP ${response.status}`
        setError(errorMessage)
        showToast(errorMessage, "error")
        throw new Error(errorMessage)
      }

      setUploadProgress(100)
      setIsSuccess(true)
      showToast("Material uploaded successfully!", "success")
      
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1000)

    } catch (err: any) {
      console.error("[MaterialUpload Error]:", err)
      const msg = err.message || "An unexpected error occurred during upload"
      setError(msg)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-card border border-border/80 rounded-3xl p-6 shadow-2xl relative text-left select-none overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/30 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg font-heading">Add Learning Resource</h3>
              <p className="text-xs text-muted-foreground">Upload course slides, PDFs, or lecture notes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-border hover:bg-muted cursor-pointer transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Success animation state */}
        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-12 text-center space-y-4"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 shadow-md">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="font-bold text-lg font-heading">Upload Complete!</h4>
            <p className="text-xs text-muted-foreground">Resource processed and added to course curriculum.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-primary bg-primary/10 scale-[1.01]"
                  : selectedFile
                  ? "border-emerald-500/50 bg-emerald-500/[0.04]"
                  : "border-border/80 bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.png,.jpg,.jpeg"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />

              {selectedFile ? (
                <div className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-3 text-left">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground truncate max-w-[240px]">{selectedFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 px-2.5 py-1 rounded-full bg-emerald-500/15">Selected</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-primary">Click to upload</span> or drag and drop
                  </div>
                  <p className="text-[10px] text-muted-foreground">PDF, PPTX, DOCX, TXT or Images (Max 50MB)</p>
                </div>
              )}
            </div>

            {/* Inputs */}
            <Input
              label="Resource Title"
              type="text"
              placeholder="e.g. Chapter 1: Introduction to Data Structures"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80 pl-0.5">Description (Optional)</label>
              <textarea
                rows={2}
                placeholder="Brief summary of what this document covers..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                  <span>Uploading to Storage...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isUploading} disabled={!selectedFile || !title.trim()} className="font-bold shadow-md shadow-primary/20">
                Upload Resource
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  )
}
export default MaterialUpload
