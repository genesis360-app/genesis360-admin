import { PageHeader } from '@/components/PageHeader'

// Valores de muestra (del diseño Stitch). Se reemplazan por el rollup real (MRR/churn)
// vía la EF `admin-api` action `metrics.overview` en la Fase 2.
const KPIS = [
  { label: 'MRR', value: '$45.200', delta: '+12%', tone: 'accent' as const },
  { label: 'Clientes activos', value: '1.240', delta: '+5%', tone: 'accent' as const },
  { label: 'Churn', value: '2,4%', delta: '-0,5%', tone: 'accent' as const },
  { label: 'LTV:CAC', value: '4,2x', delta: 'estable', tone: 'muted' as const },
]

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Salud del negocio · datos de muestra (rollup real en Fase 2)" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {KPIS.map(k => (
          <div key={k.label} className="bg-surface rounded-xl shadow-card p-5">
            <div className="text-sm text-muted">{k.label}</div>
            <div className="text-2xl font-bold text-ink mt-1">{k.value}</div>
            <div className={`text-xs mt-1 ${k.tone === 'accent' ? 'text-accent-600' : 'text-muted'}`}>{k.delta}</div>
          </div>
        ))}
      </div>
      <div className="bg-surface rounded-xl shadow-card p-5">
        <div className="text-sm font-semibold text-ink mb-4">Revenue (últimos 6 meses)</div>
        <div className="h-48 grid place-items-center text-muted text-sm border border-dashed border-outline rounded-lg">
          Gráfico de ingresos — pendiente (Fase 2)
        </div>
      </div>
    </div>
  )
}
