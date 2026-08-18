export type UserRole = "student" | "teacher"

export interface User {
  id: string
  name: string
  full_name?: string
  email: string
  role: UserRole
  profile_image?: string
  google_id?: string
  created_at: string
}

export interface Course {
  id: string
  title: string
  description?: string
  thumbnail_url?: string
  teacher_id: string
  visibility: "public" | "private"
  created_at: string
  updated_at: string
}

export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  joined_at: string
}

export interface Material {
  id: string
  course_id: string
  title: string
  description?: string
  file_url: string
  file_type: "PDF" | "PPT" | "DOC" | "VIDEO" | "AUDIO" | "OTHER" | string
  file_size?: number
  uploaded_by: string
  created_at: string
}

export interface Assignment {
  id: string
  course_id: string
  title: string
  description?: string
  deadline?: string
  created_at: string
}

export interface Submission {
  id: string
  assignment_id: string
  student_id: string
  file_url: string
  submitted_at: string
  status: "submitted" | "graded" | "pending"
}

export interface Quiz {
  id: string
  course_id: string
  title: string
  description?: string
  created_by: string
  created_at: string
}

export interface Question {
  id: string
  question_text: string
  question_type: string
  options?: string[]
  points: number
}

export interface Grade {
  id: string
  student_id: string
  course_id: string
  score: number
  feedback?: string
  created_at: string
}

export interface ConversationMemory {
  id: string
  user_id: string
  conversation_data: Record<string, any>
  learning_preferences: Record<string, any>
  weak_topics: string[]
  strong_topics: string[]
  created_at: string
  updated_at: string
}
