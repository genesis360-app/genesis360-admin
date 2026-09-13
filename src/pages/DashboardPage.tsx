import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { adminApi } from '@/lib/adminApi'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => adminApi.metricsOverview(),
  })
  const m = data?.metrics

  const cards = [
    { label: 'MRR', value: m ? '$' + Math.round(m.mrr).toLocaleString('es-AR') : undefined },
    { label: 'Clientes totales', value: m?.total },
    { label: 'Altas (30 días)', value: m?.altas30 },
    { label: 'En prueba', value: m?.enTrial },
    { label: 'Tickets abiertos', value: m?.ticketsAbiertos },
  ]

  /**
   * Lo que hay que MIRAR hoy, separado del tamaño del negocio.
   *
   * 🛑 "En prueba" cuenta solo las vigentes. El campo `subscription_status` se queda en 'trial'
   * para siempre aunque la fecha haya pasado: al 2026-09-12, 5 de los 6 "en trial" de PROD ya
   * estaban vencidos. Contarlos juntos infla el pipeline con gente que ya se fue.
   */
  const atencion = [
    { label: 'Prueba vence en ≤7 días', value: m?.trialPorVencer, tono: 'text-amber-600', filtro: 'trial_vigente' },
    { label: 'Prueba vencida sin convertir', value: m?.trialVencido, tono: 'text-danger', filtro: 'trial_vencido' },
    { label: 'Sin entrar hace +30 días', value: m?.sinActividad30, tono: 'text-amber-600', filtro: null },
    { label: 'Con baja programada', value: m?.bajasProgramadas, tono: 'text-danger', filtro: null },
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

          <div className="bg-surface rounded-xl shadow-card p-5 mb-6">
            <div className="text-sm font-semibold text-ink mb-3">Requiere atención</div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {atencion.map(a => (
                <button
                  key={a.label}
                  onClick={() => navigate('/customers')}
                  className="text-left rounded-lg border border-outline p-4 hover:bg-primary/5 transition-colors">
                  <div className={`text-2xl font-bold ${(a.value ?? 0) > 0 ? a.tono : 'text-ink'}`}>
                    {isLoading ? '…' : a.value ?? 0}
                  </div>
                  <div className="text-xs text-muted mt-1">{a.label}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-3">
              En Clientes podés filtrar por estado y buscar por el mail del dueño.
            </p>
          </div>

          <div className="bg-surface rounded-xl shadow-card p-5">
            <div className="text-sm font-semibold text-ink mb-3">Modo de operación</div>
            <div className="flex gap-6 text-sm">
              <div><span className="text-2xl font-bold text-ink">{isLoading ? '…' : m?.avanzado ?? 0}</span> <span className="text-muted">avanzado</span></div>
              <div><span className="text-2xl font-bold text-ink">{isLoading ? '…' : m?.basico ?? 0}</span> <span className="text-muted">básico</span></div>
            </div>
            <p className="text-xs text-muted mt-4">Churn y LTV:CAC requieren el rollup de suscripciones (próxima iteración).</p>
          </div>
        </>
      )}
    </div>
  )
}
