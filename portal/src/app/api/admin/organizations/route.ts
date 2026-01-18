import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/admin'
import { createOrganization, deleteOrganization, getAllOrganizations } from '@/lib/supabase/data'

export async function GET() {
  const user = await currentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = user.emailAddresses[0]?.emailAddress
  if (!isAdmin(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const organizations = await getAllOrganizations()
    return NextResponse.json({ organizations })
  } catch (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const { name, slug, status } = await request.json()

    if (!name || !slug) {
      return NextResponse.json({ error: 'Missing name or slug' }, { status: 400 })
    }

    const organization = await createOrganization({ name, slug, status })

    if (!organization) {
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    return NextResponse.json({ organization })
  } catch (error) {
    console.error('Error creating organization:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const user = await currentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = user.emailAddresses[0]?.emailAddress
  if (!isAdmin(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const success = await deleteOrganization(id)

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting organization:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
