import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { CATEGORIES } from '../lib/supabase'
import {
  LayoutDashboard, KanbanSquare, Calendar, Settings, LogOut,
  Sun, Moon, CheckSquare
} from 'lucide-react'

export default function Layout() {
  const { user, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/board', icon: KanbanSquare, label: 'All Tasks', end: true },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 flex flex-col">
        {/* Logo */}
        <div className="px-5 h-16 flex items-center gap-2 border-b border-ink-100 dark:border-ink-800">
          <div className="w-8 h-8 rounded-lg bg-ink-900 dark:bg-white text-white dark:text-ink-900 flex items-center justify-center">
            <CheckSquare size={18} />
          </div>
          <div>
            <h1 className="font-display font-bold text-sm leading-tight">Work Tracker</h1>
            <p className="text-xs text-ink-500 leading-tight">งานของคุณ</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-ink-100 dark:bg-ink-800 text-ink-900 dark:text-white font-medium'
                    : 'text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-800/50'
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}

          <div className="pt-4 pb-1.5 px-3">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-ink-400">Categories</p>
          </div>

          {CATEGORIES.map(cat => (
            <NavLink
              key={cat.value}
              to={`/board/${cat.value}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-ink-100 dark:bg-ink-800 text-ink-900 dark:text-white font-medium'
                    : 'text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-800/50'
                }`
              }
            >
              <span className={`w-2 h-2 rounded-full ${cat.dot}`} />
              {cat.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-ink-100 dark:border-ink-800 space-y-1">
          <div className="px-3 py-2 text-xs text-ink-500 truncate">
            {user?.email}
          </div>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-ink-100 dark:bg-ink-800'
                  : 'text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-800/50'
              }`
            }
          >
            <Settings size={16} />
            Settings
          </NavLink>
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-800/50 transition-colors"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-800/50 transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  )
}
