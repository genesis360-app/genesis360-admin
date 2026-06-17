import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/**
 * Gate de autenticación de AGENTES de soporte.
 * Fase 0: valida que haya sesión Supabase. TODO (Fase 0/1): además verificar que el
 * usuario está en `support_agents` y activo (vía Edge Function `admin-api` action
 * `auth.whoami`) — los agentes NO son usuarios de un tenant.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted">Cargando…</div>
  }

  if (!session) {
    const onSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setSubmitting(true)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      setSubmitting(false)
    }
    return (
      <div className="min-h-screen grid place-items-center bg-canvas px-4">
        <form onSubmit={onSubmit} className="w-full max-w-sm bg-surface rounded-xl shadow-card p-8 space-y-5">
          <div className="space-y-1">
            <div className="text-xl font-bold text-ink">Genesis360 · Soporte</div>
            <div className="text-sm text-muted">Acceso del equipo interno</div>
          </div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
            className="w-full h-11 px-3 rounded-lg border border-outline bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña"
            className="w-full h-11 px-3 rounded-lg border border-outline bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={submitting}
            className="w-full h-11 rounded-lg bg-primary text-white font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50">
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </button>
          <p className="text-xs text-muted text-center">
            El acceso de agentes se valida contra <code>support_agents</code> (próxima fase).
          </p>
        </form>
      </div>
    )
  }

  return <>{children}</>
}
