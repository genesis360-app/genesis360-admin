import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { adminApi, type TicketEstado, type TicketPrioridad } from '@/lib/adminApi'

const ESTADOS: TicketEstado[] = ['abierto', 'en_progreso', 'esperando', 'resuelto', 'cerrado']
const PRIORIDADES: TicketPrioridad[] = ['baja', 'media', 'alta', 'urgente']
const PRIO_COLOR: Record<TicketPrioridad, string> = {
  baja: 'text-muted', media: 'text-ink', alta: 'text-orange-600', urgente: 'text-danger',
}
const fmt = (s: string) => new Date(s).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function SupportPage() {
  const qc = useQueryClient()
  const [filtro, setFiltro] = useState<string>('')         // estado
  // `?ticket=<id>` preselecciona: los links desde la ficha de un cliente tienen que ATERRIZAR en
  // el ticket, no dejar al agente buscándolo a mano en la lista.
  const [searchParams] = useSearchParams()
  const [sel, setSel] = useState<string | null>(searchParams.get('ticket'))  // ticketId seleccionado

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', filtro],
    queryFn: () => adminApi.listTickets(filtro ? { estado: filtro } : {}),
  })
  const tickets = data?.tickets ?? []

  return (
    <div>
      <PageHeader title="Soporte" subtitle="Tickets de los clientes (data real)" />

      <div className="flex gap-2 mb-4">
        <select value={filtro} onChange={e => setFiltro(e.target.value)} className="h-9 px-2 rounded-lg border border-outline bg-white text-sm">
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-4">
        {/* Lista */}
        <div className="bg-surface rounded-xl shadow-card overflow-hidden self-start">
          {isLoading ? <div className="p-5 text-sm text-muted">Cargando…</div> : (
            <div className="divide-y divide-outline/20">
              {tickets.map(t => (
                <button key={t.id} onClick={() => setSel(t.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-surface-low transition-colors ${sel === t.id ? 'bg-primary-50' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink text-sm truncate">{t.asunto}</span>
                    <span className={`text-xs font-semibold ${PRIO_COLOR[t.prioridad]}`}>{t.prioridad}</span>
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {t.tenants?.nombre ?? '—'} · <span className="capitalize">{t.estado.replace('_', ' ')}</span> · {fmt(t.updated_at)}
                  </div>
                </button>
              ))}
              {tickets.length === 0 && <div className="p-6 text-center text-sm text-muted">Sin tickets</div>}
            </div>
          )}
        </div>

        {/* Detalle */}
        <div>
          {sel ? <TicketDetail ticketId={sel} onChanged={() => qc.invalidateQueries({ queryKey: ['tickets'] })} />
            : <div className="bg-surface rounded-xl shadow-card p-10 text-center text-sm text-muted">Elegí un ticket para ver el hilo</div>}
        </div>
      </div>
    </div>
  )
}

function TicketDetail({ ticketId, onChanged }: { ticketId: string; onChanged: () => void }) {
  const qc = useQueryClient()
  const [reply, setReply] = useState('')
  const { data, isLoading } = useQuery({ queryKey: ['ticket', ticketId], queryFn: () => adminApi.getTicket(ticketId) })

  const refresh = () => { qc.invalidateQueries({ queryKey: ['ticket', ticketId] }); onChanged() }
  const responder = useMutation({ mutationFn: () => adminApi.replyTicket(ticketId, reply), onSuccess: () => { setReply(''); refresh() } })
  const actualizar = useMutation({
    mutationFn: (patch: { estado?: TicketEstado; prioridad?: TicketPrioridad }) => adminApi.updateTicket({ ticketId, ...patch }),
    onSuccess: refresh,
  })

  if (isLoading || !data) return <div className="bg-surface rounded-xl shadow-card p-6 text-sm text-muted">Cargando…</div>
  const { ticket, mensajes } = data

  return (
    <div className="bg-surface rounded-xl shadow-card flex flex-col">
      <div className="px-5 py-4 border-b border-outline/30">
        <div className="font-semibold text-ink">{ticket.asunto}</div>
        <div className="text-xs text-muted mt-0.5">{ticket.tenants?.nombre ?? '—'}</div>
        <div className="flex gap-2 mt-3">
          <select value={ticket.estado} onChange={e => actualizar.mutate({ estado: e.target.value as TicketEstado })}
            className="h-8 px-2 rounded-lg border border-outline bg-white text-xs">
            {ESTADOS.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
          </select>
          <select value={ticket.prioridad} onChange={e => actualizar.mutate({ prioridad: e.target.value as TicketPrioridad })}
            className="h-8 px-2 rounded-lg border border-outline bg-white text-xs">
            {PRIORIDADES.map(pr => <option key={pr} value={pr}>{pr}</option>)}
          </select>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3 max-h-[420px] overflow-auto">
        {mensajes.map(m => (
          <div key={m.id} className={`rounded-lg p-3 text-sm ${m.autor_tipo === 'agente' ? 'bg-primary-50 ml-6' : 'bg-surface-low mr-6'}`}>
            <div className="text-xs text-muted mb-1">{m.autor_tipo} · {fmt(m.created_at)}</div>
            <div className="text-ink whitespace-pre-wrap">{m.cuerpo}</div>
          </div>
        ))}
        {mensajes.length === 0 && <div className="text-sm text-muted text-center py-4">Sin mensajes todavía</div>}
      </div>

      <div className="px-5 py-4 border-t border-outline/30">
        <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Escribí una respuesta…"
          className="inp h-20 py-2 mb-2" />
        <button disabled={!reply.trim() || responder.isPending} onClick={() => responder.mutate()}
          className="h-9 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50">
          {responder.isPending ? 'Enviando…' : 'Responder'}
        </button>
      </div>
    </div>
  )
}
