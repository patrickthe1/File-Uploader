"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, X, CheckCircle, AlertCircle } from "lucide-react"
import { useFileStore } from "@/lib/stores/file-store"
import { useDropzone } from "react-dropzone"

export function UploadZone() {
  const { uploadFiles, currentFolder } = useFileStore()
  const [uploadQueue, setUploadQueue] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadQueue((prev) => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const removeFromQueue = (index: number) => {
    setUploadQueue((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (uploadQueue.length === 0) return

    setUploading(true)
    setUploadStatus("idle")

    try {
      const fileList = new DataTransfer()
      uploadQueue.forEach((file) => fileList.items.add(file))

      const success = await uploadFiles(fileList.files, currentFolder?.id)

      if (success) {
        setUploadStatus("success")
        setUploadQueue([])
        setTimeout(() => setUploadStatus("idle"), 3000)
      } else {
        setUploadStatus("error")
      }
    } catch (error) {
      setUploadStatus("error")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <motion.div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
          ${
            isDragActive ? "border-purple-500 bg-purple-500/10" : "border-gray-600 hover:border-gray-500 bg-gray-800/30"
          }
        `}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input {...getInputProps()} />
        <motion.div animate={isDragActive ? { scale: 1.1 } : { scale: 1 }} transition={{ duration: 0.2 }}>
          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? "text-purple-400" : "text-gray-400"}`} />
          <h3 className="text-lg font-medium text-white mb-2">{isDragActive ? "Drop files here" : "Upload Files"}</h3>
          <p className="text-gray-400">Drag and drop files here, or click to select files</p>
          <p className="text-sm text-gray-500 mt-2">Maximum file size: 10MB</p>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {uploadQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-800/50 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-white">Upload Queue ({uploadQueue.length})</h4>
              <div className="flex items-center space-x-2">
                {uploadStatus === "success" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center text-green-400"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm">Uploaded successfully!</span>
                  </motion.div>
                )}
                {uploadStatus === "error" && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center text-red-400">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm">Upload failed</span>
                  </motion.div>
                )}
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  {uploading ? "Uploading..." : "Upload All"}
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {uploadQueue.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    onClick={() => removeFromQueue(index)}
                    className="text-gray-400 hover:text-red-400 transition-colors p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
