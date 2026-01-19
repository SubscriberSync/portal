import { SignIn } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c0c0c]">
      <SignIn />
    </div>
  )
}
