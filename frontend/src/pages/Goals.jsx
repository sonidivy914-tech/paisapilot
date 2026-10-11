import React, { useEffect, useState } from 'react'
import { 
  Target, 
  Plus, 
  Trash2, 
  Coins, 
  Calendar, 
  CheckCircle,
  TrendingUp,
  Clock
} from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, formatDate } from '../lib/formatters'
import StatCard from '../components/StatCard'

export default function Goals() {
  const [data, setData] = useState({ goals: [], total_target: 0, total_saved: 0, overall_progress: 0 })
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showContributeModal, setShowContributeModal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [contributeAmount, setContributeAmount] = useState('')

  // New Goal Form
  const [titleInput, setTitleInput] = useState('')
  const [targetInput, setTargetInput] = useState('')
  const [savedInput, setSavedInput] = useState('')
  const [dateInput, setDateInput] = useState('')

  const fetchGoals = async () => {
    try {
      setLoading(true)
      const res = await api('/goals')
      setData(res)
    } catch (err) {
      console.error('Failed to load goals:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGoals()
  }, [])

  const handleCreateGoal = async (e) => {
    e.preventDefault()
    if (!titleInput || !targetInput) return
    try {
      await api('/goals', {
        method: 'POST',
        body: JSON.stringify({
          title: titleInput,
          target_amount: parseFloat(targetInput),
          saved_amount: parseFloat(savedInput || '0'),
          target_date: dateInput || null,
        }),
      })
      setShowAddModal(false)
      setTitleInput('')
      setTargetInput('')
      setSavedInput('')
      setDateInput('')
      fetchGoals()
    } catch (err) {
      alert(`Failed to create goal: ${err.message}`)
    }
  }

  const handleContribute = async (e) => {
    e.preventDefault()
    if (!selectedGoal || !contributeAmount) return
    const addAmt = parseFloat(contributeAmount)
    const newTotal = (selectedGoal.saved_amount || 0) + addAmt
    try {
      await api(`/goals/${selectedGoal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ saved_amount: newTotal }),
      })
      setShowContributeModal(false)
      setContributeAmount('')
      setSelectedGoal(null)
      fetchGoals()
    } catch (err) {
      alert(`Failed to update savings: ${err.message}`)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this savings goal?')) return
    try {
      await api(`/goals/${id}`, { method: 'DELETE' })
      fetchGoals()
    } catch (err) {
      alert(`Failed to delete goal: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Savings Goals
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track milestone targets with dynamically computed monthly contribution requirements.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Savings Goal</span>
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Target Amount"
          amount={formatINR(data.total_target)}
          subtitle="Cumulative milestone targets"
          icon={Target}
          color="blue"
        />
        <StatCard
          title="Total Accumulated"
          amount={formatINR(data.total_saved)}
          subtitle={`${data.overall_progress}% towards complete target`}
          icon={Coins}
          color="emerald"
        />
        <StatCard
          title="Remaining to Save"
          amount={formatINR(data.total_remaining)}
          subtitle={`${data.goals.length} active savings goals`}
          icon={TrendingUp}
          color="amber"
        />
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {data.goals.map((goal) => {
          const isDone = goal.is_completed
          return (
            <div
              key={goal.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm transition-all ${
                isDone
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>{goal.title}</span>
                    {isDone && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Completed</span>
                      </span>
                    )}
                  </h3>
                  {goal.target_date && (
                    <p className="text-xs text-slate-400 flex items-center space-x-1 mt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Target Date: {formatDate(goal.target_date)}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(goal.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Progress & Numbers */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {formatINR(goal.saved_amount)} saved
                  </span>
                  <span className="text-slate-500">
                    of {formatINR(goal.target_amount)} ({goal.percent_complete}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      isDone ? 'bg-emerald-500' : 'bg-gradient-to-r from-teal-500 to-emerald-500'
                    }`}
                    style={{ width: `${goal.percent_complete}%` }}
                  />
                </div>
              </div>

              {/* Requirement Metrics */}
              {!isDone && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <p className="text-slate-400 text-[11px] flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Months Left</span>
                    </p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {goal.months_left} month(s)
                    </p>
                  </div>
                  <div className="p-2.5 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl">
                    <p className="text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                      Required Monthly
                    </p>
                    <p className="font-extrabold text-emerald-800 dark:text-emerald-200 mt-0.5">
                      {formatINR(goal.required_monthly_saving)}/mo
                    </p>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="mt-4 pt-2">
                <button
                  onClick={() => {
                    setSelectedGoal(goal)
                    setShowContributeModal(true)
                  }}
                  className="w-full py-2 px-3 rounded-xl border border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Deposit / Add to Savings</span>
                </button>
              </div>
            </div>
          )
        })}

        {data.goals.length === 0 && !loading && (
          <div className="col-span-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <Target className="w-10 h-10 mx-auto mb-2 opacity-40 text-emerald-500" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No savings goals created yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              Set targets for an Emergency Fund, Vehicle, Vacation, or New Gadget!
            </p>
          </div>
        )}
      </div>

      {/* Create Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Create Savings Goal
            </h3>
            <form onSubmit={handleCreateGoal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Fund, New Car"
                  required
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Target Amount (₹)
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  placeholder="e.g. 100000"
                  required
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Already Saved (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g. 20000"
                  value={savedInput}
                  onChange={(e) => setSavedInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
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
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Amount Modal */}
      {showContributeModal && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Add Savings to "{selectedGoal.title}"
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Currently saved: {formatINR(selectedGoal.saved_amount)}
            </p>
            <form onSubmit={handleContribute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Contribution Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="50"
                  placeholder="e.g. 5000"
                  required
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContributeModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Record Contribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

