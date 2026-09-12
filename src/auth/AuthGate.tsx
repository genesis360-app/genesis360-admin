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

  // 🔐 Segundo factor. Solo se exige a quien lo tiene ACTIVADO: es opt-in, para que activarlo no
  // deje afuera a los agentes que todavía no lo configuraron (un panel al que nadie puede entrar
  // es peor que uno con una contraseña sola). Supabase lo modela con niveles de garantía: al
  // entrar con contraseña la sesión queda en AAL1 y, si hay un factor verificado, el nivel que
  // "debería" tener es AAL2 — la diferencia entre los dos es justamente el código pendiente.
  const [necesita2fa, setNecesita2fa] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [codigo2fa, setCodigo2fa] = useState('')

  const chequearAal = async () => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    const falta = !!data && data.nextLevel === 'aal2' && data.currentLevel !== data.nextLevel
    setNecesita2fa(falta)
    if (falta) {
      const { data: f } = await supabase.auth.mfa.listFactors()
      setFactorId(f?.totp?.find(x => x.status === 'verified')?.id ?? null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) await chequearAal()
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s)
      if (s) await chequearAal(); else setNecesita2fa(false)
    })
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

  // Sesión iniciada pero con el segundo factor pendiente: no se entra al panel hasta resolverlo.
  if (necesita2fa) {
    const verificar = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!factorId) { setError('No se encontró tu factor de verificación. Cerrá sesión y volvé a intentar.'); return }
      setError(null); setSubmitting(true)
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: codigo2fa.trim() })
      setSubmitting(false)
      if (error) { setError(error.message); return }
      setCodigo2fa('')
      await chequearAal()
    }
    return (
      <div className="min-h-screen grid place-items-center bg-canvas px-4">
        <form onSubmit={verificar} className="w-full max-w-sm bg-surface rounded-xl shadow-card p-8 space-y-5">
          <div className="space-y-1">
            <div className="text-xl font-bold text-ink">Verificación en dos pasos</div>
            <div className="text-sm text-muted">Escribí el código de tu app de autenticación.</div>
          </div>
          <input value={codigo2fa} onChange={e => setCodigo2fa(e.target.value)} inputMode="numeric"
            maxLength={6} placeholder="000000" autoFocus
            className="w-full h-11 px-3 rounded-lg border border-outline bg-white text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary" />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={submitting || codigo2fa.trim().length < 6}
            className="w-full h-11 rounded-lg bg-primary text-white font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50">
            {submitting ? 'Verificando…' : 'Verificar'}
          </button>
          <button type="button" onClick={() => supabase.auth.signOut()}
            className="w-full text-xs text-muted hover:text-ink">
            Cerrar sesión
          </button>
        </form>
      </div>
    )
  }

  return <>{children}</>
}
