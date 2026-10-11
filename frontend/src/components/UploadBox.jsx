import React, { useState, useRef } from 'react'
import { UploadCloud, CheckCircle2, AlertCircle, FileText, Loader2 } from 'lucide-react'
import { api } from '../lib/api'

export default function UploadBox({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a valid .csv file.')
      return
    }

    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds the 5MB security limit.')
      return
    }

    try {
      setUploading(true)
      setError(null)
      setUploadResult(null)

      const formData = new FormData()
      formData.append('file', file)

      const data = await api('/transactions/upload', {
        method: 'POST',
        body: formData,
      })

      setUploadResult(data)
      if (onUploadSuccess) {
        onUploadSuccess(data)
      }
    } catch (err) {
      setError(err.message || 'Failed to upload CSV')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
            : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 bg-slate-50/50 dark:bg-slate-800/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          {uploading ? (
            <>
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Parsing and categorizing statement...
              </p>
              <p className="text-xs text-slate-400">Classifying expenses & checking anomalies</p>
            </>
          ) : (
            <>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Click to upload or drag & drop bank / UPI statement CSV
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supports HDFC, SBI, ICICI, Axis, PayTM, PhonePe & standard statements (max 5 MB)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center space-x-2 text-rose-700 dark:text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success summary */}
      {uploadResult && (
        <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2">
          <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{uploadResult.message}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 bg-white dark:bg-slate-900 rounded border border-emerald-200 dark:border-emerald-800/60 text-slate-700 dark:text-slate-300 font-medium">
              Imported: <b>{uploadResult.rows_imported}</b>
            </span>
            <span className="px-2 py-1 bg-white dark:bg-slate-900 rounded border border-emerald-200 dark:border-emerald-800/60 text-slate-700 dark:text-slate-300 font-medium">
              Skipped Duplicates: <b>{uploadResult.rows_skipped}</b>
            </span>
            {uploadResult.unusual_count > 0 && (
              <span className="px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded font-bold">
                ⚠️ {uploadResult.unusual_count} Unusual Transaction(s) Flagged
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

