'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Dashboard from '@/components/Dashboard'
import { User } from '@/types'
import { Loader2 } from 'lucide-react'
import { useCredits } from '@/lib/hooks'

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { data: creditsInfo, isLoading: isLoadingCredits } = useCredits()

  const handleUpdateUser = () => {
    // User updates are now handled via API - this is a no-op for now
    // TODO: Implement user profile update via /api/user PATCH
  }

  const handleClose = () => {
    router.push('/')
  }

  // Auth loading
  if (status === 'loading' || isLoadingCredits) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    )
  }

  // Not authenticated
  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  // Build user object from session + credits
  const user: User = {
    id: session?.user?.id || '',
    full_name: session?.user?.name || 'User',
    email: session?.user?.email || '',
    avatar_url: session?.user?.image || '',
    credits_remaining: creditsInfo?.credits_remaining || 0,
    subscription_tier: creditsInfo?.subscription_tier || 'free',
    subscription_status: creditsInfo?.subscription_status || 'active',
    current_period_end: creditsInfo?.current_period_end || '',
    cancel_at_period_end: creditsInfo?.cancel_at_period_end || false,
    role: ((session?.user as { role?: string })?.role || 'user') as 'user' | 'admin',
    joined_at: new Date().toISOString(),
  }

  return (
    <Dashboard
      user={user}
      onClose={handleClose}
      onUpdateUser={handleUpdateUser}
    />
  )
}
