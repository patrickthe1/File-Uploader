"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { LogOut, Settings, Share2, User } from "lucide-react"
import { useAuthStore } from "@/lib/stores/auth-store"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ShareLinksModal } from "./share-links-modal"

export function DashboardHeader() {
  const { user, logout } = useAuthStore()
  const [showShareLinks, setShowShareLinks] = useState(false)

  return (
    <>
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
                <p className="text-sm text-gray-400">Your secure storage</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShareLinks(true)}
                className="text-gray-300 hover:text-white hover:bg-gray-800"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Shared Links
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-800">
                    <User className="w-4 h-4 mr-2" />
                    {user?.name || user?.email}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                  <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-gray-700">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem onClick={logout} className="text-red-400 hover:text-red-300 hover:bg-gray-700">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          </div>
        </div>
      </header>

      <ShareLinksModal isOpen={showShareLinks} onClose={() => setShowShareLinks(false)} />
    </>
  )
}
