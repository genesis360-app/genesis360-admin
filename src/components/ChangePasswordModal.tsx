import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { adminApi } from '@/lib/adminApi'

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const change = useMutation({
    mutationFn: () => adminApi.changePassword(pw1),
    onSuccess: () => { setOk(true); setErr(null) },
    onError: (e: Error) => setErr(e.message),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (pw1.length < 8) { setErr('La contraseña debe tener al menos 8 caracteres'); return }
    if (pw1 !== pw2) { setErr('Las contraseñas no coinciden'); return }
    change.mutate()
  }

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-sm bg-surface rounded-xl shadow-card p-6" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-ink">Cambiar contraseña</h2>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>
        {ok ? (
          <div className="space-y-4">
            <p className="text-sm text-accent-600">✓ Contraseña actualizada.</p>
            <button onClick={onClose} className="w-full h-10 rounded-lg bg-primary text-white font-semibold hover:bg-primary-600">Cerrar</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input type="password" placeholder="Nueva contraseña" value={pw1} onChange={e => setPw1(e.target.value)} className="inp" autoFocus />
            <input type="password" placeholder="Repetir contraseña" value={pw2} onChange={e => setPw2(e.target.value)} className="inp" />
            {err && <p className="text-sm text-danger">{err}</p>}
            <button type="submit" disabled={change.isPending}
              className="w-full h-10 rounded-lg bg-primary text-white font-semibold hover:bg-primary-600 disabled:opacity-50">
              {change.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
