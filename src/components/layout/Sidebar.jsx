import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, Users, Megaphone,
  Settings, ChevronDown, Plus, Sun, Moon, LogOut,
  User, Building2
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useOrg } from '../../context/OrgContext'
import { useTheme } from '../../context/ThemeContext'
import { Avatar } from '../ui/Avatar'
import { CreateOrgModal } from '../org/CreateOrgModal'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/team', icon: Users, label: 'Team' },
  { to: '/announcements', icon: Megaphone, label: 'Announcements' },
]

export function Sidebar({ mobileOpen, setMobileOpen }) {
  const { profile, signOut } = useAuth()
  const { orgs, currentOrg, setCurrentOrg, isAdmin } = useOrg()
  const { dark, toggle } = useTheme()
  const location = useLocation()
  const [orgDropdown, setOrgDropdown] = useState(false)
  const [createOrgOpen, setCreateOrgOpen] = useState(false)

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ background: 'var(--surface)' }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: 'var(--accent)' }}>T</div>
        <span className="section-title text-base">Teamer</span>
      </div>

      {/* Org Switcher */}
      <div className="px-3 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div
          className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all hover:bg-opacity-80"
          style={{ background: 'var(--surface-2)' }}
          onClick={() => setOrgDropdown(!orgDropdown)}
        >
          <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--accent)', minWidth: 24 }}>
            {currentOrg?.name?.[0] || '?'}
          </div>
          <span className="text-sm font-medium flex-1 truncate">{currentOrg?.name || 'No workspace'}</span>
          <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />
        </div>

        {orgDropdown && (
          <div className="mt-1 card py-1 z-10 shadow-lg" style={{ position: 'relative' }}>
            {orgs.map(org => (
              <button
                key={org.id}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:opacity-80 transition-opacity text-left"
                style={{ background: currentOrg?.id === org.id ? 'var(--accent-light)' : 'transparent', color: currentOrg?.id === org.id ? 'var(--accent)' : 'var(--text)' }}
                onClick={() => { setCurrentOrg(org); setOrgDropdown(false) }}
              >
                <div className="w-5 h-5 rounded text-white text-xs font-bold flex items-center justify-center" style={{ background: 'var(--accent)', minWidth: 20 }}>
                  {org.name?.[0] ?? '?'}
                </div>
                {org.name}
              </button>
            ))}
            <hr style={{ borderColor: 'var(--border)', margin: '4px 0' }} />
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm"
              style={{ color: 'var(--accent)' }}
              onClick={() => { setOrgDropdown(false); setCreateOrgOpen(true) }}
            >
              <Plus size={14} /> New workspace
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`nav-item ${location.pathname.startsWith(to) ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="label">Admin</span>
            </div>
            <Link to="/settings" className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
              <Settings size={16} />
              Settings
            </Link>
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 pt-2 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
        <button className="nav-item w-full" onClick={toggle}>
          {dark ? <Sun size={16} /> : <Moon size={16} />}
          {dark ? 'Light mode' : 'Dark mode'}
        </button>
        <Link to="/profile" className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
          <User size={16} />
          My Profile
        </Link>
        <button className="nav-item w-full" onClick={signOut} style={{ color: 'var(--text-2)' }}>
          <LogOut size={16} />
          Sign out
        </button>
        <div className="flex items-center gap-2 px-2 pt-2 mt-1 border-t" style={{ borderColor: 'var(--border)' }}>
          <Avatar name={profile?.full_name} src={profile?.avatar_url} size={28} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{profile?.full_name}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{profile?.skill || 'Set your skill'}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r transition-transform duration-300 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ borderColor: 'var(--border)' }}
      >
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-56 border-r h-screen sticky top-0 flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        {sidebarContent}
      </div>

      {createOrgOpen && <CreateOrgModal open onClose={() => setCreateOrgOpen(false)} />}
    </>
  )
}
