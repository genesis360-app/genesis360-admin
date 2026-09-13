import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ShieldAlert } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { adminApi } from '@/lib/adminApi'

/**
 * El registro de lo que hizo el equipo de soporte.
 *
 * `admin_audit_log` se escribe en cada acción de la Edge Function desde la mig 221, pero **no
 * había ninguna pantalla para leerla**: una auditoría que nadie puede mirar no audita nada. Con
 * acciones destructivas en el panel (dar de baja un negocio, extender una prueba, cancelar una
 * suscripción), poder responder "¿quién hizo esto y cuándo?" deja de ser un lujo.
 */

const fmt = (s: string) => new Date(s).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })

/** Las acciones que mueven plata o borran datos van resaltadas: son las que se auditan de verdad. */
const CRITICAS = new Set([
  'customers.purge_now', 'customers.schedule_delete', 'customers.cancel_delete',
  'customers.extend_trial', 'customers.reset_password',
  'billing.cancel_subscription', 'billing.link_subscription', 'billing.manual_record_payment',
  'agents.create', 'agents.update',
])

export default function AuditPage() {
  const [q, setQ] = useState('')
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['audit'],
    queryFn: () => adminApi.listAudit({ limit: 300 }),
  })

  const entries = (data?.entries ?? []).filter(e => {
    if (!q.trim()) return true
    const t = q.trim().toLowerCase()
    return [e.action, e.agent_email, e.tenants?.nombre, JSON.stringify(e.metadata ?? {})]
      .some(v => (v ?? '').toString().toLowerCase().includes(t))
  })

  return (
    <div>
      <PageHeader title="Auditoría" subtitle="Todo lo que el equipo hizo desde el panel (admin_audit_log)" />

      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Filtrar por acción, agente, negocio o detalle…"
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-outline bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="bg-surface rounded-xl shadow-card overflow-hidden">
        {isLoading && <div className="p-6 text-sm text-muted">Cargando…</div>}
        {isError && <div className="p-6 text-sm text-danger">{(error as Error).message}</div>}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-muted border-b border-outline/30">
                  <th className="px-5 py-3">Cuándo</th>
                  <th className="px-5 py-3">Agente</th>
                  <th className="px-5 py-3">Acción</th>
                  <th className="px-5 py-3">Negocio</th>
                  <th className="px-5 py-3">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className="border-b border-outline/20 align-top">
                    <td className="px-5 py-2.5 text-muted whitespace-nowrap">{fmt(e.created_at)}</td>
                    <td className="px-5 py-2.5 text-ink whitespace-nowrap">{e.agent_email ?? '—'}</td>
                    <td className="px-5 py-2.5">
                      <span className={`inline-flex items-center gap-1 font-mono text-xs ${CRITICAS.has(e.action) ? 'text-danger font-semibold' : 'text-muted'}`}>
                        {CRITICAS.has(e.action) && <ShieldAlert size={12} />}
                        {e.action}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-ink">{e.tenants?.nombre ?? (e.target_tenant_id ? e.target_tenant_id.slice(0, 8) : '—')}</td>
                    <td className="px-5 py-2.5 text-muted">
                      {e.metadata
                        ? <code className="text-xs break-all">{JSON.stringify(e.metadata).slice(0, 220)}</code>
                        : '—'}
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">Sin registros</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
