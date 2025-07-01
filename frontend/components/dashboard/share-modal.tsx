"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Share2, Copy, CheckCircle } from "lucide-react"
import { useFileStore } from "@/lib/stores/file-store"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ShareModalProps {
  folderId: number | null
  onClose: () => void
}

export function ShareModal({ folderId, onClose }: ShareModalProps) {
  const { createShareLink } = useFileStore()
  const [duration, setDuration] = useState("7d")
  const [shareUrl, setShareUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCreateLink = async () => {
    if (!folderId) return

    setIsLoading(true)
    const token = await createShareLink(folderId, duration)

    if (token) {
      setShareUrl(`${window.location.origin}/share/${token}`)
    }

    setIsLoading(false)
  }

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setShareUrl("")
    setCopied(false)
    onClose()
  }

  useEffect(() => {
    if (folderId && !shareUrl) {
      handleCreateLink()
    }
  }, [folderId])

  return (
    <AnimatePresence>
      {folderId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Share Folder</h2>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Link Expiration</label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="24h" className="text-white hover:bg-gray-700">
                      24 Hours
                    </SelectItem>
                    <SelectItem value="7d" className="text-white hover:bg-gray-700">
                      7 Days
                    </SelectItem>
                    <SelectItem value="30d" className="text-white hover:bg-gray-700">
                      30 Days
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {shareUrl && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">Share Link</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-gray-300 font-mono break-all">
                      {shareUrl}
                    </div>
                    <Button onClick={handleCopy} size="sm" className="bg-gray-700 hover:bg-gray-600 text-white">
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  {copied && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-green-400">
                      Link copied to clipboard!
                    </motion.p>
                  )}
                </motion.div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  className="text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  Close
                </Button>
                {!shareUrl && (
                  <Button
                    onClick={handleCreateLink}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                      />
                    ) : (
                      <Share2 className="w-4 h-4 mr-2" />
                    )}
                    Create Share Link
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
