export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 bg-copper rounded-xl flex items-center justify-center">
            <span className="text-2xl font-bold text-white">S</span>
          </div>
          <h1 className="text-3xl font-semibold text-light">SubscriberSync</h1>
        </div>
        <p className="text-muted">Client portals are accessed at /portal/[company-name]</p>
      </div>
    </main>
  )
}
