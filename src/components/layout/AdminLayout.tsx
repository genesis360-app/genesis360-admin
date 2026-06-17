import { NavLink, Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { NAV } from '@/config/nav'
import { supabase } from '@/lib/supabase'

export function AdminLayout() {
  return (
    <div className="min-h-screen flex bg-canvas text-ink">
      {/* Sidebar 280px (design system Stitch) */}
      <aside className="w-[280px] shrink-0 bg-surface border-r border-outline/40 flex flex-col">
        <div className="px-6 py-5 border-b border-outline/30">
          <div className="text-lg font-bold text-ink">Genesis360</div>
          <div className="text-xs text-muted">Panel interno · Soporte</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-muted hover:bg-surface-low'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-outline/30">
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:bg-surface-low transition-colors"
          >
            <LogOut size={18} /> Salir
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 min-w-0 px-8 py-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
