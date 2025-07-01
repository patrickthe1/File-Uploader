"use client"

import { motion } from "framer-motion"
import { ChevronRight, Home } from "lucide-react"
import { useFileStore } from "@/lib/stores/file-store"

export function Breadcrumbs() {
  const { currentFolder, loadFolder } = useFileStore()

  const getBreadcrumbPath = (folder: any): any[] => {
    if (!folder) return []
    const path = []
    let current = folder
    while (current) {
      path.unshift(current)
      current = current.parent
    }
    return path
  }

  const breadcrumbs = getBreadcrumbPath(currentFolder)

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center space-x-2 text-sm"
    >
      <button
        onClick={() => loadFolder()}
        className="flex items-center text-gray-400 hover:text-white transition-colors"
      >
        <Home className="w-4 h-4 mr-1" />
        Home
      </button>

      {breadcrumbs.map((folder, index) => (
        <motion.div
          key={folder.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center space-x-2"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
          <button onClick={() => loadFolder(folder.id)} className="text-gray-400 hover:text-white transition-colors">
            {folder.name}
          </button>
        </motion.div>
      ))}
    </motion.nav>
  )
}
