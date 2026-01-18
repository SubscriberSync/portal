import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import {
  getAllOrganizations,
  getAllIntakeSubmissions,
  getOrganizationStats,
} from '@/lib/supabase/data'
import AdminDashboard from '@/components/admin/AdminDashboard'

export default async function AdminPage() {
  const { userId } = await auth()
  const user = await currentUser()

  if (!userId || !user) {
    redirect('/sign-in?redirect_url=/admin')
  }

  // Check if user is admin
  const email = user.emailAddresses[0]?.emailAddress

  // Log for debugging
  console.log('[Admin] Checking access for email:', email)

  if (!isAdmin(email)) {
    console.log('[Admin] Access denied - not an admin email')
    redirect('/')
  }

  // Fetch admin data with error handling
  try {
    const [organizations, intakeSubmissions, stats] = await Promise.all([
      getAllOrganizations(),
      getAllIntakeSubmissions(),
      getOrganizationStats(),
    ])

    return (
      <AdminDashboard
        organizations={organizations}
        intakeSubmissions={intakeSubmissions}
        stats={stats}
        adminEmail={email}
      />
    )
  } catch (error) {
    console.error('[Admin] Error fetching data:', error)
    return (
      <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Error Loading Admin</h1>
          <p className="text-[#a1a1aa] mb-4">
            There was an error loading the admin dashboard. This might be a database connection issue.
          </p>
          <p className="text-sm text-[#666]">
            Logged in as: {email}
          </p>
        </div>
      </div>
    )
  }
}
