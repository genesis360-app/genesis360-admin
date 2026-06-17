import { PageHeader, ComingSoon } from '@/components/PageHeader'

export default function BillingPage() {
  return (
    <div>
      <PageHeader title="Facturación" subtitle="MercadoPago: pagos fallidos y próximos cobros" />
      <ComingSoon fase="Fase 3 — billing (reusa mp-webhook / suscripciones)" />
    </div>
  )
}
