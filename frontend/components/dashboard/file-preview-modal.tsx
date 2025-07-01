"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Download, FileText, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FilePreviewModalProps {
  file: any
  onClose: () => void
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/files/${file.id}/download`, {
        credentials: "include",
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  const renderPreview = () => {
    if (!file.mimetype) return null

    if (file.mimetype.startsWith("image/")) {
      return (
        <div className="flex items-center justify-center bg-gray-800 rounded-lg p-4">
          <img
            src={file.cloudUrl || "/placeholder.svg"}
            alt={file.name}
            className="max-w-full max-h-96 object-contain rounded-lg"
            crossOrigin="anonymous"
          />
        </div>
      )
    }

    if (file.mimetype.includes("pdf")) {
      return (
        <div className="flex flex-col items-center justify-center bg-gray-800 rounded-lg p-8 text-center">
          <FileText className="w-16 h-16 text-red-400 mb-4" />
          <p className="text-gray-300 mb-2">PDF Preview</p>
          <p className="text-sm text-gray-500">Click download to view the full PDF</p>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center bg-gray-800 rounded-lg p-8 text-center">
        <ImageIcon className="w-16 h-16 text-gray-400 mb-4" />
        <p className="text-gray-300 mb-2">Preview not available</p>
        <p className="text-sm text-gray-500">Download the file to view its contents</p>
      </div>
    )
  }

  return (
    <AnimatePresence>
      {file && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white truncate">{file.name}</h2>
                <p className="text-sm text-gray-400">
                  {file.mimetype} • {((file.size || 0) / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button onClick={handleDownload} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-auto max-h-[calc(90vh-8rem)]">{renderPreview()}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
