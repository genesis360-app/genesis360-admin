import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { adminApi } from '@/lib/adminApi'

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => adminApi.metricsOverview(),
  })
  const m = data?.metrics

  const cards = [
    { label: 'MRR', value: m ? '$' + Math.round(m.mrr).toLocaleString('es-AR') : undefined },
    { label: 'Clientes totales', value: m?.total },
    { label: 'Altas (30 días)', value: m?.altas30 },
    { label: 'En trial', value: m?.enTrial },
    { label: 'Tickets abiertos', value: m?.ticketsAbiertos },
  ]

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen del negocio (data real)" />
      {isError ? (
        <div className="text-sm text-danger">{(error as Error).message}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
            {cards.map(c => (
              <div key={c.label} className="bg-surface rounded-xl shadow-card p-5">
                <div className="text-sm text-muted">{c.label}</div>
                <div className="text-2xl font-bold text-ink mt-1">{isLoading ? '…' : c.value ?? 0}</div>
              </div>
            ))}
          </div>
          <div className="bg-surface rounded-xl shadow-card p-5">
            <div className="text-sm font-semibold text-ink mb-3">Modo de operación</div>
            <div className="flex gap-6 text-sm">
              <div><span className="text-2xl font-bold text-ink">{isLoading ? '…' : m?.avanzado ?? 0}</span> <span className="text-muted">avanzado</span></div>
              <div><span className="text-2xl font-bold text-ink">{isLoading ? '…' : m?.basico ?? 0}</span> <span className="text-muted">básico</span></div>
            </div>
            <p className="text-xs text-muted mt-4">MRR / churn / LTV:CAC requieren el rollup de suscripciones (próxima iteración).</p>
          </div>
        </>
      )}
    </div>
  )
}
