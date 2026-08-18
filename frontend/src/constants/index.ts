export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL !== undefined ? import.meta.env.VITE_API_BASE_URL : "http://127.0.0.1:8000"
export const API_V1_PREFIX = "/api/v1"

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_V1_PREFIX}/auth/login`,
    REGISTER: `${API_V1_PREFIX}/auth/register`,
    GOOGLE: `${API_V1_PREFIX}/auth/google`,
    REFRESH: `${API_V1_PREFIX}/auth/refresh`,
    LOGOUT: `${API_V1_PREFIX}/auth/logout`,
    FORGOT_PASSWORD: `${API_V1_PREFIX}/auth/forgot-password`,
    RESET_PASSWORD: `${API_V1_PREFIX}/auth/reset-password`,
    ME: `${API_V1_PREFIX}/auth/me`,
  },
  COURSES: `${API_V1_PREFIX}/courses`,
  MATERIALS: `${API_V1_PREFIX}/materials`,
  ASSIGNMENTS: `${API_V1_PREFIX}/assignments`,
  QUIZZES: `${API_V1_PREFIX}/quizzes`,
  GRADES: `${API_V1_PREFIX}/grades`,
  AI: `${API_V1_PREFIX}/ai`,
  MEMORY: `${API_V1_PREFIX}/memory`,
}

export const USER_ROLES = {
  STUDENT: "student" as const,
  TEACHER: "teacher" as const,
}
