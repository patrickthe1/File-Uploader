import { create } from "zustand"
import { toast } from "@/hooks/use-toast"

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
  shareUrl?: string
  folder?: Folder
}

interface FileState {
  currentFolder: Folder | null
  folders: Folder[]
  files: FileItem[]
  shareLinks: ShareLink[]
  isLoading: boolean
  uploadProgress: { [key: string]: number }
  navigationHistory: Folder[] // Track the navigation path

  // Actions
  loadFolder: (folderId?: number) => Promise<void>
  createFolder: (name: string, parentId?: number) => Promise<boolean>
  renameFolder: (folderId: number, newName: string) => Promise<boolean>
  uploadFiles: (files: FileList, folderId?: number) => Promise<boolean>
  deleteFile: (fileId: number) => Promise<boolean>
  deleteFolder: (folderId: number) => Promise<boolean>
  createShareLink: (folderId: number, duration?: string) => Promise<ShareLink | null>
  loadShareLinks: () => Promise<void>
  deleteShareLink: (shareId: number) => Promise<boolean>
  moveFile: (fileId: number, newFolderId?: number) => Promise<boolean>
  moveFolder: (folderId: number, newParentId?: number) => Promise<boolean>
}

// Read from env so we can change this without editing code.
// Provide a sensible local default for development.
const API_BASE =
  typeof window !== "undefined"
    ? ((process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ?? "http://localhost:5000")
    : ((process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ?? "http://localhost:5000")

export const useFileStore = create<FileState>((set, get) => ({
  currentFolder: null,
  folders: [],
  files: [],
  shareLinks: [], // Ensure this is always initialized as an empty array
  isLoading: false,
  uploadProgress: {},
  navigationHistory: [],

  loadFolder: async (folderId?: number) => {
    set({ isLoading: true })
    try {
      const url = folderId
        ? `${API_BASE}/api/folders/${folderId}?includeChildren=true&includeFiles=true`
        : `${API_BASE}/api/folders?parentId=null`

      const response = await fetch(url, { credentials: "include" })

      if (response.ok) {
        const data = await response.json()

        if (folderId) {
          // The API returns { folder: {...} } for specific folder requests
          const folderData = data.folder || data;
          
          // Get files directly from the folder object
          const files = Array.isArray(folderData.files) ? folderData.files : [];
          
          // Get subfolders (children) from the folder object
          const subfolders = Array.isArray(folderData.children) ? folderData.children : [];
          
          // Update navigation history
          const currentHistory = get().navigationHistory;
          let newHistory = [...currentHistory];
          
          // Check if this folder is already in history
          const existingIndex = newHistory.findIndex(f => f.id === folderData.id);
          if (existingIndex >= 0) {
            // Update the existing folder data (in case name changed due to rename)
            newHistory[existingIndex] = folderData;
            // Trim history to this point (in case we navigated back)
            newHistory = newHistory.slice(0, existingIndex + 1);
          } else {
            // Going forward - add to history
            newHistory.push(folderData);
          }
          
          set({ 
            currentFolder: folderData, 
            files: files, 
            folders: subfolders,  // These are the subfolders within the current folder
            navigationHistory: newHistory
          })
        } else {
          // For root folder listing - reset navigation history
          
          // The API returns { folders: [...] } for root requests
          const folders = Array.isArray(data) ? data : 
                         (data.folders && Array.isArray(data.folders) ? data.folders : []);
          
          set({ folders: folders, files: [], currentFolder: null, navigationHistory: [] })
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
        // Reload the current folder view to show the new folder
        const currentFolderId = get().currentFolder?.id
        await get().loadFolder(currentFolderId)
        
        toast({
          title: "Success",
          description: `Folder "${name}" created successfully.`,
        })
        return true
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to create folder.",
          variant: "destructive",
        })
      }
      return false
    } catch (error) {
      console.error("Create folder error:", error)
      toast({
        title: "Error",
        description: "Failed to create folder. Please try again.",
        variant: "destructive",
      })
      return false
    }
  },

  renameFolder: async (folderId: number, newName: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/folders/${folderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName }),
      });

      if (response.ok) {
        const updatedFolder = await response.json();
        
        set((state) => {
          const isRenamingCurrentFolder = state.currentFolder?.id === folderId;

          // Update the name of the current folder if it's the one being renamed
          const newCurrentFolder = isRenamingCurrentFolder && state.currentFolder
            ? { ...state.currentFolder, name: newName } as Folder
            : state.currentFolder;

          // Update the folder in the subfolders list
          const newFolders = state.folders.map((folder) =>
            folder.id === folderId ? { ...folder, name: newName } : folder
          );

          // Also update the folder if it's in the navigation history
          const newHistory = state.navigationHistory.map((folder) =>
            folder.id === folderId ? { ...folder, name: newName } : folder
          );

          return {
            currentFolder: newCurrentFolder,
            folders: newFolders,
            navigationHistory: newHistory,
          };
        });

        toast({
          title: "Success",
          description: `Folder renamed to "${newName}".`,
        });
        return true;
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to rename folder.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Rename folder error:", error);
      toast({
        title: "Error",
        description: "Failed to rename folder. Please try again.",
        variant: "destructive",
      });
      return false;
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create share link: ${response.statusText}`);
      }

      const data = await response.json();
      
      
      // Load the share links into the store
      await get().loadShareLinks();
      
      // Return the shareLink object with all its properties
      if (data && data.shareLink) {
        return {
          ...data.shareLink,
          // Ensure we have a shareUrl by constructing it if it's not present
          shareUrl: data.shareLink.shareUrl || `${window.location.origin}/share/${data.shareLink.token}`
        };
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (error) {
      console.error("Create share link error:", error);
      throw error; // Re-throw to allow the component to handle it
    }
  },

  loadShareLinks: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sharelinks`, {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json();
        // The API returns { shareLinks: [...] }, so we need to access that property
        const shareLinks = Array.isArray(data.shareLinks) ? data.shareLinks : [];
        set({ shareLinks });
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
