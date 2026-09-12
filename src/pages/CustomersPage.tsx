import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight, AlertTriangle, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { adminApi, type CustomerRow } from '@/lib/adminApi'

const fmtFecha = (s: string | null) => (s ? new Date(s).toLocaleDateString('es-AR') : '—')

/** Hace cuánto, en palabras. Para "último acceso": una fecha sola obliga a hacer la cuenta. */
function hace(s: string | null): string {
  if (!s) return 'nunca'
  const dias = Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 30) return `hace ${dias} d`
  const meses = Math.floor(dias / 30)
  return `hace ${meses} mes${meses > 1 ? 'es' : ''}`
}

type Estado = 'trial_vigente' | 'trial_vencido' | 'activa' | 'cancelada' | 'otro'

/**
 * En qué estado real está la cuenta.
 *
 * 🛑 `subscription_status === 'trial'` NO alcanza: el campo se queda en 'trial' para siempre
 * aunque la fecha haya pasado. Al 2026-09-12, 5 de los 6 tenants "en trial" de PROD ya lo tenían
 * vencido — era el caso mayoritario. Es el mismo bug que hacía que la app le dijera al cliente
 * "tu prueba está por vencer" 25 días después de vencida.
 */
function estadoDe(c: CustomerRow): { estado: Estado; label: string; clase: string } {
  if (c.subscription_status === 'active') return { estado: 'activa', label: 'Activa', clase: 'bg-emerald-100 text-emerald-700' }
  if (c.subscription_status === 'cancelled') return { estado: 'cancelada', label: 'Cancelada', clase: 'bg-gray-200 text-gray-600' }
  if (c.subscription_status === 'trial') {
    const vence = c.trial_ends_at ? new Date(c.trial_ends_at) : null
    if (vence && vence > new Date()) {
      const dias = Math.ceil((vence.getTime() - Date.now()) / 86400000)
      return { estado: 'trial_vigente', label: `Prueba · ${dias} d`, clase: 'bg-blue-100 text-blue-700' }
    }
    const dias = vence ? Math.floor((Date.now() - vence.getTime()) / 86400000) : 0
    return { estado: 'trial_vencido', label: `Prueba vencida${dias ? ` · ${dias} d` : ''}`, clase: 'bg-amber-100 text-amber-700' }
  }
  return { estado: 'otro', label: c.subscription_status ?? '—', clase: 'bg-gray-200 text-gray-600' }
}

const FILTROS: { id: Estado | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'trial_vigente', label: 'En prueba' },
  { id: 'trial_vencido', label: 'Prueba vencida' },
  { id: 'activa', label: 'Activas' },
  { id: 'cancelada', label: 'Canceladas' },
]

export default function CustomersPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState<Estado | 'todos'>('todos')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['customers', q],
    queryFn: () => adminApi.listCustomers(q || undefined),
  })
  const todos = data?.customers ?? []
  const customers = filtro === 'todos' ? todos : todos.filter(c => estadoDe(c).estado === filtro)

  return (
    <div>
      <PageHeader title="Clientes" subtitle="Tenants de Genesis360 (data real vía admin-api, auditada)" />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            /* El que escribe a soporte lo hace desde su mail: buscar por negocio solamente
               obligaba a adivinar el nombre. También entra el id, para pegarlo de un log. */
            placeholder="Buscar por negocio, mail del dueño, mail de cualquier usuario o id…"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-outline bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-1">
          {FILTROS.map(f => (
            <button key={f.id} onClick={() => setFiltro(f.id)}
              className={`h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                filtro === f.id ? 'bg-primary text-white' : 'border border-outline text-muted hover:bg-primary/10'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-xl shadow-card overflow-hidden">
        {isLoading && <div className="p-6 text-sm text-muted">Cargando…</div>}
        {isError && <div className="p-6 text-sm text-danger">{(error as Error).message}</div>}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-muted border-b border-outline/30">
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Dueño</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Usuarios</th>
                  <th className="px-5 py-3">Último acceso</th>
                  <th className="px-5 py-3">Alta</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => {
                  const e = estadoDe(c)
                  return (
                    <tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)}
                      className="border-b border-outline/20 hover:bg-surface-low transition-colors cursor-pointer">
                      <td className="px-5 py-3">
                        <div className="font-medium text-ink flex items-center gap-2">
                          {c.nombre ?? '—'}
                          {c.delete_scheduled_at && (
                            <span title={`Baja programada para el ${fmtFecha(c.delete_scheduled_at)}`}
                              className="inline-flex items-center gap-1 text-xs text-danger">
                              <Trash2 size={12} /> baja
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted">
                          {[c.tipo_comercio, c.pais, c.modo_operacion].filter(Boolean).join(' · ') || '—'}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {/* Lo que faltaba: quién es y con qué mail entra. */}
                        <div className="text-ink">{c.dueno_nombre ?? '—'}</div>
                        <div className="text-xs text-muted">{c.dueno_email ?? 'sin dueño'}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium ${e.clase}`}>{e.label}</span>
                      </td>
                      <td className="px-5 py-3 text-muted">{c.usuarios}</td>
                      <td className="px-5 py-3 text-muted">{hace(c.ultimo_acceso)}</td>
                      <td className="px-5 py-3 text-muted">{fmtFecha(c.created_at)}</td>
                      <td className="px-5 py-3 text-right text-muted"><ChevronRight size={16} /></td>
                    </tr>
                  )
                })}
                {customers.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-muted">
                    {q ? `Sin resultados para "${q}"` : 'Sin resultados'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {todos.some(c => !c.dueno_email) && (
        <p className="text-xs text-muted mt-3 flex items-center gap-1.5">
          <AlertTriangle size={12} className="text-amber-500" />
          Un negocio sin dueño quedó sin ningún usuario con rol DUEÑO — nadie puede administrarlo.
        </p>
      )}
    </div>
  )
}
