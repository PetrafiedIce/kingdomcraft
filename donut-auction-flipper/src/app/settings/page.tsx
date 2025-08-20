'use client'

import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('donut_api_key')
    if (stored) setApiKey(stored)
  }, [])

  function save() {
    localStorage.setItem('donut_api_key', apiKey.trim())
    alert('Saved!')
  }

  return (
    <main className="space-y-6">
      <section className="card">
        <h2 className="text-xl font-semibold mb-4">Settings</h2>
        <div className="space-y-4">
          <label className="block">
            <span className="block text-sm text-muted mb-2">DonutSMP API Key</span>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your API key"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-primary-600"
            />
          </label>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </section>
    </main>
  )
}

