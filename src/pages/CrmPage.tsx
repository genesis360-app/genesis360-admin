import { PageHeader, ComingSoon } from '@/components/PageHeader'

export default function CrmPage() {
  return (
    <div>
      <PageHeader title="CRM" subtitle="Pipeline comercial: Lead → Qualified → Demo → Trial → Won/Lost" />
      <ComingSoon fase="Fase 3 — pipeline Kanban de leads" />
    </div>
  )
}
