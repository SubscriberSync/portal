'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, OrganizationSwitcher } from '@clerk/nextjs'
import {
  Users,
  Package,
  AlertCircle,
  Boxes,
  Calendar,
  PlayCircle,
  Home,
  Settings,
  ChevronLeft,
  ChevronRight,
  Truck,
} from 'lucide-react'
import { useState } from 'react'

interface PortalSidebarProps {
  clientSlug: string
  company: string
  logoUrl?: string
  status: string
}

const navItems = [
  { name: 'Dashboard', href: '', icon: Home },
  { name: 'Subscribers', href: '/subscribers', icon: Users },
  { name: 'Shipping', href: '/shipping', icon: Truck },
  { name: 'Shipments', href: '/shipments', icon: Package },
  { name: 'Unknown SKUs', href: '/unknown-skus', icon: AlertCircle },
  { name: 'Products', href: '/products', icon: Boxes },
  { name: 'Events', href: '/events', icon: Calendar },
]

export default function PortalSidebar({
  clientSlug,
  company,
  logoUrl,
  status,
}: PortalSidebarProps) {
  const pathname = usePathname()
  const basePath = `/portal/${clientSlug}`
  const [isCollapsed, setIsCollapsed] = useState(false)

  const isActive = (href: string) => {
    if (href === '') {
      return pathname === basePath || pathname === `${basePath}/`
    }
    return pathname.startsWith(`${basePath}${href}`)
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#0A0A0A] border-r border-[rgba(255,255,255,0.06)] flex flex-col transition-all duration-300 z-50 ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Logo/Brand */}
      <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={company}
              className="w-10 h-10 rounded-xl object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e07a42] to-[#c56a35] flex items-center justify-center shadow-lg shadow-[#e07a42]/20">
              <span className="text-sm font-bold text-white">
                {company.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-white truncate">{company}</h2>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  status === 'Live'
                    ? 'bg-[#5CB87A]/20 text-[#5CB87A]'
                    : 'bg-[#e07a42]/20 text-[#e07a42]'
                }`}
              >
                {status}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.name}
              href={`${basePath}${item.href}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                active
                  ? 'bg-[#e07a42]/10 text-[#e07a42]'
                  : 'text-[#71717a] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 ${
                  active ? 'text-[#e07a42]' : 'text-[#71717a] group-hover:text-white'
                }`}
              />
              {!isCollapsed && (
                <span className="font-medium">{item.name}</span>
              )}
              {active && !isCollapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#e07a42]" />
              )}
            </Link>
          )
        })}

        {/* Divider */}
        <div className="my-4 h-px bg-[rgba(255,255,255,0.06)]" />

        {/* Pack Mode Button */}
        <Link
          href={`${basePath}/pack`}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
            pathname.includes('/pack')
              ? 'bg-[#5CB87A]/10 text-[#5CB87A]'
              : 'bg-[#5CB87A]/5 text-[#5CB87A] hover:bg-[#5CB87A]/15'
          }`}
          title={isCollapsed ? 'Pack Mode' : undefined}
        >
          <PlayCircle className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Pack Mode</span>}
        </Link>

        {/* Klaviyo Link */}
        <Link
          href={`${basePath}/klaviyo`}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
            pathname.includes('/klaviyo')
              ? 'bg-[rgba(255,255,255,0.08)] text-white'
              : 'text-[#71717a] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
          }`}
          title={isCollapsed ? 'Klaviyo' : undefined}
        >
          <svg
            className={`w-5 h-5 flex-shrink-0 ${
              pathname.includes('/klaviyo') ? 'text-white' : 'text-[#71717a] group-hover:text-white'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          {!isCollapsed && <span className="font-medium">Klaviyo</span>}
        </Link>
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#1A1A1A] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#71717a] hover:text-white hover:bg-[#2A2A2A] transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>

      {/* Bottom Section - User & Settings */}
      <div className="p-3 border-t border-[rgba(255,255,255,0.06)] space-y-2">
        {/* Settings Link */}
        <Link
          href={`${basePath}/settings`}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
            pathname.includes('/settings')
              ? 'bg-[rgba(255,255,255,0.08)] text-white'
              : 'text-[#71717a] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
          }`}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Settings</span>}
        </Link>

        {/* User Section */}
        <div className={`flex items-center gap-3 px-2 py-2 ${isCollapsed ? 'justify-center' : ''}`}>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: 'w-8 h-8',
              },
            }}
          />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <OrganizationSwitcher
                hidePersonal
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    organizationSwitcherTrigger:
                      'w-full px-2 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] border-none text-sm text-[#a1a1aa]',
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
