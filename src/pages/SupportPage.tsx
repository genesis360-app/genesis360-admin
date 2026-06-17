import { PageHeader, ComingSoon } from '@/components/PageHeader'

export default function SupportPage() {
  return (
    <div>
      <PageHeader title="Soporte" subtitle="Tickets con prioridad, asignación y chat" />
      <ComingSoon fase="Fase 1/2 — tickets (support_tickets / support_messages) + chat" />
    </div>
  )
}
