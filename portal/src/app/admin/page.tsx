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
    redirect('/sign-in')
  }

  // Check if user is admin
  const email = user.emailAddresses[0]?.emailAddress
  if (!isAdmin(email)) {
    redirect('/')
  }

  // Fetch admin data
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
}
