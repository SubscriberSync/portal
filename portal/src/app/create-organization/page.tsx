'use client'

import { CreateOrganization } from '@clerk/nextjs'

export default function CreateOrganizationPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
      <CreateOrganization
        afterCreateOrganizationUrl="/portal/:slug"
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-2xl',
            headerTitle: 'text-[var(--foreground)]',
            headerSubtitle: 'text-[var(--foreground-secondary)]',
            formFieldLabel: 'text-[var(--foreground-secondary)]',
            formFieldInput: 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--foreground)]',
            formButtonPrimary: 'bg-[var(--accent)] hover:opacity-90 text-[#0c0c0c]',
          },
        }}
      />
    </div>
  )
}
