import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/admin'
import { updateIntakeSubmissionStatus } from '@/lib/supabase/data'

export async function POST(request: NextRequest) {
  const user = await currentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = user.emailAddresses[0]?.emailAddress
  if (!isAdmin(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id, status, rejectionNote } = await request.json()

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }

    if (!['Approved', 'Rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const success = await updateIntakeSubmissionStatus(id, status, rejectionNote)

    if (!success) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reviewing intake:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
