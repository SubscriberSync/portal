import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error verifying webhook', {
      status: 400,
    })
  }

  const supabase = createServiceClient()

  // Handle the webhook event
  const eventType = evt.type

  try {
    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data
        const primaryEmail = email_addresses?.find(e => e.id === evt.data.primary_email_address_id)

        await supabase
          .from('users')
          .upsert({
            id,
            email: primaryEmail?.email_address || '',
            first_name: first_name || null,
            last_name: last_name || null,
            avatar_url: image_url || null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' })

        break
      }

      case 'user.deleted': {
        const { id } = evt.data
        if (id) {
          await supabase.from('users').delete().eq('id', id)
        }
        break
      }

      case 'organization.created':
      case 'organization.updated': {
        const { id, name, slug, image_url } = evt.data

        await supabase
          .from('organizations')
          .upsert({
            id,
            name,
            slug: slug || id,
            logo_url: image_url || null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' })

        break
      }

      case 'organization.deleted': {
        const { id } = evt.data
        if (id) {
          await supabase.from('organizations').delete().eq('id', id)
        }
        break
      }

      case 'organizationMembership.created': {
        const { organization, public_user_data, role } = evt.data

        await supabase
          .from('organization_memberships')
          .upsert({
            organization_id: organization.id,
            user_id: public_user_data.user_id,
            role: role === 'org:admin' ? 'admin' : 'member',
          }, { onConflict: 'organization_id,user_id' })

        break
      }

      case 'organizationMembership.updated': {
        const { organization, public_user_data, role } = evt.data

        await supabase
          .from('organization_memberships')
          .update({ role: role === 'org:admin' ? 'admin' : 'member' })
          .eq('organization_id', organization.id)
          .eq('user_id', public_user_data.user_id)

        break
      }

      case 'organizationMembership.deleted': {
        const { organization, public_user_data } = evt.data

        await supabase
          .from('organization_memberships')
          .delete()
          .eq('organization_id', organization.id)
          .eq('user_id', public_user_data.user_id)

        break
      }

      default:
        console.log(`Unhandled webhook event type: ${eventType}`)
    }

    return new Response('Webhook processed', { status: 200 })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response('Error processing webhook', { status: 500 })
  }
}
