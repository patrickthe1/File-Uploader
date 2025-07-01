"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Share2, Copy, Trash2, ExternalLink, Calendar } from "lucide-react"
import { useFileStore } from "@/lib/stores/file-store"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"

interface ShareLinksModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ShareLinksModal({ isOpen, onClose }: ShareLinksModalProps) {
  const { shareLinks, loadShareLinks, deleteShareLink } = useFileStore()

  useEffect(() => {
    if (isOpen) {
      loadShareLinks()
    }
  }, [isOpen, loadShareLinks])

  const handleCopy = async (token: string) => {
    const url = `${window.location.origin}/share/${token}`
    await navigator.clipboard.writeText(url)
  }

  const handleDelete = async (shareId: number) => {
    await deleteShareLink(shareId)
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Shared Links</h2>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-auto max-h-[calc(80vh-8rem)]">
              {/* Ensure shareLinks is an array */}
              {!Array.isArray(shareLinks) || shareLinks.length === 0 ? (
                <div className="text-center py-8">
                  <Share2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No shared links</h3>
                  <p className="text-gray-500">Create a share link to see it here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shareLinks.map((link) => (
                    <motion.div
                      key={link.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`bg-gray-800/50 border rounded-lg p-4 ${
                        isExpired(link.expiresAt) ? "border-red-500/30" : "border-gray-700"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate">{link.folder?.name || "Unknown Folder"}</h4>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              <span>
                                {isExpired(link.expiresAt) ? "Expired" : "Expires"} {formatDate(link.expiresAt)}
                              </span>
                            </div>
                            <span className={isExpired(link.expiresAt) ? "text-red-400" : "text-green-400"}>
                              {isExpired(link.expiresAt) ? "Expired" : "Active"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {!isExpired(link.expiresAt) && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopy(link.token)}
                                className="text-gray-400 hover:text-white hover:bg-gray-700"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(`/share/${link.token}`, "_blank")}
                                className="text-gray-400 hover:text-white hover:bg-gray-700"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(link.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
