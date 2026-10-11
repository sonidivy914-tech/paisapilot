import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Receipt, 
  PieChart, 
  Sparkles, 
  CalendarClock, 
  Target, 
  LogOut, 
  Moon, 
  Sun, 
  Menu, 
  X,
  Database
} from 'lucide-react'
import { api } from '../lib/api'

export default function Navbar({ user, isDarkMode, setIsDarkMode, onLogout, onRefreshData }) {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Transactions', path: '/transactions', icon: Receipt },
    { name: 'Budgets', path: '/budgets', icon: PieChart },
    { name: 'Insights', path: '/insights', icon: Sparkles },
    { name: 'Subscriptions', path: '/subscriptions', icon: CalendarClock },
    { name: 'Goals', path: '/goals', icon: Target },
  ]

  const handleSeedDemo = async () => {
    try {
      setSeeding(true)
      await api('/transactions/seed-demo', { method: 'POST' })
      if (onRefreshData) onRefreshData()
      alert('Sample synthetic transactions, budgets & goals loaded successfully!')
    } catch (err) {
      alert(`Error loading demo data: ${err.message}`)
    } finally {
      setSeeding(false)
    }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all your transactions, budgets, subscriptions, and goals?')) {
      return
    }
    try {
      await api('/transactions', { method: 'DELETE' })
      if (onRefreshData) onRefreshData()
      alert('All your personal data has been deleted.')
    } catch (err) {
      alert(`Failed to delete data: ${err.message}`)
    }
  }

  return (
    <nav className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">💰</span>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                PaisaPilot
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Right actions: Theme toggle, Seed demo, User, Logout */}
          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={handleSeedDemo}
              disabled={seeding}
              title="Load sample synthetic data"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 transition-colors"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{seeding ? 'Loading...' : 'Demo Data'}</span>
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[140px]" title={user?.email}>
                {user?.email || 'Guest User'}
              </span>
              <button
                onClick={onLogout}
                className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            )
          })}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col space-y-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                handleSeedDemo()
              }}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-sm font-medium"
            >
              <Database className="w-4 h-4" />
              <span>Load Synthetic Demo Data</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                handleDeleteAll()
              }}
              className="w-full text-center py-2 text-xs text-rose-500 hover:text-rose-700"
            >
              Delete All My Data
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out ({user?.email || 'Guest'})</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}

