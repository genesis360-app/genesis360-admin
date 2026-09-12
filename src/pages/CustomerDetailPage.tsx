import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, XCircle, Link2, CalendarPlus, KeyRound, Mail, Pin, Trash2, LifeBuoy, AlertTriangle } from 'lucide-react'
import { adminApi, type TicketPrioridad } from '@/lib/adminApi'
import { useAgent } from '@/auth/AgentContext'
import { canSee } from '@/config/permissions'
import BajaTenantPanel from '@/components/BajaTenantPanel'

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

  // Extender la prueba: la herramienta que más se pide en soporte ("se me venció mientras lo
  // estaba probando"). Hasta hoy había que hacerlo con SQL a mano contra PROD.
  const [diasTrial, setDiasTrial] = useState(15)
  const extenderTrial = useMutation({
    mutationFn: () => adminApi.extendTrial(id, diasTrial),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer', id] }),
  })
  const resetPass = useMutation({
    mutationFn: (email: string) => adminApi.resetPassword(id, email),
  })

  // Los tickets de ESTE cliente, acá. Antes había que ir a Soporte y filtrar a mano para ver el
  // historial de quien te está escribiendo.
  const { data: ticketsData } = useQuery({
    queryKey: ['customer-tickets', id],
    queryFn: () => adminApi.listTickets({ tenantId: id }),
  })

  const { data: actividadData } = useQuery({
    queryKey: ['customer-activity', id],
    queryFn: () => adminApi.customerActivity(id),
  })

  // Notas internas (mig 411).
  const { data: notasData } = useQuery({
    queryKey: ['customer-notes', id],
    queryFn: () => adminApi.listNotes(id),
  })
  const [notaTexto, setNotaTexto] = useState('')
  const [notaFijada, setNotaFijada] = useState(false)
  const refrescarNotas = () => qc.invalidateQueries({ queryKey: ['customer-notes', id] })
  const crearNota = useMutation({
    mutationFn: () => adminApi.createNote(id, notaTexto.trim(), notaFijada),
    onSuccess: () => { setNotaTexto(''); setNotaFijada(false); refrescarNotas() },
  })
  const borrarNota = useMutation({
    mutationFn: (noteId: string) => adminApi.deleteNote(noteId),
    onSuccess: refrescarNotas,
  })

  if (isLoading) return <div className="text-sm text-muted">Cargando…</div>
  if (isError) return <div className="text-sm text-danger">{(error as Error).message}</div>
  if (!data) return null
  const { tenant, stats, recent_sales, cuentas } = data
  const esAdmin = agent.rol === 'admin'
  const trialVencido = tenant.subscription_status === 'trial'
    && !!tenant.trial_ends_at && new Date(tenant.trial_ends_at) <= new Date()

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
            {trialVencido && tenant.trial_ends_at ? ` (venció el ${fmtDate(tenant.trial_ends_at)})` : ''}
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
          {esAdmin && tenant.subscription_status !== 'active' && (
            <div className="flex items-center gap-1">
              <input type="number" min={1} max={365} value={diasTrial}
                onChange={e => setDiasTrial(Math.max(1, Number(e.target.value)))}
                title="Días de prueba a agregar"
                className="w-16 h-10 px-2 rounded-lg border border-outline text-sm" />
              <button
                disabled={extenderTrial.isPending}
                onClick={() => extenderTrial.mutate()}
                className="flex items-center gap-2 h-10 px-4 rounded-lg border border-outline text-sm font-semibold hover:bg-primary/10 disabled:opacity-50">
                <CalendarPlus size={16} /> {extenderTrial.isPending ? 'Extendiendo…' : 'Extender prueba'}
              </button>
            </div>
          )}
          <button onClick={() => setTicketForm(f => ({ ...f, open: !f.open }))}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600">
            <Plus size={16} /> Crear ticket
          </button>
        </div>
      </div>
      {extenderTrial.isError && <p className="text-sm text-danger mb-4">{(extenderTrial.error as Error).message}</p>}
      {extenderTrial.isSuccess && (
        <p className="text-sm text-emerald-600 mb-4">
          Prueba extendida hasta el {fmtDate(extenderTrial.data.trial_ends_at)}.
        </p>
      )}
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

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Cuentas de acceso — lo que faltaba: quién entra, con qué mail y cuándo entró.
            Antes esta pantalla solo mostraba el CONTADOR de usuarios. */}
        <div className="bg-surface rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 text-sm font-semibold text-ink border-b border-outline/30">
            Cuentas de acceso
          </div>
          <div className="divide-y divide-outline/20">
            {cuentas.length === 0 && <div className="px-5 py-6 text-sm text-muted">Sin usuarios</div>}
            {cuentas.map(c => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-ink truncate flex items-center gap-2">
                    {c.email ?? c.id}
                    {!c.activo && <span className="text-xs text-muted">(inactivo)</span>}
                  </div>
                  <div className="text-xs text-muted">
                    {c.rol}{c.nombre_display ? ` · ${c.nombre_display}` : ''} · último acceso {c.ultimo_acceso ? fmtDate(c.ultimo_acceso) : 'nunca'}
                  </div>
                </div>
                {esAdmin && c.email && (
                  <button
                    title="Mandarle un mail para que se cree una contraseña nueva"
                    disabled={resetPass.isPending}
                    onClick={() => {
                      if (confirm(`¿Enviar un mail de recuperación de contraseña a ${c.email}?`)) resetPass.mutate(c.email!)
                    }}
                    className="shrink-0 flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-outline text-xs font-semibold hover:bg-primary/10 disabled:opacity-50">
                    <KeyRound size={13} /> Resetear
                  </button>
                )}
              </div>
            ))}
          </div>
          {resetPass.isError && <p className="px-5 py-2 text-sm text-danger">{(resetPass.error as Error).message}</p>}
          {resetPass.isSuccess && (
            <p className="px-5 py-2 text-sm text-emerald-600 flex items-center gap-1.5">
              <Mail size={13} /> Mail de recuperación enviado a {resetPass.data.email}.
            </p>
          )}
        </div>

        {/* Ficha + estado fiscal: "no puedo facturar" es de los reclamos más frecuentes y la
            respuesta casi siempre está en estos cuatro campos. */}
        <div className="bg-surface rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 text-sm font-semibold text-ink border-b border-outline/30">
            Ficha y estado fiscal
          </div>
          <dl className="px-5 py-3 text-sm grid grid-cols-2 gap-y-2">
            <dt className="text-muted">Plan</dt>
            <dd className="text-ink">{tenant.plan_tier ?? tenant.plan_id ?? 'Free'}{tenant.billing_mode === 'manual' ? ' · pago manual' : ''}</dd>
            <dt className="text-muted">Moneda</dt>
            <dd className="text-ink">{tenant.moneda ?? 'ARS'}</dd>
            <dt className="text-muted">Facturación</dt>
            <dd className="text-ink">
              {tenant.facturacion_habilitada
                ? `Habilitada${tenant.afip_produccion ? ' · producción' : ' · homologación'}`
                : 'Deshabilitada'}
            </dd>
            <dt className="text-muted">CUIT</dt>
            <dd className="text-ink">{tenant.cuit ?? '— sin cargar'}</dd>
            <dt className="text-muted">Condición IVA</dt>
            <dd className="text-ink">{tenant.condicion_iva_emisor ?? '— sin cargar'}</dd>
            <dt className="text-muted">Comprobantes con CAE</dt>
            <dd className="text-ink">{stats.comprobantes_con_cae}</dd>
            {tenant.delete_scheduled_at && (
              <>
                <dt className="text-danger">Baja programada</dt>
                <dd className="text-danger font-semibold">{fmtDate(tenant.delete_scheduled_at)}</dd>
              </>
            )}
          </dl>
          {!tenant.facturacion_habilitada && (!tenant.cuit || !tenant.condicion_iva_emisor) && (
            <p className="px-5 pb-3 text-xs text-muted">
              No puede facturar porque le falta {[!tenant.cuit && 'el CUIT', !tenant.condicion_iva_emisor && 'la condición de IVA'].filter(Boolean).join(' y ')}:
              la app bloquea habilitar la facturación sin esos datos (la condición de IVA decide si el comprobante sale A, B o C).
            </p>
          )}
        </div>
      </div>

      {/* Uso contra el límite del plan: distingue al cliente TRABADO (no puede sumar un usuario
          más) del que simplemente no usa la app. Desde afuera se ven igual y son dos
          conversaciones opuestas — una es soporte, la otra es venta. */}
      <div className="bg-surface rounded-xl shadow-card p-5 mb-6">
        <div className="text-sm font-semibold text-ink mb-3">Uso del plan</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {data.limites.map(l => {
            const sinLimite = l.limite === -1
            const pct = sinLimite ? 0 : Math.min(100, Math.round((l.usado / Math.max(1, l.limite)) * 100))
            const lleno = !sinLimite && l.usado >= l.limite
            return (
              <div key={l.dim}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted">{l.label}</span>
                  <span className={lleno ? 'text-danger font-semibold' : 'text-ink'}>
                    {l.usado}{sinLimite ? '' : ` / ${l.limite}`}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-outline/30 mt-1.5 overflow-hidden">
                  <div className={`h-full ${lleno ? 'bg-danger' : 'bg-primary'}`} style={{ width: `${sinLimite ? 0 : pct}%` }} />
                </div>
                {lleno && <div className="text-xs text-danger mt-1">Al tope: no puede dar de alta más</div>}
                {sinLimite && <div className="text-xs text-muted mt-1">Sin límite</div>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Notas internas — invisibles para el cliente (RLS sin policies, mig 411). */}
        <div className="bg-surface rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 text-sm font-semibold text-ink border-b border-outline/30">
            Notas internas <span className="font-normal text-muted">(el cliente no las ve)</span>
          </div>
          <div className="p-4 space-y-2">
            <textarea
              value={notaTexto} onChange={e => setNotaTexto(e.target.value)}
              placeholder="Ej: llamó por la impresora fiscal, pidió que lo llamemos el lunes"
              className="inp w-full h-20 py-2" />
            <div className="flex items-center gap-3">
              <button disabled={!notaTexto.trim() || crearNota.isPending} onClick={() => crearNota.mutate()}
                className="h-9 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50">
                {crearNota.isPending ? 'Guardando…' : 'Agregar nota'}
              </button>
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input type="checkbox" checked={notaFijada} onChange={e => setNotaFijada(e.target.checked)} />
                Fijar arriba
              </label>
            </div>
            {crearNota.isError && <p className="text-sm text-danger">{(crearNota.error as Error).message}</p>}
          </div>
          <div className="divide-y divide-outline/20 max-h-72 overflow-y-auto">
            {(notasData?.notes ?? []).map(n => (
              <div key={n.id} className="px-5 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-ink whitespace-pre-wrap break-words">{n.cuerpo}</p>
                  <p className="text-xs text-muted mt-1 flex items-center gap-1">
                    {n.fijada && <Pin size={11} className="text-primary" />}
                    {n.agent_email ?? '—'} · {new Date(n.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
                <button title="Borrar nota" onClick={() => { if (confirm('¿Borrar esta nota?')) borrarNota.mutate(n.id) }}
                  className="shrink-0 text-muted hover:text-danger">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {(notasData?.notes ?? []).length === 0 && (
              <div className="px-5 py-6 text-sm text-muted">Sin notas todavía</div>
            )}
          </div>
          {borrarNota.isError && <p className="px-5 py-2 text-sm text-danger">{(borrarNota.error as Error).message}</p>}
        </div>

        {/* Tickets de este cliente */}
        <div className="bg-surface rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 text-sm font-semibold text-ink border-b border-outline/30 flex items-center gap-2">
            <LifeBuoy size={15} /> Tickets de este cliente
          </div>
          <div className="divide-y divide-outline/20 max-h-96 overflow-y-auto">
            {(ticketsData?.tickets ?? []).map(t => (
              <button key={t.id} onClick={() => navigate(`/support?ticket=${t.id}`)}
                className="w-full text-left px-5 py-3 hover:bg-surface-low transition-colors">
                <div className="text-ink truncate">{t.asunto}</div>
                <div className="text-xs text-muted">
                  {t.estado} · {t.prioridad} · {fmtDate(t.updated_at)}
                </div>
              </button>
            ))}
            {(ticketsData?.tickets ?? []).length === 0 && (
              <div className="px-5 py-6 text-sm text-muted">Sin tickets</div>
            )}
          </div>
        </div>
      </div>

      {/* 🛑 Notas de crédito que AFIP rechazó y siguen sin resolverse. La devolución ya ocurrió y
          el comprobante que la respalda no existe: si hay una acá, es lo primero a mirar. */}
      {(actividadData?.afip_pendientes ?? []).length > 0 && (
        <div className="bg-surface rounded-xl shadow-card border border-danger/30 p-5 mb-6">
          <div className="text-sm font-semibold text-danger mb-2 flex items-center gap-2">
            <AlertTriangle size={15} /> Notas de crédito sin emitir en AFIP
          </div>
          <div className="space-y-2">
            {(actividadData?.afip_pendientes ?? []).map(n => (
              <div key={n.id} className="text-sm">
                <div className="text-ink">
                  {n.tipo_comprobante ?? 'NC'} · {n.intentos} intento{n.intentos === 1 ? '' : 's'}
                  {n.requiere_reconciliacion_manual && (
                    <span className="ml-2 text-xs font-semibold text-danger">requiere reconciliación manual</span>
                  )}
                </div>
                <div className="text-xs text-muted break-words">{n.ultimo_error ?? 'sin detalle'} · {fmtDate(n.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline: responde "¿qué hizo antes de que se rompiera?" */}
      <div className="bg-surface rounded-xl shadow-card overflow-hidden mb-6">
        <div className="px-5 py-3 text-sm font-semibold text-ink border-b border-outline/30">
          Actividad reciente <span className="font-normal text-muted">(últimas 50 acciones)</span>
        </div>
        <div className="divide-y divide-outline/20 max-h-80 overflow-y-auto">
          {(actividadData?.actividad ?? []).map(a => (
            <div key={a.id} className="px-5 py-2.5 text-sm">
              <span className="text-ink">
                {a.usuario_nombre ?? 'alguien'} <span className="text-muted">{a.accion ?? ''}</span> {a.entidad ?? ''}
                {a.entidad_nombre ? ` "${a.entidad_nombre}"` : ''}
              </span>
              {a.campo && (
                <span className="text-xs text-muted"> · {a.campo}: {a.valor_anterior ?? '—'} → {a.valor_nuevo ?? '—'}</span>
              )}
              <span className="text-xs text-muted"> · {new Date(a.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
          ))}
          {(actividadData?.actividad ?? []).length === 0 && (
            <div className="px-5 py-6 text-sm text-muted">Sin actividad registrada</div>
          )}
        </div>
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

      {/* Baja del negocio: SOLO rol admin. `customers` lo tiene también `support`, y borrar un
          negocio entero no es una tarea de soporte — la EF exige `admin` igual, esto es UX. */}
      {agent.rol === 'admin' && <BajaTenantPanel tenantId={id} nombre={tenant.nombre} />}
    </div>
  )
}
