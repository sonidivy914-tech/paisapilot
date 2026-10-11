import { supabase } from './supabase'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')

export async function api(path, options = {}) {
  let token = null

  try {
    const { data } = await supabase.auth.getSession()
    token = data?.session?.access_token
  } catch (err) {
    console.warn('Could not retrieve Supabase session:', err)
  }

  // Fallback to demo mode token if user is browsing in demo mode
  if (!token) {
    token = localStorage.getItem('paisapilot_demo_token') || 'demo-token'
  }

  const isFormData = options.body instanceof FormData

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    let errorDetail = 'Request failed'
    try {
      const errJson = await res.json()
      errorDetail = errJson.detail || errJson.message || errorDetail
    } catch {
      // keep fallback
    }
    throw new Error(errorDetail)
  }

  return res.json()
}

