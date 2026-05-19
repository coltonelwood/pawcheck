'use client'

import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAManager() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('SW registration failed:', err)
      })
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setInstallPrompt(promptEvent)

      // Only show banner if user has been here a bit and hasn't dismissed before
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      if (!dismissed && !isStandalone) {
        setTimeout(() => setShowBanner(true), 30000) // Show after 30s
      }
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    setInstallPrompt(null)
  }

  function dismiss() {
    setShowBanner(false)
    localStorage.setItem('pwa-install-dismissed', String(Date.now()))
  }

  if (!showBanner || !installPrompt) return null

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-80 z-50 animate-fade-up">
      <div className="bg-forest-700 text-cream-100 rounded-2xl shadow-2xl p-4 border border-amber-400/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-forest-800" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-base font-semibold mb-1">
              Install PawCheck
            </div>
            <p className="text-sm text-cream-100/80 mb-3">
              Quick access from your home screen. Works offline.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 bg-amber-400 text-ink text-sm font-medium rounded-lg hover:bg-amber-500 transition-colors"
              >
                Install
              </button>
              <button
                onClick={dismiss}
                className="px-3 py-1.5 text-cream-100/70 text-sm hover:text-cream-100 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-cream-100/50 hover:text-cream-100 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
