import { SignIn } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function SignInPage() {
  const { userId } = await auth()

  // If already signed in, redirect to home (which will handle org routing)
  if (userId) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c0c0c]">
      <SignIn afterSignInUrl="/" afterSignUpUrl="/" />
    </div>
  )
}
