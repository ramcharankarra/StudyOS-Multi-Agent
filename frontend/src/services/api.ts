import { API_BASE_URL, API_ENDPOINTS } from "@/constants"
import type { Course, Material, Assignment, Quiz, Grade, ConversationMemory } from "@/types"

export class ApiService {
  public static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    let token = localStorage.getItem("access_token")
    const headers = new Headers(options.headers || {})

    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }

    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }

    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`

    let response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    })

    // Automatic Token Refresh on 401 Unauthorized
    if (response.status === 401 && !url.includes("/auth/login") && !url.includes("/auth/refresh")) {
      const rt = localStorage.getItem("rt_fallback")
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: rt || undefined }),
          credentials: "include"
        })

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json()
          token = refreshData.access_token
          localStorage.setItem("access_token", refreshData.access_token)
          if (refreshData.refresh_token) {
            localStorage.setItem("rt_fallback", refreshData.refresh_token)
          }

          // Retry original request with new access token
          headers.set("Authorization", `Bearer ${token}`)
          response = await fetch(url, {
            ...options,
            headers,
            credentials: "include"
          })
        } else {
          // Refresh failed -> clear stale auth state
          localStorage.removeItem("access_token")
          localStorage.removeItem("rt_fallback")
        }
      } catch (e) {
        console.error("Auto refresh failed in ApiService:", e)
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Request failed with status ${response.status}`)
    }

    return response.json()
  }

  // Courses
  static async getCourses(): Promise<Course[]> {
    return this.request<Course[]>(API_ENDPOINTS.COURSES)
  }

  static async createCourse(data: Partial<Course>): Promise<Course> {
    return this.request<Course>(API_ENDPOINTS.COURSES, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Materials
  static async getMaterials(courseId: string): Promise<Material[]> {
    return this.request<Material[]>(`${API_ENDPOINTS.MATERIALS}/course/${courseId}`)
  }

  // Assignments
  static async getAssignments(courseId: string): Promise<Assignment[]> {
    return this.request<Assignment[]>(`${API_ENDPOINTS.ASSIGNMENTS}/course/${courseId}`)
  }

  // Quizzes
  static async getQuizzes(courseId: string): Promise<Quiz[]> {
    return this.request<Quiz[]>(`${API_ENDPOINTS.QUIZZES}/course/${courseId}`)
  }

  // Grades
  static async getMyGrades(): Promise<Grade[]> {
    return this.request<Grade[]>(`${API_ENDPOINTS.GRADES}/my-grades`)
  }

  // AI & Memory
  static async getAIAgents(): Promise<any[]> {
    return this.request<any[]>(`${API_ENDPOINTS.AI}/agents`)
  }

  // Memory
  static async getMemory(): Promise<ConversationMemory> {
    return this.request<ConversationMemory>(`${API_ENDPOINTS.MEMORY}/me`)
  }
}
