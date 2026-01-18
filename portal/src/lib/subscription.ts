import { Organization } from './supabase/data'

export interface AccessCheckResult {
  allowed: boolean
  reason?: 'no_subscription' | 'payment_failed' | 'canceled' | 'locked_out'
  canManageBilling?: boolean
  showWarning?: boolean
  warningMessage?: string
}

/**
 * Check if an organization has access to their portal based on subscription status
 */
export function checkPortalAccess(org: Organization): AccessCheckResult {
  // Test portals always have access (admin-created without payment)
  if (org.is_test_portal) {
    return { allowed: true }
  }

  // No subscription at all - need to subscribe
  if (!org.subscription_status || org.subscription_status === 'none') {
    return {
      allowed: false,
      reason: 'no_subscription',
      canManageBilling: false,
    }
  }

  // Locked out after 3 failed payments
  if (org.failed_payment_count && org.failed_payment_count >= 3) {
    return {
      allowed: false,
      reason: 'locked_out',
      canManageBilling: true,
    }
  }

  // Subscription canceled or unpaid
  if (org.subscription_status === 'canceled' || org.subscription_status === 'unpaid') {
    return {
      allowed: false,
      reason: 'canceled',
      canManageBilling: true,
    }
  }

  // Past due - allow access with warning (grace period)
  if (org.subscription_status === 'past_due') {
    return {
      allowed: true,
      showWarning: true,
      warningMessage: 'Your payment is past due. Please update your payment method to avoid service interruption.',
      canManageBilling: true,
    }
  }

  // Active or trialing - full access
  if (org.subscription_status === 'active' || org.subscription_status === 'trialing') {
    return { allowed: true }
  }

  // Unknown status - allow access but log
  console.warn(`Unknown subscription status: ${org.subscription_status}`)
  return { allowed: true }
}

/**
 * Get user-friendly messages for blocked access reasons
 */
export function getBlockedMessage(reason: AccessCheckResult['reason']): {
  title: string
  description: string
  actionText: string
} {
  switch (reason) {
    case 'no_subscription':
      return {
        title: 'Subscription Required',
        description: 'Please subscribe to access your portal.',
        actionText: 'Subscribe Now',
      }
    case 'payment_failed':
      return {
        title: 'Payment Issue',
        description: "We couldn't process your payment. Please update your payment method.",
        actionText: 'Update Payment',
      }
    case 'locked_out':
      return {
        title: 'Account Suspended',
        description: 'Your account has been suspended due to multiple failed payments. Please update your payment method to restore access.',
        actionText: 'Manage Billing',
      }
    case 'canceled':
      return {
        title: 'Subscription Canceled',
        description: 'Your subscription has been canceled. Resubscribe to regain access.',
        actionText: 'Resubscribe',
      }
    default:
      return {
        title: 'Access Denied',
        description: 'Please contact support for assistance.',
        actionText: 'Contact Support',
      }
  }
}
