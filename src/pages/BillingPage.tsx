import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { adminApi } from '@/lib/adminApi'

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

export default function BillingPage() {
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['billing'], queryFn: () => adminApi.billingOverview() })

  return (
    <div>
      <PageHeader title="Facturación" subtitle="Suscripciones y MRR (data real de planes)" />
      {isError ? <div className="text-sm text-danger">{(error as Error).message}</div> : (
        <>
          <div className="bg-surface rounded-xl shadow-card p-5 mb-6 max-w-xs">
            <div className="text-sm text-muted">MRR</div>
            <div className="text-3xl font-bold text-ink mt-1">{isLoading ? '…' : money(data?.mrr ?? 0)}</div>
          </div>

          <div className="bg-surface rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-3 text-sm font-semibold text-ink border-b border-outline/30">Por plan</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-muted border-b border-outline/30">
                  <th className="px-5 py-2">Plan</th><th className="px-5 py-2">Precio/mes</th>
                  <th className="px-5 py-2">Clientes</th><th className="px-5 py-2">Subtotal MRR</th>
                </tr>
              </thead>
              <tbody>
                {(data?.por_plan ?? []).map((p, i) => (
                  <tr key={i} className="border-b border-outline/20">
                    <td className="px-5 py-2 font-medium text-ink">{p.nombre}</td>
                    <td className="px-5 py-2 text-muted">{money(p.precio_mensual)}</td>
                    <td className="px-5 py-2 text-ink">{p.tenants}</td>
                    <td className="px-5 py-2 text-ink">{money(p.subtotal)}</td>
                  </tr>
                ))}
                {!isLoading && (data?.por_plan?.length ?? 0) === 0 && (
                  <tr><td colSpan={4} className="px-5 py-6 text-center text-muted">Sin planes con clientes</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted mt-3">El historial de pagos y cobros fallidos requiere la API de MercadoPago (próxima iteración).</p>
        </>
      )}
    </div>
  )
}
