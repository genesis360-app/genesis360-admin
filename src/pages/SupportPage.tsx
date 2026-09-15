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
  // Mig 426 (repo Genesis360): la marca "pendiente del equipo" = el cliente escribió último desde la app.
  const [soloPendientes, setSoloPendientes] = useState(false)
  // `?ticket=<id>` preselecciona: los links desde la ficha de un cliente (y el mail de una consulta nueva) tienen que
  // ATERRIZAR en el ticket, no dejar al agente buscándolo a mano en la lista.
  const [searchParams] = useSearchParams()
  const [sel, setSel] = useState<string | null>(searchParams.get('ticket'))  // ticketId seleccionado

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', filtro, soloPendientes],
    queryFn: () => adminApi.listTickets({
      ...(filtro ? { estado: filtro } : {}),
      ...(soloPendientes ? { pendientes: true } : {}),
    }),
  })
  const tickets = data?.tickets ?? []
  const pendientes = tickets.filter(t => t.pendiente_equipo).length

  return (
    <div>
      <PageHeader title="Soporte" subtitle="Tickets de los clientes (data real)" />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select value={filtro} onChange={e => setFiltro(e.target.value)} className="h-9 px-2 rounded-lg border border-outline bg-white text-sm">
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={soloPendientes} onChange={e => setSoloPendientes(e.target.checked)} />
          Solo los que esperan respuesta del equipo
        </label>
        {!soloPendientes && pendientes > 0 && (
          <span className="text-xs font-semibold text-orange-600">{pendientes} esperan respuesta</span>
        )}
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
                  <div className="text-xs text-muted mt-0.5 flex flex-wrap items-center gap-x-2">
                    {t.pendiente_equipo && <span className="font-semibold text-orange-600">● Respuesta del cliente</span>}
                    <span>
                      {t.tenants?.nombre ?? '—'} · <span className="capitalize">{t.estado.replace('_', ' ')}</span> · {fmt(t.ultimo_mensaje_at ?? t.updated_at)}
                    </span>
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
  const [interno, setInterno] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['ticket', ticketId], queryFn: () => adminApi.getTicket(ticketId) })

  const refresh = () => { qc.invalidateQueries({ queryKey: ['ticket', ticketId] }); onChanged() }
  const responder = useMutation({
    mutationFn: (esNota: boolean) => adminApi.replyTicket(ticketId, reply, esNota),
    onSuccess: () => { setReply(''); setInterno(false); refresh() },
  })
  const actualizar = useMutation({
    mutationFn: (patch: { estado?: TicketEstado; prioridad?: TicketPrioridad }) => adminApi.updateTicket({ ticketId, ...patch }),
    onSuccess: refresh,
  })

  if (isLoading || !data) return <div className="bg-surface rounded-xl shadow-card p-6 text-sm text-muted">Cargando…</div>
  const { ticket, mensajes } = data
  // Mig 426: si el ticket lo abrió el cliente desde la app, todo lo que no sea nota interna le llega como notificación
  // y lo ve en Ayuda → Mis consultas. Un ticket abierto por el equipo es interno de punta a punta.
  const leLlegaAlCliente = !!ticket.usuario_id || mensajes.some(m => m.autor_tipo === 'cliente')
  const esNota = !leLlegaAlCliente || interno

  return (
    <div className="bg-surface rounded-xl shadow-card flex flex-col">
      <div className="px-5 py-4 border-b border-outline/30">
        <div className="font-semibold text-ink">{ticket.asunto}</div>
        <div className="text-xs text-muted mt-0.5">
          {ticket.tenants?.nombre ?? '—'}
          {ticket.reportante?.nombre_display ? ` · abrió ${ticket.reportante.nombre_display}${ticket.reportante.rol ? ` (${ticket.reportante.rol})` : ''}` : ''}
          {ticket.tipo ? ` · ${ticket.tipo}` : ''}
        </div>
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
          <div key={m.id} className={`rounded-lg p-3 text-sm ${
            m.interno ? 'bg-amber-50 border border-amber-200 ml-6'
              : m.autor_tipo === 'agente' ? 'bg-primary-50 ml-6' : 'bg-surface-low mr-6'}`}>
            <div className="text-xs text-muted mb-1">{m.interno ? 'nota interna' : m.autor_tipo} · {fmt(m.created_at)}</div>
            <div className="text-ink whitespace-pre-wrap">{m.cuerpo}</div>
            {(m.adjuntos?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-3 mt-2">
                {m.adjuntos!.map((a, i) => a.url
                  ? <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">📎 {a.nombre}</a>
                  : <span key={i} className="text-xs text-muted">📎 {a.nombre} (no disponible)</span>)}
              </div>
            )}
          </div>
        ))}
        {mensajes.length === 0 && <div className="text-sm text-muted text-center py-4">Sin mensajes todavía</div>}
      </div>

      <div className="px-5 py-4 border-t border-outline/30">
        <textarea value={reply} onChange={e => setReply(e.target.value)}
          placeholder={esNota ? 'Escribí una nota…' : 'Escribí la respuesta para el cliente…'}
          className="inp h-20 py-2 mb-2" />
        {leLlegaAlCliente && (
          <label className="flex items-center gap-2 text-xs text-ink mb-2">
            <input type="checkbox" checked={interno} onChange={e => setInterno(e.target.checked)} />
            Nota interna (el cliente no la ve ni recibe aviso)
          </label>
        )}
        <p className="text-xs text-muted mb-2">
          {!leLlegaAlCliente
            ? 'Ticket abierto por el equipo: el cliente no ve estos mensajes.'
            : esNota
              ? 'Queda solo para el equipo.'
              : 'Al cliente le llega como notificación en la app (hasta 500 caracteres) y la ve completa en Ayuda → Mis consultas.'}
        </p>
        <button disabled={!reply.trim() || responder.isPending} onClick={() => responder.mutate(esNota)}
          className="h-9 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50">
          {responder.isPending ? 'Enviando…' : esNota ? 'Guardar nota' : 'Responder al cliente'}
        </button>
      </div>
    </div>
  )
}
