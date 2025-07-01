"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Folder,
  FileText,
  ImageIcon,
  Video,
  Music,
  Archive,
  File,
  Download,
  Eye,
  ArrowLeft,
  Share2,
  X,
} from "lucide-react"
import { formatFileSize, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SharedFile {
  id: number
  name: string
  mimetype?: string
  size?: number
  cloudUrl?: string
  createdAt: string
}

interface SharedFolder {
  id: number
  name: string
  createdAt: string
  files?: SharedFile[]
  subfolders?: SharedFolder[]
}

export default function SharePage() {
  const params = useParams()
  const token = params.token as string
  const [folder, setFolder] = useState<SharedFolder | null>(null)
  const [currentPath, setCurrentPath] = useState<SharedFolder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [previewFile, setPreviewFile] = useState<SharedFile | null>(null)

  useEffect(() => {
    loadSharedFolder()
  }, [token])

  const loadSharedFolder = async (folderId?: number) => {
    setIsLoading(true)
    try {
      const url = folderId
        ? `http://localhost:5000/share/${token}/folder/${folderId}`
        : `http://localhost:5000/share/${token}`

      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        setFolder(data)
        setError("")
      } else {
        setError("Share link not found or expired")
      }
    } catch (error) {
      setError("Failed to load shared content")
    } finally {
      setIsLoading(false)
    }
  }

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith("image/")) return ImageIcon
    if (mimetype.startsWith("video/")) return Video
    if (mimetype.startsWith("audio/")) return Music
    if (mimetype.includes("pdf") || mimetype.includes("document")) return FileText
    if (mimetype.includes("zip") || mimetype.includes("rar")) return Archive
    return File
  }

  const handleDownload = async (fileId: number, fileName: string) => {
    try {
      const response = await fetch(`http://localhost:5000/share/${token}/files/${fileId}/download`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  const canPreview = (mimetype: string) => {
    return mimetype.startsWith("image/") || mimetype.includes("pdf") || mimetype.startsWith("text/")
  }

  const navigateToFolder = (subfolder: SharedFolder) => {
    setCurrentPath([...currentPath, folder!])
    setFolder(subfolder)
  }

  const navigateBack = () => {
    if (currentPath.length > 0) {
      const previousFolder = currentPath[currentPath.length - 1]
      setCurrentPath(currentPath.slice(0, -1))
      setFolder(previousFolder)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-purple-400">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="w-6 h-6 border-2 border-purple-400/30 border-t-purple-400 rounded-full"
          />
          <span className="text-lg font-medium">Loading shared content...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Share2 className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-xl border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatDelay: 3 }}
                  className="text-lg font-bold text-white"
                >
                  V
                </motion.div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Vibe Vault</h1>
                <p className="text-sm text-gray-400">Shared with you</p>
              </div>
            </motion.div>

            {currentPath.length > 0 && (
              <Button
                onClick={navigateBack}
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-white hover:bg-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">{folder?.name || "Shared Folder"}</h2>
          </div>

          {/* Files and Folders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {/* Subfolders */}
            {folder?.subfolders?.map((subfolder) => (
              <motion.div
                key={`folder-${subfolder.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 hover:border-purple-500/50 transition-all duration-200 cursor-pointer"
                onClick={() => navigateToFolder(subfolder)}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center mb-3">
                  <Folder className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="font-medium text-white truncate mb-1">{subfolder.name}</h3>
                <p className="text-sm text-gray-400">{formatDate(subfolder.createdAt)}</p>
              </motion.div>
            ))}

            {/* Files */}
            {folder?.files?.map((file) => {
              const IconComponent = getFileIcon(file.mimetype || "")
              return (
                <motion.div
                  key={`file-${file.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 hover:border-purple-500/50 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
                      <IconComponent className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canPreview(file.mimetype || "") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPreviewFile(file)}
                          className="text-gray-400 hover:text-white hover:bg-gray-700 p-1"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(file.id, file.name)}
                        className="text-gray-400 hover:text-white hover:bg-gray-700 p-1"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-medium text-white truncate mb-1">{file.name}</h3>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>{formatFileSize(file.size || 0)}</span>
                    <span>{formatDate(file.createdAt)}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Empty State */}
          {!folder?.files?.length && !folder?.subfolders?.length && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder className="w-12 h-12 text-gray-600" />
              </div>
              <h3 className="text-xl font-medium text-gray-300 mb-2">Empty folder</h3>
              <p className="text-gray-500">This shared folder doesn't contain any files</p>
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* File Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewFile(null)}
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
                  <h2 className="text-xl font-semibold text-white truncate">{previewFile.name}</h2>
                  <p className="text-sm text-gray-400">
                    {previewFile.mimetype} • {formatFileSize(previewFile.size || 0)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handleDownload(previewFile.id, previewFile.name)}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <button
                    onClick={() => setPreviewFile(null)}
                    className="text-gray-400 hover:text-white transition-colors p-2"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="overflow-auto max-h-[calc(90vh-8rem)]">
                {previewFile.mimetype?.startsWith("image/") ? (
                  <div className="flex items-center justify-center bg-gray-800 rounded-lg p-4">
                    <img
                      src={previewFile.cloudUrl || "/placeholder.svg"}
                      alt={previewFile.name}
                      className="max-w-full max-h-96 object-contain rounded-lg"
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center bg-gray-800 rounded-lg p-8 text-center">
                    <FileText className="w-16 h-16 text-gray-400 mb-4" />
                    <p className="text-gray-300 mb-2">Preview not available</p>
                    <p className="text-sm text-gray-500">Download the file to view its contents</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
