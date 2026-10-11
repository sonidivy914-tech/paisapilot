import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budget from './pages/Budget'
import Insights from './pages/Insights'
import Subscriptions from './pages/Subscriptions'
import Goals from './pages/Goals'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('paisapilot_theme') === 'dark'
  })
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    // Check initial auth state
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (data?.session?.user) {
          setUser(data.session.user)
        } else {
          // Check if guest demo was active
          const demoToken = localStorage.getItem('paisapilot_demo_token')
          if (demoToken) {
            setUser({ email: 'demo.user@paisapilot.local', id: 'demo-user-id' })
          }
        }
      } catch (err) {
        console.warn('Auth check error:', err)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen to Supabase Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        const demoToken = localStorage.getItem('paisapilot_demo_token')
        if (demoToken) {
          setUser({ email: 'demo.user@paisapilot.local', id: 'demo-user-id' })
        } else {
          setUser(null)
        }
      }
    })

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  // Manage Dark Mode class on documentElement
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('paisapilot_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('paisapilot_theme', 'light')
    }
  }, [isDarkMode])

  const handleLogout = async () => {
    localStorage.removeItem('paisapilot_demo_token')
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <span className="text-4xl animate-bounce mb-3">💰</span>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading PaisaPilot...</p>
      </div>
    )
  }

  if (!user) {
    return <Login onAuthSuccess={(authenticatedUser) => setUser(authenticatedUser)} />
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
        <Navbar
          user={user}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          onLogout={handleLogout}
          onRefreshData={() => setRefreshKey((k) => k + 1)}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Routes key={refreshKey}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/budgets" element={<Budget />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
          <p>
            <b>PaisaPilot</b> — AI Expense Intelligence • Rule: Deterministic Math Only, Zero Hallucinations.
          </p>
        </footer>
      </div>
    </BrowserRouter>
  )
}

