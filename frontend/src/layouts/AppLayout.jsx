import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  LogOut,
  Sun,
  Moon,
  UserCog,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { to: '/',               icon: LayoutDashboard, label: 'Dashboard',      end: true              },
  { to: '/alumnos',        icon: Users,            label: 'Alumnos',        roles: ['admin']       },
  { to: '/comisiones',     icon: BookOpen,         label: 'Comisiones'                             },
  { to: '/usuarios',       icon: UserCog,          label: 'Docentes',       roles: ['admin']       },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-60 bg-sidebar border-r border-sidebar-border flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-sidebar-border flex items-center justify-between">
          <span className="text-sidebar-foreground font-semibold text-sm leading-tight">
            Gestión Educativa
          </span>
          <button
            onClick={() => setIsDark(prev => !prev)}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            aria-label="Cambiar tema"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.filter(item => !item.roles || item.roles.includes(user?.rol)).map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-sidebar-border space-y-0.5">
          <div className="px-3 py-2">
            <p className="text-sidebar-foreground text-sm font-medium truncate">{user?.nombre}</p>
            <p className="text-sidebar-foreground/60 text-xs capitalize">{user?.rol}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
