"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { User, MapPin, X } from "lucide-react"
import { HomePin as HomePinType } from "@/lib/types"

interface HomePinProps {
  pin: HomePinType
  isActive?: boolean
  onClick?: () => void
  onClose?: () => void
  showProfileCard?: boolean
}

export function HomePin({ pin, isActive = false, onClick, onClose, showProfileCard = false }: HomePinProps) {
  const [imageError, setImageError] = useState(false)
  
  const size = isActive ? 40 : 32
  const avatarSize = isActive ? 24 : 20
  
  const handleImageError = () => {
    setImageError(true)
  }

  return (
    <div className="relative">
      {/* Custom SVG Pin */}
      <div
        className="cursor-pointer transition-all duration-200 hover:scale-110"
        onClick={onClick}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          transform: 'translate(-50%, -100%)',
          zIndex: isActive ? 10 : 1,
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          className="drop-shadow-lg"
        >
          {/* Pin body with gradient */}
          <defs>
            <linearGradient id={`pinGradient-${pin.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          
          {/* Pin shape - teardrop */}
          <path
            d="M16 2C10.477 2 6 6.477 6 12c0 8 10 18 10 18s10-10 10-18c0-5.523-4.477-10-10-10z"
            fill={`url(#pinGradient-${pin.id})`}
            stroke="#d97706"
            strokeWidth="1"
          />
          
          {/* Pin point */}
          <circle
            cx="16"
            cy="26"
            r="3"
            fill="#d97706"
          />
          
          {/* Avatar container */}
          <foreignObject
            x="8"
            y="6"
            width="16"
            height="16"
            className="overflow-hidden rounded-full"
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-white border-2 border-amber-200 flex items-center justify-center">
              {pin.user?.profile_image && !imageError ? (
                <Image
                  src={pin.user.profile_image}
                  alt={pin.user.display_name || "User"}
                  width={avatarSize}
                  height={avatarSize}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              ) : (
                <User className="w-3 h-3 text-amber-600" />
              )}
            </div>
          </foreignObject>
        </svg>
      </div>

      {/* Profile Card */}
      {showProfileCard && pin.user && (
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl border border-amber-200 p-4 w-64 z-20">
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Profile header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-amber-50 border-2 border-amber-200 flex items-center justify-center flex-shrink-0">
              {pin.user.profile_image && !imageError ? (
                <Image
                  src={pin.user.profile_image}
                  alt={pin.user.display_name || "User"}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              ) : (
                <User className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-800 text-sm truncate">
                {pin.user.display_name || "Anonymous Zinester"}
              </h3>
              {pin.user.permalink && (
                <Link
                  href={`/profile/${pin.user.permalink}`}
                  className="text-xs text-amber-600 hover:text-amber-700 transition-colors"
                >
                  @{pin.user.permalink}
                </Link>
              )}
            </div>
          </div>

          {/* Bio */}
          {pin.user.bio && (
            <p className="text-xs text-gray-600 mb-3 line-clamp-3">
              {pin.user.bio}
            </p>
          )}

          {/* Location info */}
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
            <MapPin className="w-3 h-3" />
            <span>Home location</span>
          </div>

          {/* Profile link */}
          {pin.user.permalink && (
            <Link
              href={`/profile/${pin.user.permalink}`}
              className="block w-full text-center bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium py-2 px-3 rounded-md transition-colors border border-amber-200"
            >
              View Profile
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
