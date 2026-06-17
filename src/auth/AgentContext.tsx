import { createContext, useContext, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/adminApi'
import { supabase } from '@/lib/supabase'
import type { Agent } from '@/config/permissions'

const Ctx = createContext<Agent | null>(null)

export function useAgent(): Agent {
  const a = useContext(Ctx)
  if (!a) throw new Error('useAgent debe usarse dentro de <AgentProvider>')
  return a
}

/** Carga el agente actual (whoami). Si no es agente activo, bloquea el panel. */
export function AgentProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['whoami'],
    queryFn: () => adminApi.whoami(),
    retry: false,
  })

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center text-muted">Cargando…</div>
  }

  if (isError || !data?.agent) {
    return (
      <div className="min-h-screen grid place-items-center bg-canvas px-4 text-center">
        <div className="max-w-sm space-y-3">
          <p className="text-ink font-semibold">No tenés acceso al panel</p>
          <p className="text-sm text-muted">
            Tu usuario no es un agente activo. Pedile a un administrador que te dé de alta en Usuarios.
          </p>
          <button onClick={() => supabase.auth.signOut()} className="text-sm font-medium text-primary hover:underline">
            Salir
          </button>
        </div>
      </div>
    )
  }

  return <Ctx.Provider value={data.agent}>{children}</Ctx.Provider>
}
