"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Share2, Copy, CheckCircle } from "lucide-react"
import { useFileStore } from "@/lib/stores/file-store"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface ShareModalProps {
  folderId: number | null
  onClose: () => void
}

export function ShareModal({ folderId, onClose }: ShareModalProps) {
  const { createShareLink } = useFileStore()
  const { toast } = useToast()
  const [duration, setDuration] = useState("7d")
  const [shareUrl, setShareUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCreateLink = async () => {
    if (!folderId) return

    setIsLoading(true)
    try {
      // Clear any previous URL
      setShareUrl("")
      setCopied(false)
      
      console.log("Creating share link for folder ID:", folderId, "with duration:", duration);
      
      // Call the store method to create the share link
      const shareLink = await createShareLink(folderId, duration)
      console.log("Share link result:", JSON.stringify(shareLink, null, 2));

      // Check the exact structure of the returned object
      if (shareLink) {
        console.log("Share link keys:", Object.keys(shareLink));
        console.log("Has token:", !!shareLink.token);
        console.log("Has shareUrl:", !!shareLink.shareUrl);
      }

      if (shareLink && shareLink.token) {
        // Get the share URL - this should always be present now
        const url = shareLink.shareUrl || `${window.location.origin}/share/${shareLink.token}`;
        console.log("Setting share URL:", url);
        setShareUrl(url);
        
        // Show a toast notification
        toast({
          title: "Share Link Created Successfully",
          description: "Your share link is ready to use.",
          variant: "default",
        })
        
        // Try to copy the URL to clipboard automatically
        try {
          await navigator.clipboard.writeText(url)
          setCopied(true)
          toast({
            title: "Link Copied to Clipboard",
            description: "You can paste it anywhere to share your folder.",
          })
        } catch (clipboardError) {
          console.error("Clipboard error:", clipboardError)
          // Don't show another toast for clipboard failure to avoid toast overload
        }
      } else {
        throw new Error("Invalid share link response")
      }
    } catch (error) {
      console.error("Share link error:", error)
      toast({
        title: "Error Creating Share Link",
        description: error instanceof Error ? error.message : "Could not create share link. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        
        // Visual feedback - reset the copied state after 2 seconds
        setTimeout(() => setCopied(false), 2000)
        
        // Show a toast notification
        toast({
          title: "Link Copied Successfully",
          description: "Share link copied to clipboard",
          variant: "default",
        })
      } catch (error) {
        console.error("Failed to copy:", error)
        toast({
          title: "Copy Failed",
          description: "Could not copy to clipboard. Try selecting the link and using Ctrl+C instead.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "No Link Available",
        description: "Create a share link first before copying.",
        variant: "destructive",
      })
    }
  }

  const handleClose = () => {
    setShareUrl("")
    setCopied(false)
    onClose()
  }

  useEffect(() => {
    // Clear state when the modal is reopened for a new folder
    if (folderId) {
      setShareUrl("");
      setCopied(false);
      setIsLoading(false);
    }
  }, [folderId]);

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
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="space-y-3"
                >
                  {/* Success indicator with animation */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="bg-green-500/10 p-3 rounded-lg mb-4 border border-green-500/30"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mr-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h3 className="font-medium text-green-400">Share Link Generated!</h3>
                        <p className="text-xs text-green-300/70 mt-1">
                          Link {copied ? "copied to clipboard" : "ready to share"}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                  
                  <label className="block text-sm font-medium text-gray-300">Share Link</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-800 border-2 border-blue-500/30 rounded-lg p-3 text-sm text-blue-200 font-mono break-all">
                      {shareUrl}
                    </div>
                    <Button 
                      onClick={handleCopy} 
                      size="icon"
                      className={`${copied 
                        ? "bg-green-600 hover:bg-green-700" 
                        : "bg-blue-600 hover:bg-blue-700"} text-white h-10 w-10 transition-colors`}
                    >
                      {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Share this link with others to give them access to this folder. 
                    The link will expire according to the settings you chose.
                  </p>
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
