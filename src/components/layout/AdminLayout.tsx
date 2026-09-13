import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LogOut, KeyRound, ShieldCheck } from 'lucide-react'
import { NAV } from '@/config/nav'
import { canSee, ROL_LABEL } from '@/config/permissions'
import { useAgent } from '@/auth/AgentContext'
import { supabase } from '@/lib/supabase'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { BusquedaGlobal } from '@/components/BusquedaGlobal'
import { DosFactoresModal } from '@/components/DosFactoresModal'

export function AdminLayout() {
  const agent = useAgent()
  const items = NAV.filter(item => canSee(agent.rol, item.module))
  const [pwOpen, setPwOpen] = useState(false)
  const [mfaOpen, setMfaOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-canvas text-ink">
      {/* Ctrl/⌘ + K desde cualquier pantalla */}
      <BusquedaGlobal />
      {/* Sidebar 280px (design system Stitch) */}
      <aside className="w-[280px] shrink-0 bg-surface border-r border-outline/40 flex flex-col">
        <div className="px-6 py-5 border-b border-outline/30">
          <div className="text-lg font-bold text-ink">Genesis360</div>
          <div className="text-xs text-muted">Panel interno</div>
          <div className="mt-2 text-[11px] text-muted flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-outline bg-surface-low font-mono">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 rounded border border-outline bg-surface-low font-mono">K</kbd>
            <span>para buscar</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              // Se keyea por RUTA, no por módulo: "Usuarios" y "Auditoría" comparten el módulo
              // `users` (las dos son solo-admin) y React se quejaba de claves duplicadas.
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
          <div className="px-3 pb-2">
            <div className="text-sm font-medium text-ink truncate">{agent.nombre ?? agent.email}</div>
            <div className="text-xs text-muted">{ROL_LABEL[agent.rol]}</div>
          </div>
          <button
            onClick={() => setPwOpen(true)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:bg-surface-low transition-colors"
          >
            <KeyRound size={18} /> Cambiar contraseña
          </button>
          <button
            onClick={() => setMfaOpen(true)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:bg-surface-low transition-colors"
          >
            <ShieldCheck size={18} /> Verificación en 2 pasos
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:bg-surface-low transition-colors"
          >
            <LogOut size={18} /> Salir
          </button>
        </div>
      </aside>
      {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}
      {mfaOpen && <DosFactoresModal onClose={() => setMfaOpen(false)} />}

      <main className="flex-1 min-w-0 px-8 py-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
