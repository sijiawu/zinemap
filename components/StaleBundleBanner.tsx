"use client"

import { useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function StaleBundleBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [isReloading, setIsReloading] = useState(false)

  useEffect(() => {
    // Listen for 401 errors from Supabase
    const handleError = (event: CustomEvent) => {
      const error = event.detail
      if (error?.status === 401 || error?.message?.includes('401')) {
        setIsVisible(true)
      }
    }

    // Listen for fetch errors
    const handleFetchError = (event: ErrorEvent) => {
      if (event.message?.includes('401') || event.message?.includes('Unauthorized')) {
        setIsVisible(true)
      }
    }

    // Listen for unhandled promise rejections (common with Supabase)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        setIsVisible(true)
      }
    }

    // Add event listeners
    window.addEventListener('supabase-error', handleError as EventListener)
    window.addEventListener('error', handleFetchError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('supabase-error', handleError as EventListener)
      window.removeEventListener('error', handleFetchError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  // Notify other components when banner visibility changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('stale-banner-visibility', {
      detail: { visible: isVisible }
    }))
  }, [isVisible])

  const handleReload = () => {
    setIsReloading(true)
    // Force a full page reload with cache busting
    window.location.reload()
  }

  const handleDismiss = () => {
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-blue-50 border-b border-blue-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            <div className="text-sm text-blue-800">
              <span className="font-medium">New version available!</span>
              <span className="ml-2">ZineMap has been updated - click to reload and stay in sync!</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleReload}
              disabled={isReloading}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isReloading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-blue-700 hover:text-blue-800 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
