import { create } from "zustand"

interface FileItem {
  id: number
  name: string
  mimetype?: string
  size?: number
  cloudUrl?: string
  folderId?: number
  ownerId: number
  createdAt: string
  updatedAt: string
}

interface Folder {
  id: number
  name: string
  ownerId: number
  parentId?: number
  createdAt: string
  updatedAt: string
  files?: FileItem[]
  subfolders?: Folder[]
}

interface ShareLink {
  id: number
  token: string
  folderId: number
  expiresAt: string
  createdAt: string
  folder?: Folder
}

interface FileState {
  currentFolder: Folder | null
  folders: Folder[]
  files: FileItem[]
  shareLinks: ShareLink[]
  isLoading: boolean
  uploadProgress: { [key: string]: number }

  // Actions
  loadFolder: (folderId?: number) => Promise<void>
  createFolder: (name: string, parentId?: number) => Promise<boolean>
  uploadFiles: (files: FileList, folderId?: number) => Promise<boolean>
  deleteFile: (fileId: number) => Promise<boolean>
  deleteFolder: (folderId: number) => Promise<boolean>
  createShareLink: (folderId: number, duration?: string) => Promise<string | null>
  loadShareLinks: () => Promise<void>
  deleteShareLink: (shareId: number) => Promise<boolean>
  moveFile: (fileId: number, newFolderId?: number) => Promise<boolean>
  moveFolder: (folderId: number, newParentId?: number) => Promise<boolean>
}

const API_BASE = "http://localhost:5000"

export const useFileStore = create<FileState>((set, get) => ({
  currentFolder: null,
  folders: [],
  files: [],
  shareLinks: [], // Ensure this is always initialized as an empty array
  isLoading: false,
  uploadProgress: {},

  loadFolder: async (folderId?: number) => {
    set({ isLoading: true })
    try {
      const url = folderId
        ? `${API_BASE}/api/folders/${folderId}?includeContents=true`
        : `${API_BASE}/api/folders?includeChildren=true`

      const response = await fetch(url, { credentials: "include" })

      if (response.ok) {
        const data = await response.json()

        if (folderId) {
          // Make sure we always set arrays for files and folders
          const files = Array.isArray(data.files) ? data.files : [];
          const subfolders = Array.isArray(data.subfolders) ? data.subfolders : 
                           (data.children ? Array.isArray(data.children) ? data.children : [] : []);
          
          set({ currentFolder: data, files: files, folders: subfolders })
        } else {
          // Ensure we're setting an array for folders
          const folders = Array.isArray(data) ? data : [];
          set({ folders: folders, files: [], currentFolder: null })
        }
      }
    } catch (error) {
      console.error("Load folder error:", error)
    } finally {
      set({ isLoading: false })
    }
  },

  createFolder: async (name: string, parentId?: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, parentId }),
      })

      if (response.ok) {
        await get().loadFolder(parentId)
        return true
      }
      return false
    } catch (error) {
      console.error("Create folder error:", error)
      return false
    }
  },

  uploadFiles: async (files: FileList, folderId?: number) => {
    const formData = new FormData()
    Array.from(files).forEach((file) => formData.append("files", file))
    if (folderId) formData.append("folderId", folderId.toString())

    try {
      const response = await fetch(`${API_BASE}/api/files/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })

      if (response.ok) {
        await get().loadFolder(folderId)
        return true
      }
      return false
    } catch (error) {
      console.error("Upload error:", error)
      return false
    }
  },

  deleteFile: async (fileId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/files/${fileId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (response.ok) {
        const currentFolderId = get().currentFolder?.id
        await get().loadFolder(currentFolderId)
        return true
      }
      return false
    } catch (error) {
      console.error("Delete file error:", error)
      return false
    }
  },

  deleteFolder: async (folderId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/folders/${folderId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (response.ok) {
        const currentFolderId = get().currentFolder?.id
        await get().loadFolder(currentFolderId)
        return true
      }
      return false
    } catch (error) {
      console.error("Delete folder error:", error)
      return false
    }
  },

  createShareLink: async (folderId: number, duration = "7d") => {
    try {
      const response = await fetch(`${API_BASE}/api/folders/${folderId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ duration }),
      })

      if (response.ok) {
        const shareLink = await response.json()
        await get().loadShareLinks()
        return shareLink.token
      }
      return null
    } catch (error) {
      console.error("Create share link error:", error)
      return null
    }
  },

  loadShareLinks: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sharelinks`, {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        // Ensure shareLinks is always an array
        const shareLinks = Array.isArray(data) ? data : [];
        set({ shareLinks })
      }
    } catch (error) {
      console.error("Load share links error:", error)
      // Set empty array in case of error
      set({ shareLinks: [] })
    }
  },

  deleteShareLink: async (shareId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/sharelinks/${shareId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (response.ok) {
        await get().loadShareLinks()
        return true
      }
      return false
    } catch (error) {
      console.error("Delete share link error:", error)
      return false
    }
  },

  moveFile: async (fileId: number, newFolderId?: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/files/${fileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ folderId: newFolderId }),
      })

      if (response.ok) {
        const currentFolderId = get().currentFolder?.id
        await get().loadFolder(currentFolderId)
        return true
      }
      return false
    } catch (error) {
      console.error("Move file error:", error)
      return false
    }
  },

  moveFolder: async (folderId: number, newParentId?: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/folders/${folderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ parentId: newParentId }),
      })

      if (response.ok) {
        const currentFolderId = get().currentFolder?.id
        await get().loadFolder(currentFolderId)
        return true
      }
      return false
    } catch (error) {
      console.error("Move folder error:", error)
      return false
    }
  },
}))
