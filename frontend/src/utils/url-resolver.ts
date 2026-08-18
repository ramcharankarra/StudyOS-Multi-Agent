import { API_BASE_URL } from "@/constants"

/**
 * Resolves a file URL (e.g. "/uploads/lecture.pdf") against the backend server origin.
 * Ensures that relative paths don't trigger frontend React Router 404s.
 */
export const resolveFileUrl = (url: string | undefined | null): string => {
  if (!url || url === "#") return "#"

  // If already absolute URL or data/blob URI
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url
  }

  const cleanPath = url.startsWith("/") ? url : `/${url}`
  return `${API_BASE_URL}${cleanPath}`
}
