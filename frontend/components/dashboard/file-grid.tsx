"use client"

import { motion } from "framer-motion"
import {
  Folder,
  FileText,
  ImageIcon,
  Video,
  Music,
  Archive,
  File,
  MoreVertical,
  Share2,
  Download,
  Trash2,
  Eye,
  Edit,
} from "lucide-react"
import { useFileStore } from "@/lib/stores/file-store"
import { useAuthStore } from "@/lib/stores/auth-store"
import { formatFileSize, formatDate } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

// API base URL configuration
const API_BASE = 
  typeof window !== "undefined"
    ? ((process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ?? "http://localhost:5000")
    : ((process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ?? "http://localhost:5000")

interface FileGridProps {
  onShareFolder: (folderId: number) => void
  onPreviewFile: (file: any) => void
  onRenameFolder: (folderId: number, currentName: string) => void
}

export function FileGrid({ onShareFolder, onPreviewFile, onRenameFolder }: FileGridProps) {
  const { folders, files, loadFolder, deleteFile, deleteFolder, renameFolder, currentFolder } = useFileStore()
  const { toast } = useToast()

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith("image/")) return ImageIcon
    if (mimetype.startsWith("video/")) return Video
    if (mimetype.startsWith("audio/")) return Music
    if (mimetype.includes("pdf") || mimetype.includes("document")) return FileText
    if (mimetype.includes("zip") || mimetype.includes("rar")) return Archive
    return File
  }

  const canPreview = (mimetype: string) => {
    return mimetype.startsWith("image/") || mimetype.includes("pdf") || mimetype.startsWith("text/")
  }

  const handleRenameFolder = async (folderId: number, currentName: string) => {
    const newName = prompt("Enter new folder name:", currentName)
    if (newName && newName.trim() && newName.trim() !== currentName) {
      const success = await renameFolder(folderId, newName.trim())
      if (success) {
        toast({
          title: "Folder Renamed",
          description: `Folder renamed to "${newName.trim()}".`,
        })
      } else {
        toast({
          title: "Rename Failed",
          description: "Could not rename folder. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleDownload = async (fileId: number, fileName: string) => {
    try {
      toast({
        title: "Starting Download...",
        description: `Preparing ${fileName} for download`,
      })
      
      // First, try to get the file details to access the direct Cloudinary URL
      try {
        const { getAuthHeaders } = useAuthStore.getState()
        const fileResponse = await fetch(`${API_BASE}/api/files/${fileId}`, {
          method: "GET",
          headers: getAuthHeaders(),
        })
        
        if (fileResponse.ok) {
          const fileData = await fileResponse.json()
          const file = fileData.file
          
          // For PDFs, try direct Cloudinary access first
          if (file.mimetype === 'application/pdf' && file.cloudUrl) {
            // Try to open the PDF in a new tab (this works now with Cloudinary settings enabled)
            window.open(file.cloudUrl, '_blank')
            
            toast({
              title: "Download Started",
              description: `${fileName} should open in a new tab. If not, trying alternative method...`,
            })
            
            // Give the direct link a moment to work, then try the backend as backup
            setTimeout(async () => {
              await downloadViaBackend(fileId, fileName)
            }, 2000)
            
            return
          }
        }
      } catch (directError) {

      }
      
      // Fall back to backend download
      await downloadViaBackend(fileId, fileName)
      
    } catch (error) {

      toast({
        title: "Download Failed",
        description: "Could not download the file. Please try again.",
        variant: "destructive",
      })
    }
  }
  
  const downloadViaBackend = async (fileId: number, fileName: string) => {
    // Use fetch with authorization headers to get the file URL and download
    const { getAuthHeaders } = useAuthStore.getState()
    const response = await fetch(`${API_BASE}/api/files/${fileId}/download`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      
      // Check if the response is JSON (backend couldn't proxy file)
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        
        if (data.downloadUrl) {
          // Backend provided a direct URL - open it in new tab
          window.open(data.downloadUrl, '_blank');
          
          toast({
            title: "Download Link Opened",
            description: data.message || "File opened in new tab. If it doesn't work, check your browser's popup blocker.",
          })
        } else {
          throw new Error(data.message || 'No download URL provided');
        }
      } else {
        // Response is a file blob - download normally
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = fileName
        link.style.display = "none"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        toast({
          title: "Download Complete",
          description: `${fileName} has been downloaded.`,
        })
      }
    } else {
      throw new Error(`Download failed with status: ${response.status}`)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  // Ensure folders and files are arrays
  const folderArray = Array.isArray(folders) ? folders : [];
  const fileArray = Array.isArray(files) ? files : [];
  
  if (folderArray.length === 0 && fileArray.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
        <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Folder className="w-12 h-12 text-gray-600" />
        </div>
        <h3 className="text-xl font-medium text-gray-300 mb-2">No files yet</h3>
        <p className="text-gray-500">Upload your first files or create a folder to get started</p>
        
        {currentFolder && (
          <button 
            onClick={() => {
              loadFolder(currentFolder.id);
            }}
            className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            Reload Contents
          </button>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
    >
      {folderArray.map((folder) => (
        <motion.div
          key={`folder-${folder.id}`}
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 hover:border-purple-500/50 transition-all duration-200 cursor-pointer group"
          onClick={() => loadFolder(folder.id)}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
              <Folder className="w-6 h-6 text-purple-400" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                onClick={(e) => e.stopPropagation()}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-700 rounded"
              >
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-800 border-gray-700">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onRenameFolder(folder.id, folder.name)
                  }}
                  className="text-gray-300 hover:text-white hover:bg-gray-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onShareFolder(folder.id)
                  }}
                  className="text-gray-300 hover:text-white hover:bg-gray-700"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteFolder(folder.id).then((success) => {
                      if (success) {
                        toast({
                          title: "Folder Deleted",
                          description: `"${folder.name}" has been deleted.`,
                        })
                      } else {
                        toast({
                          title: "Delete Failed",
                          description: "Could not delete folder. Please try again.",
                          variant: "destructive",
                        })
                      }
                    })
                  }}
                  className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <h3 className="font-medium text-white truncate mb-1">{folder.name}</h3>
          <p className="text-sm text-gray-400">{formatDate(folder.createdAt)}</p>
        </motion.div>
      ))}

      {fileArray.map((file) => {
        const IconComponent = getFileIcon(file.mimetype || "")
        return (
          <motion.div
            key={`file-${file.id}`}
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 hover:border-purple-500/50 transition-all duration-200 group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
                <IconComponent className="w-6 h-6 text-blue-400" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-700 rounded">
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border-gray-700">
                  {canPreview(file.mimetype || "") && (
                    <DropdownMenuItem
                      onClick={() => onPreviewFile(file)}
                      className="text-gray-300 hover:text-white hover:bg-gray-700"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleDownload(file.id, file.name)}
                    className="text-gray-300 hover:text-white hover:bg-gray-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      deleteFile(file.id).then((success) => {
                        if (success) {
                          toast({
                            title: "File Deleted",
                            description: `"${file.name}" has been deleted.`,
                          })
                        } else {
                          toast({
                            title: "Delete Failed",
                            description: "Could not delete file. Please try again.",
                            variant: "destructive",
                          })
                        }
                      })
                    }}
                    className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <h3 className="font-medium text-white truncate mb-1">{file.name}</h3>
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{formatFileSize(file.size || 0)}</span>
              <span>{formatDate(file.createdAt)}</span>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
