import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, AlertTriangle, CalendarClock, Undo2, ShieldAlert } from 'lucide-react'
import { adminApi, AdminApiError, type DeletePreview, type PurgeResult } from '@/lib/adminApi'

/**
 * Baja de un negocio desde soporte. Segundo camino de la eliminación: el primero es el
 * self-service del propio dueño (Genesis360 → Mi cuenta), que siempre programa a 30 días.
 * Acá se puede además purgar en el acto.
 *
 * Todo el peso está en las salvaguardas, porque el DELETE es un CASCADE sobre ~140 FK y no
 * tiene vuelta atrás:
 *   • Solo rol `admin` (la EF lo re-valida: esto de acá es UX, no seguridad).
 *   • Hay que escribir el nombre exacto del negocio, igual que se le exige al dueño.
 *   • Comprobantes con CAE → la EF responde 409 y pide un segundo sí explícito.
 *   • La suscripción de Mercado Pago se cancela ANTES, fail-closed.
 */
export default function BajaTenantPanel({ tenantId, nombre }: { tenantId: string; nombre: string | null }) {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [confirmNombre, setConfirmNombre] = useState('')
  const [dias, setDias] = useState(30)
  const [borrarMails, setBorrarMails] = useState(false)
  const [confirmFiscal, setConfirmFiscal] = useState(false)
  const [pedirFiscal, setPedirFiscal] = useState(false)

  const { data, isLoading, isError, error } = useQuery<DeletePreview>({
    queryKey: ['tenant-delete-preview', tenantId],
    queryFn: () => adminApi.deletePreview(tenantId),
    enabled: abierto,
  })

  // Un 409 con `requiere_confirmacion_fiscal` no es un error a mostrar y listo: es la EF pidiendo
  // el segundo sí. Se levanta el checkbox para que el agente vea QUÉ está confirmando.
  const onError = (e: unknown) => {
    if (e instanceof AdminApiError && e.payload?.requiere_confirmacion_fiscal) setPedirFiscal(true)
  }
  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['tenant-delete-preview', tenantId] })
    qc.invalidateQueries({ queryKey: ['customer', tenantId] })
  }

  const programar = useMutation({
    mutationFn: () => adminApi.scheduleDelete({ tenantId, confirmNombre: confirmNombre.trim(), dias, confirmFiscal }),
    onSuccess: refrescar,
    onError,
  })
  const purgar = useMutation<PurgeResult>({
    mutationFn: () => adminApi.purgeNow({
      tenantId, confirmNombre: confirmNombre.trim(), confirmFiscal, borrarUsuariosAuth: borrarMails,
    }),
    onSuccess: refrescar,
    onError,
  })
  const cancelar = useMutation({
    mutationFn: () => adminApi.cancelDelete(tenantId),
    onSuccess: refrescar,
  })

  const nombreOk = confirmNombre.trim() === (nombre ?? '').trim() && !!nombre
  const enCurso = programar.isPending || purgar.isPending
  const conCae = data?.inventario.comprobantes_fiscales_con_cae ?? 0
  const fiscalPendiente = pedirFiscal && !confirmFiscal
  const programada = data?.tenant.delete_scheduled_at ?? null

  // Ya purgado: el tenant no existe más, no hay nada que mostrar salvo el resultado.
  if (purgar.isSuccess) {
    const r = purgar.data
    return (
      <div className="bg-surface rounded-xl shadow-card border border-danger/30 p-5 mt-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-danger mb-2">
          <Trash2 size={16} /> Negocio eliminado
        </div>
        <p className="text-sm text-ink">
          Se eliminó <strong>{r.purgado ?? nombre}</strong> y todos sus datos.
          {r.mp_cancelled > 0 && ` Se cancelaron ${r.mp_cancelled} suscripción(es) en Mercado Pago.`}
        </p>
        {r.auth_users_borrados.length > 0 && (
          <p className="text-xs text-muted mt-2">
            Mails liberados: {r.auth_users_borrados.map(u => u.email ?? u.id).join(', ')}
          </p>
        )}
        {r.auth_users_omitidos.length > 0 && (
          <p className="text-xs text-muted mt-1">
            No se borraron: {r.auth_users_omitidos.map(u => `${u.email ?? u.id} (${u.motivo})`).join(' · ')}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-xl shadow-card border border-danger/30 p-5 mt-6">
      <button onClick={() => setAbierto(a => !a)} className="flex items-center justify-between w-full">
        <span className="flex items-center gap-2 text-sm font-semibold text-danger">
          <ShieldAlert size={16} /> Zona de peligro — dar de baja el negocio
        </span>
        <span className="text-xs text-muted">{abierto ? 'Cerrar ▲' : 'Ver opciones ▼'}</span>
      </button>

      {abierto && (
        <div className="mt-4 space-y-4">
          {isLoading && <p className="text-sm text-muted">Calculando qué se perdería…</p>}
          {isError && <p className="text-sm text-danger">{(error as Error).message}</p>}

          {data && (
            <>
              {programada && (
                <div className="rounded-lg border border-amber-400/40 bg-amber-50 dark:bg-amber-900/10 p-3">
                  <p className="text-sm text-ink flex items-center gap-2">
                    <CalendarClock size={15} /> Baja ya programada para el{' '}
                    <strong>{new Date(programada).toLocaleDateString('es-AR')}</strong>
                  </p>
                  <button
                    disabled={cancelar.isPending}
                    onClick={() => cancelar.mutate()}
                    className="mt-2 flex items-center gap-2 h-9 px-3 rounded-lg border border-outline text-sm font-semibold hover:bg-primary/10 disabled:opacity-50">
                    <Undo2 size={15} /> {cancelar.isPending ? 'Cancelando…' : 'Cancelar la baja programada'}
                  </button>
                  {cancelar.isError && <p className="text-sm text-danger mt-2">{(cancelar.error as Error).message}</p>}
                </div>
              )}

              {/* Lo que se pierde. Es el dato que justifica la pantalla: sin esto el agente
                  confirma a ciegas. */}
              <div>
                <p className="text-xs font-semibold text-muted mb-2">Se eliminan definitivamente</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  {([
                    ['Ventas', data.inventario.ventas],
                    ['Productos', data.inventario.productos],
                    ['Clientes', data.inventario.clientes],
                    ['Movimientos', data.inventario.movimientos],
                    ['Usuarios', data.inventario.usuarios],
                    ['Sucursales', data.inventario.sucursales],
                    ['Gastos', data.inventario.gastos],
                  ] as const).map(([label, v]) => (
                    <div key={label} className="rounded-lg bg-primary/5 px-3 py-2">
                      <div className="text-xs text-muted">{label}</div>
                      <div className="font-semibold text-ink">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {conCae > 0 && (
                <div className="rounded-lg border border-danger/40 bg-danger/5 p-3">
                  <p className="text-sm text-danger font-semibold flex items-center gap-2">
                    <AlertTriangle size={15} /> {conCae} comprobante(s) con CAE informados a AFIP
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Es documentación fiscal con obligación de conservación. Si corresponde borrarla igual
                    (por ejemplo, un negocio de prueba que emitió en homologación), confirmalo explícitamente.
                  </p>
                  <label className="flex items-center gap-2 mt-2 text-sm text-ink">
                    <input type="checkbox" checked={confirmFiscal} onChange={e => setConfirmFiscal(e.target.checked)} />
                    Confirmo que se borren los comprobantes fiscales
                  </label>
                </div>
              )}

              {data.cobro_vivo && (
                <p className="text-xs text-muted">
                  Este negocio todavía puede generar cobros en Mercado Pago. Antes de dar de baja se cancela
                  la suscripción; si MP no confirma la cancelación, <strong>no se borra nada</strong>.
                </p>
              )}

              {data.cuentas.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted mb-1">Cuentas de acceso</p>
                  <ul className="text-sm text-ink space-y-0.5">
                    {data.cuentas.map(c => (
                      <li key={c.id}>
                        {c.email ?? c.id} <span className="text-muted text-xs">· {c.rol}</span>
                        {c.es_agente && <span className="text-xs text-amber-600"> · agente del panel (nunca se borra)</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Confirmación por nombre — misma barrera que la app le pone al dueño. */}
              <div>
                <label className="text-xs font-semibold text-muted">
                  Escribí <strong className="text-ink">{nombre}</strong> para confirmar
                </label>
                <input
                  className="inp w-full mt-1"
                  value={confirmNombre}
                  onChange={e => setConfirmNombre(e.target.value)}
                  placeholder={nombre ?? ''}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted">Programar en (días)</label>
                  <input type="number" min={0} className="inp w-28 mt-1" value={dias}
                    onChange={e => setDias(Math.max(0, Number(e.target.value)))} />
                </div>
                <button
                  disabled={!nombreOk || enCurso || fiscalPendiente || !!programada}
                  onClick={() => programar.mutate()}
                  className="flex items-center gap-2 h-10 px-4 rounded-lg border border-outline text-sm font-semibold hover:bg-primary/10 disabled:opacity-50">
                  <CalendarClock size={16} /> {programar.isPending ? 'Programando…' : 'Programar baja'}
                </button>
                <button
                  disabled={!nombreOk || enCurso || fiscalPendiente}
                  onClick={() => {
                    if (confirm(`Se va a ELIMINAR AHORA "${nombre}" y todos sus datos. Esta acción no se puede deshacer. ¿Confirmás?`)) {
                      purgar.mutate()
                    }
                  }}
                  className="flex items-center gap-2 h-10 px-4 rounded-lg bg-danger text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                  <Trash2 size={16} /> {purgar.isPending ? 'Eliminando…' : 'Eliminar ahora'}
                </button>
              </div>

              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={borrarMails} onChange={e => setBorrarMails(e.target.checked)} />
                Liberar también los mails (borra las cuentas de acceso). Solo aplica a “Eliminar ahora”.
              </label>

              {programar.isError && <p className="text-sm text-danger">{(programar.error as Error).message}</p>}
              {purgar.isError && <p className="text-sm text-danger">{(purgar.error as Error).message}</p>}
              {programar.isSuccess && (
                <p className="text-sm text-emerald-600">
                  Baja programada para el {new Date(programar.data.delete_scheduled_at).toLocaleDateString('es-AR')}.
                  {programar.data.aviso_mp ? ` ${programar.data.aviso_mp}` : ''}
                </p>
              )}
              {cancelar.isSuccess && <p className="text-sm text-emerald-600">Baja cancelada.</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
