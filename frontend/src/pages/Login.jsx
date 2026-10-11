import React, { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react'

export default function Login({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (isSignUp) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpErr) throw signUpErr
        if (data?.session) {
          onAuthSuccess(data.user)
        } else {
          setMessage('Account created! Please check your email for confirmation link or sign in.')
          setIsSignUp(false)
        }
      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInErr) throw signInErr
        if (data?.session) {
          onAuthSuccess(data.user)
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleGuestDemo = () => {
    // Generate guest token and trigger login
    localStorage.setItem('paisapilot_demo_token', 'demo-token')
    onAuthSuccess({ email: 'demo.user@paisapilot.local', id: 'demo-user-id' })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-3xl mb-3 shadow-inner">
          💰
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          PaisaPilot
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          AI Expense Intelligence for Indian Bank & UPI Statements
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl sm:px-10">
          {!isSupabaseConfigured() && (
            <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              <p className="font-semibold mb-1">⚡ Quick Start Notice:</p>
              Supabase credentials not yet configured in <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">.env</code>. You can click <b>"Explore Demo Mode"</b> below to test all features instantly!
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 block w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 block w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs rounded-xl">
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
                setMessage(null)
              }}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleGuestDemo}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Explore Demo Mode (1-Click)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feature badges */}
        <div className="mt-8 grid grid-cols-3 gap-2 text-center text-xs text-slate-500 dark:text-slate-400">
          <div className="p-2">
            <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
            <span>Bank Grade Security</span>
          </div>
          <div className="p-2">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
            <span>Deterministic Math</span>
          </div>
          <div className="p-2">
            <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
            <span>Zero Hallucinations</span>
          </div>
        </div>
      </div>
    </div>
  )
}

