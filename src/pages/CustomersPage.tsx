import { PageHeader, ComingSoon } from '@/components/PageHeader'

export default function CustomersPage() {
  return (
    <div>
      <PageHeader title="Clientes" subtitle="Salud por tenant, uso vs. plan, tickets abiertos e impersonación read-only" />
      <ComingSoon fase="Fase 1 — lista de tenants + Vista por Cliente (data real vía admin-api) + Ver como cliente" />
    </div>
  )
}
