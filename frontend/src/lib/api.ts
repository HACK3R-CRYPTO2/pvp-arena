import axios from 'axios'

// Normalizes URLs to ensure they have a protocol and no trailing slash
function normalizeUrl(url: string | undefined, defaultLocal: string): string {
  if (!url) return defaultLocal
  
  let normalized = url.trim()
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    // If it's a localhost-style string or just a domain
    if (normalized.includes('localhost') || normalized.includes('127.0.0.1')) {
      normalized = `http://${normalized}`
    } else {
      normalized = `https://${normalized}`
    }
  }
  
  // Remove trailing slash
  return normalized.replace(/\/$/, '')
}

// Get API URL - throws at runtime if not set
function getApiUrl(): string {
  const url = normalizeUrl(process.env.NEXT_PUBLIC_API_URL, '')
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_URL environment variable is required')
  }
  return url
}

// Create axios instance lazily to avoid runtime errors during SSR/build
let apiInstance: ReturnType<typeof axios.create> | null = null

export function getApi() {
  if (!apiInstance) {
    apiInstance = axios.create({
      baseURL: getApiUrl(),
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
  return apiInstance
}

// Export a proxy that creates the instance on first use
export const api = {
  get: (url: string) => getApi().get(url),
  post: (url: string, data?: unknown) => getApi().post(url, data),
  put: (url: string, data?: unknown) => getApi().put(url, data),
  delete: (url: string) => getApi().delete(url),
}

// Backend-specific API instance (3001)
let backendInstance: ReturnType<typeof axios.create> | null = null

export function getBackendApi() {
  if (!backendInstance) {
    const url = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL, 'http://localhost:3001')
    backendInstance = axios.create({
      baseURL: url,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
  return backendInstance
}

export const backendApi = {
  get: (url: string) => getBackendApi().get(url),
  post: (url: string, data?: unknown) => getBackendApi().post(url, data),
}
