import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-2xl',
            headerTitle: 'text-[var(--foreground)]',
            headerSubtitle: 'text-[var(--foreground-secondary)]',
            socialButtonsBlockButton: 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--foreground)] hover:bg-[var(--glass-bg-hover)]',
            formFieldLabel: 'text-[var(--foreground-secondary)]',
            formFieldInput: 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--foreground)]',
            footerActionLink: 'text-[var(--accent)] hover:text-[var(--accent)]',
            formButtonPrimary: 'bg-[var(--accent)] hover:opacity-90 text-[#0c0c0c]',
          },
        }}
      />
    </div>
  )
}
