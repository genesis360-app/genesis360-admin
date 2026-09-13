import { useEffect, useState } from 'react'
import { ShieldCheck, X, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

/**
 * Verificación en dos pasos (TOTP) para los agentes del panel.
 *
 * 🔐 Por qué acá y no en la app: este panel tiene acceso CROSS-TENANT y detrás suyo corre una Edge
 * Function con `service_role`. Una contraseña sola protegiendo eso es poco — quien entra ve (y con
 * rol admin, borra) los datos de todos los negocios.
 *
 * **Es opt-in a propósito.** Forzarlo de entrada dejaría afuera a cualquier agente que todavía no
 * lo configuró, incluido quien administra el panel: un panel al que nadie puede entrar es peor que
 * uno con una contraseña sola. Una vez que el agente activa su factor, el `AuthGate` SÍ le exige el
 * código en cada ingreso (Supabase pasa la sesión a AAL1 y hay que subirla a AAL2).
 */
export function DosFactoresModal({ onClose }: { onClose: () => void }) {
  const [factores, setFactores] = useState<{ id: string; status: string; friendly_name?: string }[]>([])
  const [qr, setQr] = useState<string | null>(null)
  const [secreto, setSecreto] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const refrescar = async () => {
    const { data } = await supabase.auth.mfa.listFactors()
    setFactores((data?.totp ?? []) as any[])
  }
  useEffect(() => { refrescar() }, [])

  const empezar = async () => {
    setError(null); setOk(null); setCargando(true)
    // Un nombre único: Supabase rechaza dos factores con el mismo friendly_name.
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Panel ${new Date().toISOString().slice(0, 16)}`,
    })
    setCargando(false)
    if (error) { setError(error.message); return }
    setFactorId(data.id)
    setQr(data.totp.qr_code)
    setSecreto(data.totp.secret)
  }

  const confirmar = async () => {
    if (!factorId) return
    setError(null); setCargando(true)
    // `challengeAndVerify` verifica el código Y deja la sesión en AAL2 en el mismo paso.
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: codigo.trim() })
    setCargando(false)
    if (error) { setError(error.message); return }
    setQr(null); setSecreto(null); setFactorId(null); setCodigo('')
    setOk('Listo: desde el próximo ingreso te vamos a pedir el código.')
    refrescar()
  }

  const quitar = async (id: string) => {
    if (!confirm('¿Desactivar la verificación en dos pasos? Vas a volver a entrar solo con la contraseña.')) return
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id })
    if (error) { setError(error.message); return }
    setOk('Verificación en dos pasos desactivada.')
    refrescar()
  }

  const activos = factores.filter(f => f.status === 'verified')

  return (
    <div className="fixed inset-0 z-50 bg-black/30 grid place-items-center px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-surface rounded-xl shadow-card" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-outline/30">
          <span className="text-sm font-semibold text-ink flex items-center gap-2">
            <ShieldCheck size={16} /> Verificación en dos pasos
          </span>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {activos.length > 0 && !qr && (
            <div className="space-y-2">
              <p className="text-sm text-emerald-600">Está activada en esta cuenta.</p>
              {activos.map(f => (
                <div key={f.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{f.friendly_name ?? 'App de autenticación'}</span>
                  <button onClick={() => quitar(f.id)} className="flex items-center gap-1 text-xs text-danger hover:underline">
                    <Trash2 size={12} /> Desactivar
                  </button>
                </div>
              ))}
            </div>
          )}

          {activos.length === 0 && !qr && (
            <>
              <p className="text-sm text-muted">
                Este panel ve los datos de todos los negocios. Con la verificación en dos pasos, una
                contraseña robada no alcanza para entrar.
              </p>
              <button onClick={empezar} disabled={cargando}
                className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50">
                {cargando ? 'Generando…' : 'Activar'}
              </button>
            </>
          )}

          {qr && (
            <>
              <p className="text-sm text-muted">
                Escaneá el código con Google Authenticator, 1Password o la app que uses, y escribí el
                número de 6 dígitos que te muestre.
              </p>
              {/* Supabase devuelve el QR como SVG en un data URI. */}
              <img src={qr} alt="Código QR" className="mx-auto w-44 h-44 bg-white rounded-lg p-2" />
              {secreto && (
                <p className="text-xs text-muted text-center break-all">
                  ¿No podés escanear? Cargalo a mano: <code className="font-mono">{secreto}</code>
                </p>
              )}
              <div className="flex gap-2">
                <input value={codigo} onChange={e => setCodigo(e.target.value)} inputMode="numeric"
                  placeholder="000000" maxLength={6}
                  className="flex-1 h-10 px-3 rounded-lg border border-outline text-sm font-mono tracking-widest" />
                <button onClick={confirmar} disabled={codigo.trim().length < 6 || cargando}
                  className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50">
                  Confirmar
                </button>
              </div>
            </>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}
          {ok && <p className="text-sm text-emerald-600">{ok}</p>}
        </div>
      </div>
    </div>
  )
}
