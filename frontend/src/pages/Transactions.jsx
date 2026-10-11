import React, { useEffect, useState } from 'react'
import { 
  Search, 
  Filter, 
  Trash2, 
  Check, 
  X, 
  Edit2, 
  ChevronLeft, 
  ChevronRight,
  Upload,
  Receipt
} from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, formatDate } from '../lib/formatters'
import UploadBox from '../components/UploadBox'

const CATEGORIES = [
  'All',
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
  'Income',
  'Uncategorized',
]

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedType, setSelectedType] = useState('All')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [editCategoryVal, setEditCategoryVal] = useState('')
  const [showUpload, setShowUpload] = useState(false)

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
      })
      if (search.trim()) params.append('search', search.trim())
      if (selectedCategory && selectedCategory !== 'All') params.append('category', selectedCategory)
      if (selectedType && selectedType !== 'All') params.append('txn_type', selectedType)
      if (selectedMonth) params.append('month', selectedMonth)

      const data = await api(`/transactions?${params.toString()}`)
      setTransactions(data.transactions || [])
      setTotalPages(data.total_pages || 1)
      setTotalCount(data.total_count || 0)
    } catch (err) {
      console.error('Failed to load transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [page, selectedCategory, selectedType, selectedMonth])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    fetchTransactions()
  }

  const handleUpdateCategory = async (id) => {
    if (!editCategoryVal) {
      setEditingId(null)
      return
    }
    try {
      await api(`/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ category: editCategoryVal }),
      })
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, category: editCategoryVal } : t))
      )
      setEditingId(null)
    } catch (err) {
      alert(`Failed to update category: ${err.message}`)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return
    try {
      await api(`/transactions/${id}`, { method: 'DELETE' })
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      setTotalCount((c) => Math.max(0, c - 1))
    } catch (err) {
      alert(`Failed to delete transaction: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Transactions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse, search, and manage categorized statement records ({totalCount} total entries).
          </p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
        >
          <Upload className="w-4 h-4" />
          <span>{showUpload ? 'Hide Statement Upload' : 'Upload Bank Statement'}</span>
        </button>
      </div>

      {/* Collapsible Upload Box */}
      {showUpload && (
        <div className="animate-fadeIn">
          <UploadBox onUploadSuccess={() => { fetchTransactions(); setShowUpload(false); }} />
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search box */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </form>

          {/* Category filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  Category: {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Type filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">Type: All (Debit & Credit)</option>
              <option value="debit">Type: Debits (Outflows)</option>
              <option value="credit">Type: Credits (Inflows)</option>
            </select>
          </div>

          {/* Month selector */}
          <div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setPage(1); }}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {selectedMonth && (
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span>Filtered to {selectedMonth}</span>
            <button
              onClick={() => setSelectedMonth('')}
              className="text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Clear month filter
            </button>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.map((t) => {
                const isEditing = editingId === t.id
                return (
                  <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-medium">
                      {formatDate(t.txn_date)}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center space-x-2">
                        <span className="truncate max-w-[220px] sm:max-w-[320px]">{t.description}</span>
                        {t.is_unusual && (
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 shrink-0"
                            title="Statistical anomaly in this category (> mean + 2.5 std or 3x median)"
                          >
                            Unusual Spend
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {isEditing ? (
                        <div className="flex items-center space-x-1.5">
                          <select
                            value={editCategoryVal}
                            onChange={(e) => setEditCategoryVal(e.target.value)}
                            className="py-1 px-2 text-xs rounded-lg border border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          >
                            {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleUpdateCategory(t.id)}
                            className="p-1 text-emerald-600 hover:text-emerald-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(t.id)
                            setEditCategoryVal(t.category || 'Uncategorized')
                          }}
                          className="group inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 dark:bg-slate-800 dark:hover:bg-emerald-950/50 dark:text-slate-300 dark:hover:text-emerald-300 transition-colors"
                          title="Click to edit category"
                        >
                          <span>{t.category || 'Uncategorized'}</span>
                          <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </td>

                    <td className={`py-3.5 px-4 text-right font-extrabold whitespace-nowrap ${t.txn_type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {t.txn_type === 'credit' ? '+' : '-'}{formatINR(t.amount)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}

              {transactions.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold">No transactions match your current filters.</p>
                    <p className="text-xs text-slate-400 mt-1">Upload a statement or clear your search.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

