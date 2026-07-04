import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, XCircle, Link2 } from 'lucide-react'
import { adminApi, type TicketPrioridad } from '@/lib/adminApi'
import { useAgent } from '@/auth/AgentContext'
import { canSee } from '@/config/permissions'

const fmtMoney = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString('es-AR') : '—')

export default function CustomerDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const agent = useAgent()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => adminApi.getCustomer(id),
  })

  const [ticketForm, setTicketForm] = useState<{ open: boolean; asunto: string; prioridad: TicketPrioridad; cuerpo: string }>({
    open: false, asunto: '', prioridad: 'media', cuerpo: '',
  })
  const crearTicket = useMutation({
    mutationFn: () => adminApi.createTicket({ tenantId: id, asunto: ticketForm.asunto, prioridad: ticketForm.prioridad, cuerpo: ticketForm.cuerpo }),
    onSuccess: () => {
      setTicketForm({ open: false, asunto: '', prioridad: 'media', cuerpo: '' })
      qc.invalidateQueries({ queryKey: ['customer', id] })
    },
  })

  const cancelarSub = useMutation({
    mutationFn: () => adminApi.cancelSubscription(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer', id] }),
  })

  // Linkear una suscripción MP huérfana por preapproval_id (activa en MP pero sin linkear
  // en la app — pasa cuando el checkout-return falló / MP no manda external_reference).
  const [linkForm, setLinkForm] = useState<{ open: boolean; preId: string }>({ open: false, preId: '' })
  const linkSub = useMutation({
    mutationFn: () => adminApi.linkSubscription(id, linkForm.preId.trim()),
    onSuccess: () => {
      setLinkForm({ open: false, preId: '' })
      qc.invalidateQueries({ queryKey: ['customer', id] })
    },
  })

  if (isLoading) return <div className="text-sm text-muted">Cargando…</div>
  if (isError) return <div className="text-sm text-danger">{(error as Error).message}</div>
  if (!data) return null
  const { tenant, stats, recent_sales } = data

  const statCards = [
    { label: 'Usuarios', value: stats.usuarios },
    { label: 'Sucursales', value: stats.sucursales },
    { label: 'Ventas (total)', value: stats.ventas_total },
    { label: 'Ventas (30d)', value: stats.ventas_30d },
    { label: 'Tickets abiertos', value: stats.tickets_abiertos },
  ]

  return (
    <div>
      <button onClick={() => navigate('/customers')} className="flex items-center gap-1 text-sm text-muted hover:text-ink mb-3">
        <ArrowLeft size={15} /> Clientes
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{tenant.nombre ?? '—'}</h1>
          <p className="text-sm text-muted mt-1">
            Alta {fmtDate(tenant.created_at)} · Modo {tenant.modo_operacion ?? '—'}
            {tenant.trial_ends_at && new Date(tenant.trial_ends_at) > new Date() ? ` · Trial hasta ${fmtDate(tenant.trial_ends_at)}` : ''}
            {tenant.subscription_status ? ` · Suscripción: ${tenant.subscription_status}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Cancelar suscripción — solo rol con módulo billing (admin/billing) y si no está ya cancelada.
              Cancela el preapproval en MP (fail-closed) vía admin-api → billing.cancel_subscription. */}
          {/* Linkear suscripción huérfana por preapproval_id — solo rol con módulo billing.
              La EF verifica contra MP (authorized + plan nuestro + no reclamada) antes de activar. */}
          {canSee(agent.rol, 'billing') && (
            <button
              onClick={() => setLinkForm(f => ({ ...f, open: !f.open }))}
              className="flex items-center gap-2 h-10 px-4 rounded-lg border border-outline text-sm font-semibold hover:bg-primary/10 disabled:opacity-50">
              <Link2 size={16} /> Linkear suscripción
            </button>
          )}
          {canSee(agent.rol, 'billing') && tenant.subscription_status !== 'cancelled' && (
            <button
              disabled={cancelarSub.isPending}
              onClick={() => {
                if (confirm(`¿Cancelar la suscripción de ${tenant.nombre ?? 'este cliente'}? Se cancela el cobro en Mercado Pago y la cuenta pasa a "cancelado".`)) {
                  cancelarSub.mutate()
                }
              }}
              className="flex items-center gap-2 h-10 px-4 rounded-lg border border-danger/40 text-danger text-sm font-semibold hover:bg-danger/10 disabled:opacity-50">
              <XCircle size={16} /> {cancelarSub.isPending ? 'Cancelando…' : 'Cancelar suscripción'}
            </button>
          )}
          <button onClick={() => setTicketForm(f => ({ ...f, open: !f.open }))}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600">
            <Plus size={16} /> Crear ticket
          </button>
        </div>
      </div>
      {cancelarSub.isError && <p className="text-sm text-danger mb-4">{(cancelarSub.error as Error).message}</p>}
      {cancelarSub.isSuccess && <p className="text-sm text-emerald-600 mb-4">Suscripción cancelada (MP + cuenta).</p>}

      {linkForm.open && (
        <div className="bg-surface rounded-xl shadow-card p-5 mb-6 space-y-3">
          <div className="text-sm font-semibold text-ink">Linkear suscripción de Mercado Pago</div>
          <p className="text-xs text-muted">
            Pegá el <strong>preapproval_id</strong> de la suscripción activa en MP (Suscriptores → Ver detalles).
            Se verifica que esté autorizada y sea de un plan nuestro, se cancela una anterior distinta (evita doble cobro) y se activa la cuenta.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input className="inp flex-1 font-mono" placeholder="preapproval_id (ej. b3b190925eb74d28…)"
              value={linkForm.preId} onChange={e => setLinkForm(f => ({ ...f, preId: e.target.value }))} />
            <button disabled={!linkForm.preId.trim() || linkSub.isPending}
              onClick={() => {
                if (confirm(`¿Linkear la suscripción ${linkForm.preId.trim()} a ${tenant.nombre ?? 'este cliente'} y activar la cuenta?`)) {
                  linkSub.mutate()
                }
              }}
              className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50">
              {linkSub.isPending ? 'Linkeando…' : 'Linkear y activar'}
            </button>
          </div>
          {linkSub.isError && <p className="text-sm text-danger">{(linkSub.error as Error).message}</p>}
          {linkSub.isSuccess && (
            <p className="text-sm text-emerald-600">
              Suscripción linkeada y cuenta activada ({linkSub.data.tier}).
              {linkSub.data.prev_cancel_error ? ' ⚠️ No se pudo cancelar una suscripción anterior — revisá el panel de MP.' : ''}
            </p>
          )}
        </div>
      )}

      {ticketForm.open && (
        <div className="bg-surface rounded-xl shadow-card p-5 mb-6 space-y-3">
          <div className="text-sm font-semibold text-ink">Nuevo ticket para {tenant.nombre}</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input className="inp sm:col-span-2" placeholder="Asunto" value={ticketForm.asunto}
              onChange={e => setTicketForm(f => ({ ...f, asunto: e.target.value }))} />
            <select className="inp" value={ticketForm.prioridad}
              onChange={e => setTicketForm(f => ({ ...f, prioridad: e.target.value as TicketPrioridad }))}>
              <option value="baja">Baja</option><option value="media">Media</option>
              <option value="alta">Alta</option><option value="urgente">Urgente</option>
            </select>
          </div>
          <textarea className="inp h-24 py-2" placeholder="Descripción inicial" value={ticketForm.cuerpo}
            onChange={e => setTicketForm(f => ({ ...f, cuerpo: e.target.value }))} />
          <div className="flex gap-2">
            <button disabled={!ticketForm.asunto || crearTicket.isPending} onClick={() => crearTicket.mutate()}
              className="h-9 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50">
              {crearTicket.isPending ? 'Creando…' : 'Crear'}
            </button>
            <button onClick={() => setTicketForm(f => ({ ...f, open: false }))} className="h-9 px-4 rounded-lg border border-outline text-sm">Cancelar</button>
          </div>
          {crearTicket.isError && <p className="text-sm text-danger">{(crearTicket.error as Error).message}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {statCards.map(c => (
          <div key={c.label} className="bg-surface rounded-xl shadow-card p-4">
            <div className="text-xs text-muted">{c.label}</div>
            <div className="text-xl font-bold text-ink mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-3 text-sm font-semibold text-ink border-b border-outline/30">
          Últimas ventas <span className="text-muted font-normal">(read-only · última {fmtDate(stats.ultima_venta_at)})</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-muted border-b border-outline/30">
              <th className="px-5 py-2">N°</th><th className="px-5 py-2">Total</th>
              <th className="px-5 py-2">Estado</th><th className="px-5 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {recent_sales.map((v, i) => (
              <tr key={i} className="border-b border-outline/20">
                <td className="px-5 py-2 text-ink">#{v.numero}</td>
                <td className="px-5 py-2 text-ink">{fmtMoney(v.total)}</td>
                <td className="px-5 py-2 text-muted">{v.estado}</td>
                <td className="px-5 py-2 text-muted">{fmtDate(v.created_at)}</td>
              </tr>
            ))}
            {recent_sales.length === 0 && <tr><td colSpan={4} className="px-5 py-6 text-center text-muted">Sin ventas</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
