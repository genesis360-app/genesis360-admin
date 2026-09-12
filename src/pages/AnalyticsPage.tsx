import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { adminApi } from '@/lib/adminApi'

/**
 * Analytics con los datos que SÍ tenemos.
 *
 * El PRD pedía "CAC por canal · Meta Pixel / GA4", pero el CAC necesita la inversión publicitaria
 * y hoy eso no está cargado en ningún lado. Mostrar un CAC inventado sería peor que no mostrarlo:
 * es un número sobre el que se toman decisiones de plata. Así que acá va el embudo real —altas,
 * conversión a pago, churn y origen de los leads— y se dice qué falta para el CAC.
 */
export default function AnalyticsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => adminApi.analyticsOverview(),
  })

  const meses = data?.meses ?? []
  const maxAltas = Math.max(1, ...meses.map(m => m.altas))
  const e = data?.embudo
  const tasa = e && e.total > 0 ? Math.round((e.pagaron / e.total) * 100) : 0

  if (isError) return <div className="text-sm text-danger">{(error as Error).message}</div>

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Altas, conversión y origen de los leads (data real)" />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Negocios creados', value: e?.total },
          { label: 'Alguna vez pagaron', value: e?.pagaron },
          { label: 'Suscripción activa', value: e?.activos },
          { label: 'Cancelados', value: e?.cancelados },
        ].map(c => (
          <div key={c.label} className="bg-surface rounded-xl shadow-card p-5">
            <div className="text-sm text-muted">{c.label}</div>
            <div className="text-2xl font-bold text-ink mt-1">{isLoading ? '…' : c.value ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface rounded-xl shadow-card p-5 mb-6">
        <div className="flex items-baseline justify-between mb-4">
          <span className="text-sm font-semibold text-ink">Altas por mes</span>
          <span className="text-sm text-muted">
            Conversión a pago: <strong className="text-ink">{tasa}%</strong>
          </span>
        </div>
        {isLoading ? <div className="text-sm text-muted">Cargando…</div> : (
          <div className="flex items-end gap-2 h-40">
            {meses.map(m => (
              <div key={m.mes} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${m.altas} altas · ${m.convirtieron} pagaron`}>
                <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
                  {/* La parte llena son los que terminaron pagando: la diferencia con la barra
                      completa es exactamente lo que se pierde en el camino. */}
                  <div className="w-full bg-primary/25 rounded-t" style={{ height: `${(m.altas / maxAltas) * 100}%` }}>
                    <div className="w-full bg-primary rounded-t"
                      style={{ height: m.altas ? `${(m.convirtieron / m.altas) * 100}%` : '0%' }} />
                  </div>
                </div>
                <span className="text-[10px] text-muted">{m.mes.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted mt-3">
          Barra clara: altas del mes. Parte llena: cuántas terminaron pagando alguna vez.
        </p>
      </div>

      <div className="bg-surface rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-3 text-sm font-semibold text-ink border-b border-outline/30">Leads por origen</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-muted border-b border-outline/30">
              <th className="px-5 py-2">Origen</th><th className="px-5 py-2">Leads</th>
              <th className="px-5 py-2">Ganados</th><th className="px-5 py-2">Perdidos</th>
              <th className="px-5 py-2">Valor estimado</th>
            </tr>
          </thead>
          <tbody>
            {(data?.por_origen ?? []).map(o => (
              <tr key={o.origen} className="border-b border-outline/20">
                <td className="px-5 py-2 text-ink">{o.origen}</td>
                <td className="px-5 py-2 text-muted">{o.leads}</td>
                <td className="px-5 py-2 text-emerald-600">{o.ganados}</td>
                <td className="px-5 py-2 text-muted">{o.perdidos}</td>
                <td className="px-5 py-2 text-ink">${Math.round(o.valor).toLocaleString('es-AR')}</td>
              </tr>
            ))}
            {(data?.por_origen ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">Todavía no hay leads cargados en el CRM</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted mt-4">
        El <strong>CAC por canal</strong> necesita la inversión publicitaria de cada canal, que hoy no
        está cargada en ningún lado. Mientras tanto no se muestra: un CAC inventado es peor que no
        tenerlo, porque se toman decisiones de plata sobre él.
      </p>
    </div>
  )
}
