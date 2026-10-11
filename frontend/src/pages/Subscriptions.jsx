import React, { useEffect, useState } from 'react'
import { 
  CalendarClock, 
  Sparkles, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, formatDate } from '../lib/formatters'
import StatCard from '../components/StatCard'

export default function Subscriptions() {
  const [data, setData] = useState({ subscriptions: [], monthly_total: 0, annual_total: 0, active_count: 0 })
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [freqInput, setFreqInput] = useState('monthly')

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const res = await api('/subscriptions')
      setData(res)
    } catch (err) {
      console.error('Failed to load subscriptions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const handleDetect = async () => {
    try {
      setDetecting(true)
      const res = await api('/subscriptions/detect', { method: 'POST' })
      alert(res.message || 'Detection complete!')
      fetchSubscriptions()
    } catch (err) {
      alert(`Detection failed: ${err.message}`)
    } finally {
      setDetecting(false)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!nameInput || !amountInput) return
    try {
      await api('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          name: nameInput,
          amount: parseFloat(amountInput),
          frequency: freqInput,
        }),
      })
      setShowAddModal(false)
      setNameInput('')
      setAmountInput('')
      fetchSubscriptions()
    } catch (err) {
      alert(`Failed to add: ${err.message}`)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subscription?')) return
    try {
      await api(`/subscriptions/${id}`, { method: 'DELETE' })
      fetchSubscriptions()
    } catch (err) {
      alert(`Failed to delete: ${err.message}`)
    }
  }

  const handleToggle = async (id, currentStatus) => {
    try {
      await api(`/subscriptions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentStatus }),
      })
      fetchSubscriptions()
    } catch (err) {
      alert(`Failed to toggle: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Subscriptions & Recurring Bills
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Detect recurring charges (Netflix, Spotify, broadband, recharges) with interval & amount variance detection.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDetect}
            disabled={detecting}
            className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${detecting ? 'animate-spin' : ''}`} />
            <span>{detecting ? 'Scanning Debits...' : 'Scan & Auto-Detect'}</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Subscription</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Monthly Recurring"
          amount={formatINR(data.monthly_total)}
          subtitle="Estimated monthly charge"
          icon={CalendarClock}
          color="emerald"
        />
        <StatCard
          title="Annual Commitment"
          amount={formatINR(data.annual_total)}
          subtitle="Computed as monthly × 12"
          icon={Sparkles}
          color="blue"
        />
        <StatCard
          title="Active Subscriptions"
          amount={data.active_count.toString()}
          subtitle="Currently active recurring services"
          icon={CheckCircle}
          color="purple"
        />
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Tracked Recurring Subscriptions
          </h2>
          <span className="text-xs text-slate-400">
            {data.subscriptions.length} recurring item(s) detected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <th className="py-3 px-4">Service Name</th>
                <th className="py-3 px-4">Billing Frequency</th>
                <th className="py-3 px-4">Last Paid</th>
                <th className="py-3 px-4">Next Expected Due</th>
                <th className="py-3 px-4 text-right">Cost</th>
                <th className="py-3 px-4 text-right">Annual Cost</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.subscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {s.name}
                  </td>
                  <td className="py-3.5 px-4 capitalize text-slate-600 dark:text-slate-400">
                    {s.frequency || 'monthly'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                    {formatDate(s.last_paid) || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                    {formatDate(s.next_due) || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {formatINR(s.amount)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatINR(s.frequency === 'weekly' ? s.amount * 52 : s.amount * 12)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleToggle(s.id, s.is_active)}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        s.is_active
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {s.is_active ? 'Active' : 'Paused'}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {data.subscriptions.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold">No subscriptions recorded yet.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click "Scan & Auto-Detect" to uncover recurring payments from your statements.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Subscription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Add New Subscription
            </h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Subscription Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Netflix, Spotify, Gym"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 199"
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Frequency
                </label>
                <select
                  value={freqInput}
                  onChange={(e) => setFreqInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="annual">Annual</option>
                </select>
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
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

