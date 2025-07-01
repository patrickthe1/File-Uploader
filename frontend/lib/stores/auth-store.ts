import { create } from "zustand"
import { persist } from "zustand/middleware"

interface User {
  id: number
  email: string
  name?: string
  createdAt?: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name?: string) => Promise<boolean>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

// Read from env so we can change this without editing code.
// Provide a sensible local default for development.
const API_BASE =
  typeof window !== "undefined"
    ? ((process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ?? "http://localhost:5000")
    : ((process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ?? "http://localhost:5000")

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,

      login: async (email: string, password: string) => {
        try {
          const response = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password }),
          })

          if (response.ok) {
            const data = await response.json()
            // The server returns { message: '...', user: {...} }
            if (data.user) {
              set({ user: data.user })
              return true
            } else if (data && typeof data === 'object') {
              // Handle case where the response might be the user object directly
              set({ user: data })
              return true
            }
          }
          return false
        } catch (error) {
          console.error("Login error:", error)
          return false
        }
      },

      register: async (email: string, password: string, name?: string) => {
        try {
          const response = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password, name }),
          })

          if (response.ok) {
            // Auto-login after registration
            return await get().login(email, password)
          }
          return false
        } catch (error) {
          console.error("Register error:", error)
          return false
        }
      },

      logout: async () => {
        try {
          await fetch(`${API_BASE}/auth/logout`, {
            method: "GET",
            credentials: "include",
          })
        } catch (error) {
          console.error("Logout error:", error)
        } finally {
          set({ user: null })
        }
      },

      checkAuth: async () => {
        // If the backend URL isn't configured just mark auth as unauthenticated.
        if (!API_BASE) {
          set({ user: null, isLoading: false })
          return
        }

        try {
          const response = await fetch(`${API_BASE}/auth/profile`, {
            credentials: "include",
          })

          if (response.ok) {
            const data = await response.json()
            // The profile endpoint returns { user: {...} }
            if (data.user) {
              set({ user: data.user, isLoading: false })
            } else if (data && typeof data === 'object') {
              // Handle case where response might be user object directly
              set({ user: data, isLoading: false })
            } else {
              set({ user: null, isLoading: false })
            }
          } else {
            set({ user: null, isLoading: false })
          }
        } catch (error) {
          console.error("Auth check error:", error)
          set({ user: null, isLoading: false })
        }
      },
    }),
    {
      name: "vibe-vault-auth",
      partialize: (state) => ({ user: state.user }),
    },
  ),
)
