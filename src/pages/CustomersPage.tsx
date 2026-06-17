import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { adminApi } from '@/lib/adminApi'

export default function CustomersPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['customers', q],
    queryFn: () => adminApi.listCustomers(q || undefined),
  })
  const customers = data?.customers ?? []

  return (
    <div>
      <PageHeader title="Clientes" subtitle="Tenants de Genesis360 (data real vía admin-api, auditada)" />

      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre…"
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-outline bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="bg-surface rounded-xl shadow-card overflow-hidden">
        {isLoading && <div className="p-6 text-sm text-muted">Cargando…</div>}
        {isError && <div className="p-6 text-sm text-danger">{(error as Error).message}</div>}
        {!isLoading && !isError && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-muted border-b border-outline/30">
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Alta</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)}
                  className="border-b border-outline/20 hover:bg-surface-low transition-colors cursor-pointer">
                  <td className="px-5 py-3 font-medium text-ink">{c.nombre ?? '—'}</td>
                  <td className="px-5 py-3 text-muted">{new Date(c.created_at).toLocaleDateString('es-AR')}</td>
                  <td className="px-5 py-3 text-right text-muted"><ChevronRight size={16} /></td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-muted">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-muted mt-3">La Vista por Cliente (salud, uso, tickets, “ver como cliente”) llega en la próxima iteración.</p>
    </div>
  )
}
