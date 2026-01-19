import { auth, currentUser } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

export default async function TestAuthPage() {
  const { userId, orgId, orgSlug } = await auth()
  const user = await currentUser()

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Auth Test Page</h1>

      <div className="bg-[#1a1a1a] rounded-lg p-6 max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Server-Side Auth State</h2>

        <div className="space-y-3 font-mono text-sm">
          <div className="flex">
            <span className="text-[#a1a1aa] w-32">userId:</span>
            <span className={userId ? 'text-green-400' : 'text-red-400'}>
              {userId || 'null (NOT AUTHENTICATED)'}
            </span>
          </div>

          <div className="flex">
            <span className="text-[#a1a1aa] w-32">orgId:</span>
            <span>{orgId || 'null'}</span>
          </div>

          <div className="flex">
            <span className="text-[#a1a1aa] w-32">orgSlug:</span>
            <span>{orgSlug || 'null'}</span>
          </div>

          <div className="flex">
            <span className="text-[#a1a1aa] w-32">email:</span>
            <span>{user?.emailAddresses[0]?.emailAddress || 'null'}</span>
          </div>

          <div className="flex">
            <span className="text-[#a1a1aa] w-32">firstName:</span>
            <span>{user?.firstName || 'null'}</span>
          </div>
        </div>

        {userId ? (
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400">✓ Server-side authentication is working!</p>
          </div>
        ) : (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400">✗ Server-side authentication failed - no userId detected</p>
            <p className="text-sm text-[#a1a1aa] mt-2">
              This means the session cookie is not being sent to or read by the server.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 text-sm text-[#666]">
        <p>This page uses `force-dynamic` and checks auth server-side.</p>
        <p>If you see "NOT AUTHENTICATED" but you're signed in client-side, there's a cookie domain issue.</p>
      </div>
    </div>
  )
}
