import { PageHeader } from '@/components/PageHeader'

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeader title="Analytics" subtitle="CAC por canal · Meta Pixel / GA4" />
      <div className="rounded-xl border border-dashed border-outline bg-surface/60 p-8 max-w-2xl">
        <p className="text-sm text-ink font-medium mb-2">Pendiente — requiere integraciones externas</p>
        <p className="text-sm text-muted leading-relaxed">
          El análisis de marketing (CAC por canal, conversión) necesita conectar <b>Meta Pixel</b> y
          <b> Google Analytics 4</b>: cuentas, IDs de medición y tokens de API. Igual que las
          integraciones de couriers, queda bloqueado hasta tener esas credenciales.
        </p>
        <ul className="text-sm text-muted mt-3 list-disc pl-5 space-y-1">
          <li>GA4: Measurement ID + Data API (service account).</li>
          <li>Meta: Pixel ID + token de la Marketing API.</li>
          <li>Una tabla <code>marketing_events</code> para correlacionar gasto ↔ altas.</li>
        </ul>
      </div>
    </div>
  )
}
