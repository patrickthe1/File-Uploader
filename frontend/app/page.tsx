"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/stores/auth-store"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push("/dashboard")
      } else {
        router.push("/auth/login")
      }
    }
  }, [user, isLoading, router])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex items-center space-x-2 text-purple-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-lg font-medium">Loading Vibe Vault...</span>
      </div>
    </div>
  )
}
