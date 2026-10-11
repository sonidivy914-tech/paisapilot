import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  ArrowRight, 
  AlertTriangle, 
  Sparkles,
  Receipt
} from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, formatDate } from '../lib/formatters'
import StatCard from '../components/StatCard'
import UploadBox from '../components/UploadBox'
import CategoryPieChart from '../components/CategoryPieChart'
import MonthlyBarChart from '../components/MonthlyBarChart'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [projection, setProjection] = useState(null)
  const [budgetStatus, setBudgetStatus] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [txnsData, summaryData, projData, bData] = await Promise.allSettled([
        api('/transactions?limit=100'),
        api('/insights/summary'),
        api('/insights/projection'),
        api('/budgets/status'),
      ])

      if (txnsData.status === 'fulfilled') {
        setTransactions(txnsData.value.transactions || [])
      }
      if (summaryData.status === 'fulfilled') {
        setSummary(summaryData.value)
      }
      if (projData.status === 'fulfilled') {
        setProjection(projData.value)
      }
      if (bData.status === 'fulfilled') {
        setBudgetStatus(bData.value)
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Aggregate Category Chart Data
  const categoryChartData = React.useMemo(() => {
    const catMap = {}
    transactions
      .filter((t) => t.txn_type === 'debit')
      .forEach((t) => {
        const cat = t.category || 'Uncategorized'
        catMap[cat] = (catMap[cat] || 0) + Number(t.amount || 0)
      })
    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  // Aggregate Monthly Chart Data
  const monthlyChartData = React.useMemo(() => {
    const monthMap = {}
    transactions.forEach((t) => {
      const m = t.txn_date?.slice(0, 7) || 'Unknown'
      if (!monthMap[m]) monthMap[m] = { month: m, income: 0, expenses: 0 }
      if (t.txn_type === 'credit') {
        monthMap[m].income += Number(t.amount || 0)
      } else {
        monthMap[m].expenses += Number(t.amount || 0)
      }
    })
    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month))
  }, [transactions])

  const totalIncome = summary?.current_income ?? transactions.filter(t => t.txn_type === 'credit').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = summary?.current_expense ?? transactions.filter(t => t.txn_type === 'debit').reduce((s, t) => s + Number(t.amount), 0)
  const netSavings = totalIncome - totalExpenses

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Financial Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time calculations strictly derived from your statement records.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            to="/transactions"
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>All Transactions</span>
          </Link>
        </div>
      </div>

      {/* Warning banner if over budget */}
      {budgetStatus && budgetStatus.warnings_count > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Budget Warning: {budgetStatus.warnings_count} category limits reached or exceeded!
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                You have spent {budgetStatus.overall_percent}% of your allocated monthly budget.
              </p>
            </div>
          </div>
          <Link
            to="/budgets"
            className="text-xs font-bold text-amber-800 dark:text-amber-300 underline hover:no-underline shrink-0 ml-2"
          >
            Review Budgets →
          </Link>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Income"
          amount={formatINR(totalIncome)}
          subtitle="Monthly credit inflows"
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Total Expenses"
          amount={formatINR(totalExpenses)}
          subtitle="Monthly debits recorded"
          icon={TrendingDown}
          color="rose"
        />
        <StatCard
          title="Net Savings"
          amount={formatINR(netSavings)}
          subtitle={totalIncome > 0 ? `${((netSavings / totalIncome) * 100).toFixed(1)}% savings rate` : 'Balance'}
          icon={Wallet}
          color={netSavings >= 0 ? 'emerald' : 'rose'}
        />
        <StatCard
          title="Month-End Projected"
          amount={projection ? formatINR(projection.projected) : '₹0'}
          subtitle="Linear projection model"
          icon={Calendar}
          color={projection?.exceeds_budget ? 'amber' : 'blue'}
        />
      </div>

      {/* Upload and Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload box */}
        <div className="lg:col-span-1">
          <UploadBox onUploadSuccess={() => fetchData()} />
        </div>

        {/* Category Breakdown Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Spending by Category
            </h2>
            <span className="text-xs text-slate-400">Total {categoryChartData.length} Categories</span>
          </div>
          <CategoryPieChart data={categoryChartData} />
        </div>
      </div>

      {/* Monthly Inflow vs Outflow Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Monthly Trends: Income vs Expenses
            </h2>
            <p className="text-xs text-slate-400">Multi-month comparative volume</p>
          </div>
        </div>
        <MonthlyBarChart data={monthlyChartData} />
      </div>

      {/* Recent Transactions & Insights Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Recent Transactions
            </h2>
            <Link
              to="/transactions"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.slice(0, 7).map((t) => (
                  <tr key={t.id || Math.random()} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 text-slate-500 whitespace-nowrap">{formatDate(t.txn_date)}</td>
                    <td className="py-3 font-medium text-slate-800 dark:text-slate-200">
                      <div className="flex items-center space-x-1.5">
                        <span className="truncate max-w-[180px] sm:max-w-[260px]">{t.description}</span>
                        {t.is_unusual && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                            Unusual
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {t.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className={`py-3 text-right font-bold whitespace-nowrap ${t.txn_type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {t.txn_type === 'credit' ? '+' : '-'}{formatINR(t.amount)}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No transactions recorded. Upload a CSV statement or click "Demo Data".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insight Highlights */}
        <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-4 h-4" />
              <span>Smart Analysis</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Monthly Intelligence
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Deterministic calculations based on actual spending behavior:
            </p>

            <div className="space-y-3 text-xs text-slate-300">
              {summary?.insight_sentences?.slice(0, 3).map((sentence, idx) => (
                <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/10">
                  {sentence}
                </div>
              ))}
              {(!summary?.insight_sentences || summary.insight_sentences.length === 0) && (
                <p className="text-slate-400 text-xs italic">
                  Upload multiple months of statements to unlock comparative trend sentences.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <Link
              to="/insights"
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors"
            >
              <span>Explore All Insights</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

