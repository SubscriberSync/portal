import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HomePage() {
  const { userId, orgSlug } = await auth()

  // Not signed in - show landing page (marketing route group handles this)
  // The (marketing)/page.tsx will be served for unauthenticated users
  // But if they somehow land here, redirect to the marketing page
  if (!userId) {
    redirect('/')
  }

  // Has an active organization - redirect to their portal
  if (orgSlug) {
    redirect(`/portal/${orgSlug}`)
  }

  // Signed in but no organization selected - show org selection
  const user = await currentUser()

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-2xl border border-[var(--glass-border)] p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-[#0c0c0c]">B</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
              Welcome to Backstage
            </h1>
            <p className="text-[var(--foreground-secondary)]">
              Hi {user?.firstName || 'there'}! Select or create an organization to get started.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/create-organization"
              className="block w-full py-3 px-4 bg-[var(--accent)] text-[#0c0c0c] font-semibold rounded-xl text-center hover:opacity-90 transition-opacity"
            >
              Create Organization
            </Link>

            <p className="text-center text-sm text-[var(--foreground-tertiary)]">
              Or ask your admin to invite you to an existing organization.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
