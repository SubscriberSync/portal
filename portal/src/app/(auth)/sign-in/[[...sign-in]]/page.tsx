import { SignIn } from '@clerk/nextjs'

export default function SignInPage({
  searchParams,
}: {
  searchParams: { redirect_url?: string }
}) {
  const redirectUrl = searchParams.redirect_url || '/'

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c0c0c]">
      <SignIn
        forceRedirectUrl={redirectUrl}
        fallbackRedirectUrl={redirectUrl}
      />
    </div>
  )
}
