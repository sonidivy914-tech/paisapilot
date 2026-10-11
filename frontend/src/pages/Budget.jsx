import React, { useEffect, useState } from 'react'
import { 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Sliders, 
  Trash2, 
  Edit3, 
  TrendingUp,
  Percent
} from 'lucide-react'
import { api } from '../lib/api'
import { formatINR } from '../lib/formatters'

const CATEGORIES = [
  'Groceries',
  'Transport',
  'Subscription',
  'Food & Dining',
  'Shopping',
  'Bills & Utilities',
  'Health',
  'Entertainment',
  'Education',
  'Travel',
  'Uncategorized',
]

export default function Budget() {
  const [statusData, setStatusData] = useState(null)
  const [projection, setProjection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [categoryInput, setCategoryInput] = useState(CATEGORIES[0])
  const [limitInput, setLimitInput] = useState('')
  const [simulatorMultiplier, setSimulatorMultiplier] = useState(1.0)

  const fetchBudgetStatus = async () => {
    try {
      setLoading(true)
      const [bRes, pRes] = await Promise.all([
        api('/budgets/status'),
        api('/insights/projection'),
      ])
      setStatusData(bRes)
      setProjection(pRes)
    } catch (err) {
      console.error('Failed to load budget status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBudgetStatus()
  }, [])

  const handleSaveBudget = async (e) => {
    e.preventDefault()
    if (!limitInput || Number(limitInput) < 0) return
    try {
      await api('/budgets', {
        method: 'POST',
        body: JSON.stringify({
          category: categoryInput,
          monthly_limit: parseFloat(limitInput),
        }),
      })
      setShowAddModal(false)
      setLimitInput('')
      fetchBudgetStatus()
    } catch (err) {
      alert(`Failed to save budget: ${err.message}`)
    }
  }

  // Simulated projected spending
  const baseSpent = projection?.spent_so_far || 0
  const daysElapsed = projection?.days_elapsed || 1
  const daysInMonth = projection?.days_in_month || 30
  const simulatedDailySpend = (baseSpent / daysElapsed) * simulatorMultiplier
  const simulatedProjectedTotal = simulatedDailySpend * daysInMonth
  const totalBudget = statusData?.total_budget || 0
  const simulatedExceeds = totalBudget > 0 && simulatedProjectedTotal > totalBudget

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Budgets & Forecasting
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Set category thresholds and simulate month-end spending based on linear projections.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Set Category Budget</span>
        </button>
      </div>

      {/* Warning Banner */}
      {statusData && statusData.warnings_count > 0 && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center space-x-3 text-rose-800 dark:text-rose-200">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold">Budget Alert: </span>
            {statusData.warnings_count} category limit(s) reached or exceeded (80%+ warning or 100%+ overrun).
          </div>
        </div>
      )}

      {/* Budget Simulator Slider Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              Month-End Budget Simulator
            </h2>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
            simple linear projection
          </span>
        </div>
        <p className="text-xs text-slate-300 mb-6">
          Adjust the daily spending pace multiplier to model what your month-end spend would be under different spending habits.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-300">
            <span>Conservative (0.8x)</span>
            <span className="font-bold text-emerald-400 text-sm">
              Current Multiplier: {simulatorMultiplier.toFixed(2)}x Pace
            </span>
            <span>Accelerated (1.5x)</span>
          </div>

          <input
            type="range"
            min="0.5"
            max="1.8"
            step="0.05"
            value={simulatorMultiplier}
            onChange={(e) => setSimulatorMultiplier(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-700 rounded-lg appearance-none"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-700/60 text-xs">
            <div>
              <p className="text-slate-400">Month-to-Date Spend ({daysElapsed} of {daysInMonth} days)</p>
              <p className="text-lg font-bold text-white mt-0.5">{formatINR(baseSpent)}</p>
            </div>
            <div>
              <p className="text-slate-400">Simulated Month-End Spend</p>
              <p className={`text-lg font-bold mt-0.5 ${simulatedExceeds ? 'text-amber-400' : 'text-emerald-400'}`}>
                {formatINR(simulatedProjectedTotal)}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Overall Budget Comparison</p>
              <p className="text-lg font-bold text-white mt-0.5">
                {totalBudget > 0 ? (
                  simulatedExceeds ? (
                    <span className="text-rose-400 font-extrabold">
                      Over by {formatINR(simulatedProjectedTotal - totalBudget)}
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-extrabold">
                      Under by {formatINR(totalBudget - simulatedProjectedTotal)}
                    </span>
                  )
                ) : (
                  'No total budget set'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Budgets Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Monthly Category Budgets
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Status updates automatically based on debits in each category: &lt;80% OK (green), 80-100% Warning (amber), &gt;100% Over (rose).
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {statusData?.categories?.map((cat) => {
            const statusColors = {
              ok: {
                badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
                bar: 'bg-emerald-500',
              },
              warning: {
                badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
                bar: 'bg-amber-500',
              },
              over: {
                badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
                bar: 'bg-rose-500',
              },
            }
            const colors = statusColors[cat.status] || statusColors.ok
            const percentWidth = Math.min(100, cat.percent_used)

            return (
              <div key={cat.category} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {cat.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wider ${colors.badge}`}>
                      {cat.status === 'ok' ? 'OK (<80%)' : cat.status === 'warning' ? 'Warning (80-100%)' : 'Over Budget (>100%)'}
                    </span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {formatINR(cat.spent)}
                    </span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-slate-500">
                      {cat.monthly_limit > 0 ? formatINR(cat.monthly_limit) : 'No limit set'}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${colors.bar}`}
                    style={{ width: `${percentWidth}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{cat.percent_used}% utilized</span>
                  <span>
                    {cat.status === 'over'
                      ? `Over budget by ${formatINR(cat.over_amount)}`
                      : cat.monthly_limit > 0
                      ? `${formatINR(cat.remaining)} remaining`
                      : ''}
                  </span>
                </div>
              </div>
            )
          })}

          {(!statusData?.categories || statusData.categories.length === 0) && (
            <div className="text-center py-8 text-slate-400 text-xs">
              No categories or spending found. Upload statement transactions or set a budget limit above.
            </div>
          )}
        </div>
      </div>

      {/* Modal to Set/Edit Budget */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Set Category Monthly Limit
            </h3>
            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Monthly Limit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g. 5000"
                  required
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Save Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

