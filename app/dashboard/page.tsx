'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Dashboard from '@/components/Dashboard'
import { User } from '@/types'
import { MOCK_USER } from '@/constants'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('agoryx_user')
    setUser(saved ? { ...MOCK_USER, ...JSON.parse(saved) } : MOCK_USER)
  }, [])

  const handleUpdateUser = (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev
      const updated = { ...prev, ...updates }
      localStorage.setItem('agoryx_user', JSON.stringify(updated))
      return updated
    })
  }

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
    <Dashboard
      user={user}
      onClose={handleClose}
      onUpdateUser={handleUpdateUser}
    />
  )
}
