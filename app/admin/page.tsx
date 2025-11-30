'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import AdminPanel from '@/components/AdminPanel'
import { User } from '@/types'
import { Loader2 } from 'lucide-react'

export default function AdminPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const handleClose = () => {
    router.push('/')
  }

  // Auth loading
  if (status === 'loading') {
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

  // Check admin role
  const userRole = (session?.user as { role?: string })?.role
  if (userRole !== 'admin') {
    router.push('/')
    return null
  }

  // Build user object from session
  const user: User = {
    id: session?.user?.id || '',
    full_name: session?.user?.name || 'Admin',
    email: session?.user?.email || '',
    avatar_url: session?.user?.image || '',
    credits_remaining: 0,
    subscription_tier: 'pro',
    subscription_status: 'active',
    current_period_end: '',
    cancel_at_period_end: false,
    role: 'admin',
    joined_at: new Date().toISOString(),
  }

  return (
    <AdminPanel
      currentUser={user}
      onClose={handleClose}
    />
  )
}
