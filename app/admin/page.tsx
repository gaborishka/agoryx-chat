'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminPanel from '@/components/AdminPanel'
import { User } from '@/types'
import { MOCK_USER } from '@/constants'

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('agoryx_user')
    const parsedUser = saved ? { ...MOCK_USER, ...JSON.parse(saved) } : MOCK_USER

    // Redirect non-admin users
    if (parsedUser.role !== 'admin') {
      router.push('/')
      return
    }

    setUser(parsedUser)
  }, [router])

  const handleClose = () => {
    router.push('/')
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    )
  }

  return (
    <AdminPanel
      currentUser={user}
      onClose={handleClose}
    />
  )
}
