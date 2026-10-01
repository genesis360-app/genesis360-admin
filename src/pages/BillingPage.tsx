import { useState, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { adminApi, type MedioPagoManual, type MpAlerta } from '@/lib/adminApi'

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')
const fecha = (s: string | null) => s ? new Date(s).toLocaleDateString('es-AR') : '—'

const TEXTO_ALERTA: Record<MpAlerta['tipo'], string> = {
  huerfana: 'MP cobra una suscripción sin negocio vinculado',
  drift_mp_cobra: 'MP cobra pero el negocio no tiene acceso',
  drift_acceso_gratis: 'Tiene acceso pero MP ya no cobra',
}

const MEDIOS: { value: MedioPagoManual; label: string }[] = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta_mp', label: 'Tarjeta (MP)' },
  { value: 'otro', label: 'Otro' },
]

export default function BillingPage() {
  const qc = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['billing'], queryFn: () => adminApi.billingOverview() })
  const { data: manualData } = useQuery({ queryKey: ['billing-manual'], queryFn: () => adminApi.listManualTenants() })
  const { data: facturasStats } = useQuery({ queryKey: ['billing-platform-facturas'], queryFn: () => adminApi.platformFacturasStats() })
  const { data: alertasData } = useQuery({ queryKey: ['billing-mp-alerts'], queryFn: () => adminApi.mpAlerts() })
  const [descartando, setDescartando] = useState<number | null>(null)
  const [notaDescarte, setNotaDescarte] = useState('')
  const descartar = useMutation({
    mutationFn: (id: number) => adminApi.discardMpAlert(id, notaDescarte.trim()),
    onSuccess: () => { setDescartando(null); setNotaDescarte(''); qc.invalidateQueries({ queryKey: ['billing-mp-alerts'] }); qc.invalidateQueries({ queryKey: ['metrics'] }) },
  })
  const alertas = alertasData?.alertas ?? []
  const alertasPendientes = alertas.filter(a => !a.descartada_at)

  const [registrando, setRegistrando] = useState<string | null>(null) // tenantId con el form abierto
  const [form, setForm] = useState({ monto: '', medio: 'transferencia' as MedioPagoManual, referencia: '', notas: '' })

  const registrarPago = useMutation({
    mutationFn: (tenantId: string) => adminApi.recordManualPayment({
      tenantId, monto: Number(form.monto), medio: form.medio,
      referencia: form.referencia || undefined, notas: form.notas || undefined,
    }),
    onSuccess: () => {
      setRegistrando(null)
      setForm({ monto: '', medio: 'transferencia', referencia: '', notas: '' })
      qc.invalidateQueries({ queryKey: ['billing-manual'] })
    },
  })

  const tenantsManuales = manualData?.tenants ?? []

  // Los vencidos primero y después por vencimiento más cercano: lo que hay que llamar hoy queda
  // arriba, sin depender de que alguien lea toda la tabla.
  const DIA = 86400000
  const vencimiento = (t: { manual_paid_until: string | null }) =>
    t.manual_paid_until ? new Date(t.manual_paid_until).getTime() : 0   // sin fecha = nunca pagó
  const manualesOrdenados = [...tenantsManuales].sort((a, b) => vencimiento(a) - vencimiento(b))
  const resumenManual = manualesOrdenados.reduce(
    (acc, t) => {
      const v = vencimiento(t)
      if (v < Date.now()) acc.vencidos++
      else if (v < Date.now() + 7 * DIA) acc.porVencer++
      return acc
    },
    { vencidos: 0, porVencer: 0 },
  )

  return (
    <div>
      <PageHeader title="Facturación" subtitle="Suscripciones, pagos manuales y facturación de plataforma" />
      {isError ? <div className="text-sm text-danger">{(error as Error).message}</div> : (
        <>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="bg-surface rounded-xl shadow-card p-5 max-w-xs">
              <div className="text-sm text-muted">MRR</div>
              <div className="text-3xl font-bold text-ink mt-1">{isLoading ? '…' : money(data?.mrr ?? 0)}</div>
            </div>
            {/* Facturado a Fede este año — vigilar el techo de Monotributo Categoría A */}
            <div className="bg-surface rounded-xl shadow-card p-5 max-w-xs">
              <div className="text-sm text-muted">Facturado a Fede (año actual)</div>
              <div className="text-3xl font-bold text-ink mt-1">
                {facturasStats ? money(facturasStats.facturado_anio_actual) : '…'}
              </div>
              <div className="text-xs text-muted mt-1">{facturasStats?.cantidad ?? 0} comprobantes · vigilar techo de categoría</div>
            </div>
          </div>

          <div className="bg-surface rounded-xl shadow-card overflow-hidden mb-6">
            <div className="px-5 py-3 text-sm font-semibold text-ink border-b border-outline/30">Por plan</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-muted border-b border-outline/30">
                  <th className="px-5 py-2">Plan</th><th className="px-5 py-2">Precio/mes</th>
                  <th className="px-5 py-2">Clientes</th><th className="px-5 py-2">Subtotal MRR</th>
                </tr>
              </thead>
              <tbody>
                {(data?.por_plan ?? []).map((p, i) => (
                  <tr key={i} className="border-b border-outline/20">
                    <td className="px-5 py-2 font-medium text-ink">{p.nombre}</td>
                    <td className="px-5 py-2 text-muted">{money(p.precio_mensual)}</td>
                    <td className="px-5 py-2 text-ink">{p.tenants}{p.sin_precio ? <span className="text-xs text-muted"> ({p.sin_precio} sin precio publicado)</span> : null}</td>
                    <td className="px-5 py-2 text-ink">{money(p.subtotal)}</td>
                  </tr>
                ))}
                {!isLoading && (data?.por_plan?.length ?? 0) === 0 && (
                  <tr><td colSpan={4} className="px-5 py-6 text-center text-muted">Sin planes con clientes</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Alertas de la reconciliación de Mercado Pago (cada hora). Antes solo llegaban por mail. */}
          <div className="bg-surface rounded-xl shadow-card overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-outline/30 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-ink">Alertas de cobro (Mercado Pago)</span>
              {alertasPendientes.length > 0
                ? <span className="text-xs font-semibold text-danger">{alertasPendientes.length} sin revisar</span>
                : <span className="text-xs text-muted">sin alertas pendientes</span>}
            </div>
            {alertas.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-muted border-b border-outline/30">
                    <th className="px-5 py-2">Qué pasa</th><th className="px-5 py-2">Negocio</th>
                    <th className="px-5 py-2">Suscripción MP</th><th className="px-5 py-2">Desde</th><th className="px-5 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {alertas.map(a => (
                    <Fragment key={a.id}>
                      <tr className={`border-b border-outline/20 ${a.descartada_at ? 'opacity-60' : ''}`}>
                        <td className="px-5 py-2 text-ink">{TEXTO_ALERTA[a.tipo]}</td>
                        <td className="px-5 py-2 text-muted">{a.tenant_nombre ?? '— sin negocio —'}</td>
                        <td className="px-5 py-2 font-mono text-xs text-muted">{a.preapproval_id}</td>
                        <td className="px-5 py-2 text-muted">{fecha(a.first_seen)}</td>
                        <td className="px-5 py-2 text-right">
                          {a.descartada_at
                            ? <span className="text-xs text-muted" title={a.nota ?? ''}>Descartada: {a.nota}</span>
                            : (
                              <button onClick={() => { setDescartando(descartando === a.id ? null : a.id); setNotaDescarte('') }}
                                className="h-8 px-3 rounded-lg border border-outline text-xs font-semibold text-muted hover:bg-primary/10">
                                Descartar
                              </button>
                            )}
                        </td>
                      </tr>
                      {descartando === a.id && (
                        <tr className="border-b border-outline/20 bg-surface-low">
                          <td colSpan={5} className="px-5 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <input value={notaDescarte} onChange={e => setNotaDescarte(e.target.value)}
                                placeholder="Por qué se descarta (ej. suscripción de prueba del equipo)"
                                className="flex-1 min-w-[260px] h-9 px-3 rounded-lg border border-outline bg-white text-sm" />
                              <button onClick={() => descartar.mutate(a.id)} disabled={!notaDescarte.trim() || descartar.isPending}
                                className="h-9 px-3 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-50">
                                {descartar.isPending ? 'Guardando…' : 'Confirmar'}
                              </button>
                            </div>
                            <p className="text-xs text-muted mt-2">
                              Una suscripción huérfana de un cliente real no se descarta: se vincula desde su ficha (Clientes → Vincular suscripción).
                            </p>
                            {descartar.isError && <p className="text-xs text-danger mt-1">{(descartar.error as Error).message}</p>}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagos manuales (billing_mode='manual') — plan aprobado 2026-07-08 */}
          <div className="bg-surface rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-outline/30 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-ink">Pagos manuales</span>
              {/* Antes había que escanear la columna de fechas para darse cuenta de quién dejó de
                  pagar. Es churn silencioso: si nadie mira, el cliente sigue usando la app gratis
                  o se va sin que nadie lo llame. */}
              {resumenManual.vencidos > 0 && (
                <span className="text-xs font-semibold text-danger">{resumenManual.vencidos} vencido{resumenManual.vencidos === 1 ? '' : 's'}</span>
              )}
              {resumenManual.porVencer > 0 && (
                <span className="text-xs font-semibold text-amber-600">{resumenManual.porVencer} vence{resumenManual.porVencer === 1 ? '' : 'n'} en ≤7 días</span>
              )}
              {resumenManual.vencidos === 0 && resumenManual.porVencer === 0 && tenantsManuales.length > 0 && (
                <span className="text-xs text-muted">todos al día</span>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-muted border-b border-outline/30">
                  <th className="px-5 py-2">Tenant</th><th className="px-5 py-2">Plan</th>
                  <th className="px-5 py-2">Monto/mes</th><th className="px-5 py-2">Pago hasta</th>
                  <th className="px-5 py-2">Estado</th><th className="px-5 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {manualesOrdenados.map(t => {
                  const vencido = t.manual_paid_until ? new Date(t.manual_paid_until) < new Date() : true
                  return (
                    <Fragment key={t.id}>
                      <tr className="border-b border-outline/20">
                        <td className="px-5 py-2 font-medium text-ink">{t.nombre}</td>
                        <td className="px-5 py-2 text-muted">{t.plan_tier}</td>
                        <td className="px-5 py-2 text-ink">{money(t.manual_monto_mensual ?? 0)}</td>
                        <td className={`px-5 py-2 ${vencido ? 'text-danger' : 'text-ink'}`}>{fecha(t.manual_paid_until)}</td>
                        <td className="px-5 py-2 text-muted">{t.subscription_status}</td>
                        <td className="px-5 py-2 text-right">
                          <button onClick={() => setRegistrando(registrando === t.id ? null : t.id)}
                            className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-600">
                            Registrar pago
                          </button>
                        </td>
                      </tr>
                      {registrando === t.id && (
                        <tr className="border-b border-outline/20 bg-outline/5">
                          <td colSpan={6} className="px-5 py-3">
                            <div className="flex flex-wrap items-end gap-3">
                              <label className="block"><span className="block text-xs text-muted mb-1">Monto</span>
                                <input className="inp" type="number" placeholder={String(t.manual_monto_mensual ?? '')}
                                  value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} /></label>
                              <label className="block"><span className="block text-xs text-muted mb-1">Medio</span>
                                <select className="inp" value={form.medio}
                                  onChange={e => setForm(f => ({ ...f, medio: e.target.value as MedioPagoManual }))}>
                                  {MEDIOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select></label>
                              <label className="block"><span className="block text-xs text-muted mb-1">Referencia</span>
                                <input className="inp" value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} /></label>
                              <label className="block"><span className="block text-xs text-muted mb-1">Notas</span>
                                <input className="inp" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} /></label>
                              <button disabled={!form.monto || registrarPago.isPending}
                                onClick={() => registrarPago.mutate(t.id)}
                                className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50">
                                {registrarPago.isPending ? 'Registrando…' : 'Confirmar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
                {(manualData && tenantsManuales.length === 0) && (
                  <tr><td colSpan={6} className="px-5 py-6 text-center text-muted">Sin tenants en pago manual</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted mt-3">El historial de pagos y cobros fallidos de la suscripción automática requiere la API de MercadoPago (próxima iteración).</p>
        </>
      )}
    </div>
  )
}
