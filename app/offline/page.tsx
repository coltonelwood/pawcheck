export const metadata = {
  title: 'Offline — PawCheck',
}

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.788m13.788 0c3.808 3.808 3.808 9.98 0 13.788M12 12h.008v.008H12V12z" />
          </svg>
        </div>
        <h1 className="font-display text-3xl font-bold text-ink mb-2">
          You're offline
        </h1>
        <p className="text-ink-mute mb-6">
          PawCheck needs an internet connection to analyze photos. Once you're back online, try again.
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-forest-600 text-cream-100 rounded-lg font-medium hover:bg-forest-700 transition-colors"
        >
          Retry
        </a>
      </div>
    </div>
  )
}
