import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { adminApi } from '@/lib/adminApi'
import { ROL_LABEL, type Rol } from '@/config/permissions'

const ROLES: Rol[] = ['admin', 'support', 'marketing', 'billing']

export default function UsersPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['agents'], queryFn: () => adminApi.listAgents() })
  const agents = data?.agents ?? []

  const [form, setForm] = useState<{ email: string; nombre: string; rol: Rol; password: string }>({
    email: '', nombre: '', rol: 'support', password: '',
  })
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['agents'] })

  const create = useMutation({
    mutationFn: () => adminApi.createAgent(form),
    onSuccess: () => {
      setMsg({ kind: 'ok', text: `Agente ${form.email} creado.` })
      setForm({ email: '', nombre: '', rol: 'support', password: '' })
      invalidate()
    },
    onError: (e: Error) => setMsg({ kind: 'err', text: e.message }),
  })

  const update = useMutation({
    mutationFn: (a: { agentId: string; rol?: Rol; activo?: boolean }) => adminApi.updateAgent(a),
    onSuccess: invalidate,
    onError: (e: Error) => setMsg({ kind: 'err', text: e.message }),
  })

  return (
    <div>
      <PageHeader title="Usuarios" subtitle="Gestión de agentes del panel y sus roles (solo administradores)" />

      {/* Alta */}
      <div className="bg-surface rounded-xl shadow-card p-5 mb-6">
        <div className="text-sm font-semibold text-ink mb-4">Nuevo agente</div>
        <form
          onSubmit={e => { e.preventDefault(); setMsg(null); create.mutate() }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
        >
          <Field label="Email">
            <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="inp" placeholder="agente@genesis360.pro" />
          </Field>
          <Field label="Nombre">
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              className="inp" placeholder="Nombre y apellido" />
          </Field>
          <Field label="Rol">
            <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value as Rol }))} className="inp">
              {ROLES.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
            </select>
          </Field>
          <Field label="Contraseña inicial">
            <input type="text" required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="inp" placeholder="mín. 8 caracteres" />
          </Field>
          <button type="submit" disabled={create.isPending}
            className="h-10 rounded-lg bg-primary text-white font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50">
            {create.isPending ? 'Creando…' : 'Crear agente'}
          </button>
        </form>
        {msg && (
          <p className={`text-sm mt-3 ${msg.kind === 'ok' ? 'text-accent-600' : 'text-danger'}`}>{msg.text}</p>
        )}
      </div>

      {/* Listado */}
      <div className="bg-surface rounded-xl shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-muted">Cargando…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-muted border-b border-outline/30">
                <th className="px-5 py-3">Agente</th>
                <th className="px-5 py-3">Rol</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {agents.map(a => (
                <tr key={a.id} className="border-b border-outline/20">
                  <td className="px-5 py-3">
                    <div className="font-medium text-ink">{a.nombre ?? '—'}</div>
                    <div className="text-xs text-muted">{a.email}</div>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={a.rol}
                      onChange={e => update.mutate({ agentId: a.id, rol: e.target.value as Rol })}
                      className="h-9 px-2 rounded-lg border border-outline bg-white text-sm"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${a.activo ? 'bg-accent/10 text-accent-600' : 'bg-danger/10 text-danger'}`}>
                      {a.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => update.mutate({ agentId: a.id, activo: !a.activo })}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {a.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted mb-1">{label}</span>
      {children}
    </label>
  )
}
