'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock } from 'lucide-react'

interface PasswordProtectedStoryProps {
  slug: string
  correctPassword: string
  children: React.ReactNode
  title: string
}

export function PasswordProtectedStory({
  slug,
  correctPassword,
  children,
  title,
}: PasswordProtectedStoryProps) {
  const [password, setPassword] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [error, setError] = useState('')

  // Check if story is already unlocked (from localStorage)
  useEffect(() => {
    const storedPassword = localStorage.getItem(`story_password_${slug}`)
    if (storedPassword === correctPassword) {
      setIsUnlocked(true)
    }
  }, [slug, correctPassword])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password === correctPassword) {
      setIsUnlocked(true)
      // Store in localStorage so user doesn't need to re-enter
      localStorage.setItem(`story_password_${slug}`, correctPassword)
    } else {
      setError('Incorrect password. Please try again.')
      setPassword('')
    }
  }

  if (isUnlocked) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-stone-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mb-2">
            {title}
          </h1>
          <p className="text-stone-600 font-serif">
            This story is password-protected. Please enter the password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password" className="text-stone-700 font-serif">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 font-serif"
              placeholder="Enter password"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm font-serif">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-gloria"
          >
            Unlock Story
          </Button>
        </form>
      </div>
    </div>
  )
}

