import React, { useEffect, useState } from 'react'
import { 
  Sparkles, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Info,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, formatDate } from '../lib/formatters'

export default function Insights() {
  const [summary, setSummary] = useState(null)
  const [projection, setProjection] = useState(null)
  const [unusualData, setUnusualData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchInsights = async () => {
    try {
      setLoading(true)
      const [sRes, pRes, uRes] = await Promise.all([
        api('/insights/summary'),
        api('/insights/projection'),
        api('/insights/unusual'),
      ])
      setSummary(sRes)
      setProjection(pRes)
      setUnusualData(uRes)
    } catch (err) {
      console.error('Failed to load insights:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [])

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Calculated Expense Intelligence</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Financial Insights & Patterns
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Every figure, percentage, and alert is deterministically derived in code from your raw statement records.
        </p>
      </div>

      {/* Projection Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Month-End Linear Projection
              </h2>
              <span className="text-[11px] text-slate-400">Formula: spent_so_far / days_elapsed * days_in_month</span>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            simple linear projection
          </span>
        </div>

        {projection && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              <p className="text-xs text-slate-500">Days Elapsed</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {projection.days_elapsed} <span className="text-xs text-slate-400">/ {projection.days_in_month}</span>
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              <p className="text-xs text-slate-500">Spent So Far</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {formatINR(projection.spent_so_far)}
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              <p className="text-xs text-slate-500">Daily Average</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {formatINR(projection.daily_average)}/day
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              <p className="text-xs text-slate-500">Projected Month-End</p>
              <p className={`text-xl font-extrabold mt-1 ${projection.exceeds_budget ? 'text-rose-500' : 'text-emerald-500'}`}>
                {formatINR(projection.projected)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Unusual Spending Section (Anomaly Detection) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Unusual Spending Detection
              </h2>
              <p className="text-xs text-slate-400">
                Flagged when amount &gt; mean + 2.5×std or &gt; 3× median of category debits
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-full">
            {unusualData?.count || 0} flagged
          </span>
        </div>

        {/* Security Rule Disclaimer */}
        <div className="my-4 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
          <Info className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            <b>Notice:</b> Unusual spending alerts are suggestions based on your personal spending history, not fraud detection. These may be planned larger purchases.
          </span>
        </div>

        <div className="space-y-3">
          {unusualData?.unusual_transactions?.map((t) => (
            <div
              key={t.id}
              className="p-3.5 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>{t.description}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-200/70 text-amber-900 dark:bg-amber-900/60 dark:text-amber-300">
                    {t.category}
                  </span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(t.txn_date)}</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-amber-700 dark:text-amber-400">
                  {formatINR(t.amount)}
                </span>
              </div>
            </div>
          ))}

          {(!unusualData?.unusual_transactions || unusualData.unusual_transactions.length === 0) && (
            <p className="text-center py-6 text-xs text-slate-400 italic">
              No unusual spending detected. All transactions follow typical distributions.
            </p>
          )}
        </div>
      </div>

      {/* Month-over-Month Comparisons & Natural Sentences */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Month-over-Month Generated Trends
            </h2>
            <p className="text-xs text-slate-400">
              Comparing {summary?.current_month || 'current month'} vs {summary?.previous_month || 'last month'}
            </p>
          </div>
        </div>

        {/* Narrative Sentences */}
        <div className="mb-6 space-y-2.5">
          {summary?.insight_sentences?.map((sentence, idx) => (
            <div
              key={idx}
              className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center space-x-2"
            >
              <span className="text-emerald-500 font-bold">•</span>
              <span>{sentence}</span>
            </div>
          ))}
          {(!summary?.insight_sentences || summary.insight_sentences.length === 0) && (
            <p className="text-center py-4 text-xs text-slate-400 italic">
              Upload statements spanning across two or more months to generate comparative statements.
            </p>
          )}
        </div>

        {/* Category Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                <th className="pb-3">Category</th>
                <th className="pb-3 text-right">This Month</th>
                <th className="pb-3 text-right">Last Month</th>
                <th className="pb-3 text-right">Change</th>
                <th className="pb-3 text-right">% Shift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {summary?.category_comparisons?.map((c) => {
                const isIncrease = c.difference > 0
                return (
                  <tr key={c.category} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">{c.category}</td>
                    <td className="py-3 text-right font-medium">{formatINR(c.current_month)}</td>
                    <td className="py-3 text-right text-slate-500">{formatINR(c.previous_month)}</td>
                    <td className={`py-3 text-right font-bold ${isIncrease ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {isIncrease ? '+' : ''}{formatINR(c.difference)}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`inline-flex items-center text-xs font-bold ${isIncrease ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {isIncrease ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        <span>{Math.abs(c.percentage_change)}%</span>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

