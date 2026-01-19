'use client'

import Link from 'next/link'
import { SignedIn, UserButton, SignOutButton } from '@clerk/nextjs'
import { LogOut, Settings } from 'lucide-react'
import { useState } from 'react'

export function SiteHeader() {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo - Links to /dashboard */}
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-[#00ff88]">FreeRunna</span>
          </div>
        </Link>

        {/* Right side - User controls */}
        <div className="flex items-center gap-4">
          <SignedIn>
            {/* Settings Toggle Button (Mobile) */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="md:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-400" />
            </button>

            {/* UserButton with sign out */}
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                  userButtonPopoverCard: "bg-[#1a1a1a] border border-gray-800",
                  userButtonPopoverActions: "bg-[#1a1a1a]",
                },
              }}
            />
          </SignedIn>
        </div>
      </div>

      {/* Mobile Settings Sheet */}
      {showSettings && (
        <div className="md:hidden border-t border-gray-800 bg-[#1a1a1a] p-4">
          <SettingsSheet>
            <div className="text-sm text-gray-400 mb-4">
              <p>Connected accounts and settings</p>
            </div>
          </SettingsSheet>
        </div>
      )}
    </header>
  )
}

// Settings Sheet component with Sign Out button
export function SettingsSheet({ children }: { children?: React.ReactNode }) {
  return (
    <div className="space-y-4">
      {children}
      
      {/* Sign Out Button */}
      <SignedIn>
        <div className="pt-4 border-t border-gray-800">
          <SignOutButton>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-medium hover:bg-red-500/30 transition-colors">
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </SignedIn>
    </div>
  )
}
