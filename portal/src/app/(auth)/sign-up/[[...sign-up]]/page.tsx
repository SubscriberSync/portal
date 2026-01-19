'use client'

import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c0c0c]">
      <SignUp fallbackRedirectUrl="/admin" />
    </div>
  )
}
