"use client"
import { useState } from 'react'

export default function RefreshButton() {
  const [loading, setLoading] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null)
  return (
    <button
      className="rounded bg-neutral-200 text-neutral-900 px-3 py-1 text-sm disabled:opacity-50"
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        try {
          const res = await fetch('/api/jobs/refresh', { method: 'POST' })
          const data = await res.json().catch(() => null)
          setLastRefreshed(new Date().toLocaleTimeString())
          if (data?.computed) {
            window.location.reload()
          }
        } finally {
          setLoading(false)
        }
      }}
    >
      {loading ? 'Refreshing…' : lastRefreshed ? `Refreshed ${lastRefreshed}` : 'Refresh'}
    </button>
  )
}

