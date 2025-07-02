"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useFileStore } from "@/lib/stores/file-store"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { FileGrid } from "@/components/dashboard/file-grid"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { UploadZone } from "@/components/dashboard/upload-zone"
import { CreateFolderModal } from "@/components/dashboard/create-folder-modal"
import { RenameFolderModal } from "@/components/dashboard/rename-folder-modal"
import { ShareModal } from "@/components/dashboard/share-modal"
import { FilePreviewModal } from "@/components/dashboard/file-preview-modal"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { loadFolder, currentFolder, isLoading, renameFolder: renameFolderAction } = useFileStore()
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showShare, setShowShare] = useState<number | null>(null)
  const [previewFile, setPreviewFile] = useState<any>(null)
  const [renameFolder, setRenameFolder] = useState<{ id: number; name: string } | null>(null)

  const handleRenameFolder = (folderId: number, currentName: string) => {
    setRenameFolder({ id: folderId, name: currentName })
  }

  const handleRename = async (folderId: number, newName: string): Promise<boolean> => {
    try {
      await renameFolderAction(folderId, newName)
      return true
    } catch (error) {
      console.error('Failed to rename folder:', error)
      return false
    }
  }

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }
    
    console.log("Dashboard - Loading folders");
    
    // Load the root folder (no ID means root)
    const loadRootFolder = async () => {
      try {
        await loadFolder();
        console.log("Dashboard - Folders loaded");
      } catch (error) {
        console.error("Error loading folders:", error);
      }
    };
    
    loadRootFolder();
  }, [user, router, loadFolder])

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-950">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <Breadcrumbs />

          <UploadZone />

          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">{currentFolder ? currentFolder.name : "My Files"}</h2>
            <button
              onClick={() => setShowCreateFolder(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              New Folder
            </button>
          </div>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-12"
              >
                <div className="flex items-center space-x-2 text-purple-400">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    className="w-6 h-6 border-2 border-purple-400/30 border-t-purple-400 rounded-full"
                  />
                  <span>Loading...</span>
                </div>
              </motion.div>
            ) : (
              <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <FileGrid 
                  onShareFolder={setShowShare} 
                  onPreviewFile={setPreviewFile}
                  onRenameFolder={handleRenameFolder}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <CreateFolderModal isOpen={showCreateFolder} onClose={() => setShowCreateFolder(false)} />

      <RenameFolderModal 
        folderId={renameFolder?.id || null}
        currentName={renameFolder?.name || ""}
        onClose={() => setRenameFolder(null)}
        onRename={handleRename}
      />

      <ShareModal folderId={showShare} onClose={() => setShowShare(null)} />

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  )
}
