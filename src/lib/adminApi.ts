import { supabase } from './supabase'
import type { Agent, Rol } from '@/config/permissions'

/**
 * Capa de datos del panel. TODO el acceso cross-tenant pasa por la Edge Function
 * `admin-api` (service_role), que valida agente + AUTORIZA por rol + audita.
 */
export class AdminApiError extends Error {
  /** Cuerpo completo de la respuesta de la EF. Algunas acciones mandan datos junto al error
      (p.ej. `requiere_confirmacion_fiscal` al dar de baja un negocio con comprobantes con CAE),
      y la UI los necesita para pedir el segundo sí explícito en vez de solo mostrar el texto. */
  payload: Record<string, unknown>
  constructor(message: string, payload: Record<string, unknown> = {}) {
    super(message)
    this.name = 'AdminApiError'
    this.payload = payload
  }
}

export async function callAdminApi<T = unknown>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-api', { body: { action, ...payload } })
  if (error) {
    let msg = error.message
    let body: Record<string, unknown> = {}
    try {
      const ctx = await (error as any).context?.json?.()
      if (ctx && typeof ctx === 'object') body = ctx
      if (ctx?.error) msg = ctx.error
    } catch { /* noop */ }
    throw new AdminApiError(msg, body)
  }
  return data as T
}

// ── Tipos ──
/** Fila de la lista de clientes (RPC `fn_admin_tenants_overview`, mig 410). */
export interface CustomerRow {
  id: string
  nombre: string | null
  created_at: string
  subscription_status: string | null
  trial_ends_at: string | null
  plan_tier: string | null
  billing_mode: string | null
  modo_operacion: string | null
  pais: string | null
  tipo_comercio: string | null
  delete_scheduled_at: string | null
  /** El DUEÑO más antiguo del negocio — el que lo creó. */
  dueno_nombre: string | null
  dueno_email: string | null
  usuarios: number
  ultimo_acceso: string | null
}

/** Una cuenta de acceso de un negocio (RPC `fn_admin_tenant_cuentas`, mig 410). */
export interface CuentaTenant {
  id: string
  email: string | null
  rol: string
  nombre_display: string | null
  activo: boolean
  created_at: string
  ultimo_acceso: string | null
  /** Agente del panel de soporte: comparte el pool de `auth.users` con los clientes. */
  es_agente: boolean
}

/** Uso contra el límite del plan. `limite === -1` = sin límite (enterprise). */
export interface LimitePlan { dim: string; label: string; usado: number; limite: number }

export interface ActividadEntry {
  id: string
  usuario_nombre: string | null
  entidad: string | null
  entidad_nombre: string | null
  accion: string | null
  campo: string | null
  valor_anterior: string | null
  valor_nuevo: string | null
  pagina: string | null
  created_at: string
}

/** Nota de crédito que no se pudo emitir en AFIP y sigue sin resolverse. */
export interface AfipPendiente {
  id: string
  venta_id: string | null
  tipo_comprobante: string | null
  intentos: number
  ultimo_error: string | null
  requiere_reconciliacion_manual: boolean
  created_at: string
}

/** Nota interna del equipo sobre un cliente (mig 411). Invisible para el cliente. */
export interface NotaCliente {
  id: string
  cuerpo: string
  fijada: boolean
  agent_email: string | null
  created_at: string
}

export interface AnalyticsOverview {
  meses: { mes: string; altas: number; convirtieron: number }[]
  embudo: { total: number; pagaron: number; activos: number; cancelados: number }
  por_origen: { origen: string; leads: number; ganados: number; perdidos: number; valor: number }[]
}

export interface AuditEntry {
  id: string
  agent_email: string | null
  action: string
  target_tenant_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  tenants?: { nombre: string | null } | null
}
export interface Metrics {
  total: number; altas30: number; enTrial: number; ticketsAbiertos: number; basico: number; avanzado: number; mrr: number
  /** Lo que requiere atención hoy. `enTrial` cuenta SOLO las pruebas vigentes: el campo
      `subscription_status` se queda en 'trial' aunque la fecha haya pasado. */
  trialPorVencer: number; trialVencido: number; bajasProgramadas: number; sinActividad30: number
}
export interface PlanRow { nombre: string; precio_mensual: number; tenants: number; subtotal: number }
export type LeadEstado = 'lead' | 'qualified' | 'demo' | 'trial' | 'won' | 'lost'
export interface Lead {
  id: string; nombre: string; empresa: string | null; email: string | null; telefono: string | null
  estado: LeadEstado; valor_estimado: number | null; origen: string | null; created_at: string; updated_at: string
}
export interface CustomerDetail {
  tenant: {
    id: string; nombre: string | null; plan_id: string | null; plan_tier: string | null
    billing_mode: string | null; modo_operacion: string | null
    created_at: string; trial_ends_at: string | null; inicio_actividades: string | null
    subscription_status: string | null; subscription_period_end: string | null
    delete_scheduled_at: string | null
    pais: string | null; tipo_comercio: string | null; moneda: string | null; telefono: string | null
    mp_subscription_id: string | null
    // Estado fiscal: lo primero que se pregunta cuando un cliente "no puede facturar".
    cuit: string | null; condicion_iva_emisor: string | null; razon_social_fiscal: string | null
    facturacion_habilitada: boolean | null; afip_produccion: boolean | null; afip_provider: string | null
  }
  stats: {
    usuarios: number; sucursales: number; ventas_total: number; ventas_30d: number
    tickets_abiertos: number; ultima_venta_at: string | null; comprobantes_con_cae: number
  }
  limites: LimitePlan[]
  cuentas: CuentaTenant[]
  recent_sales: { numero: number; total: number; estado: string; created_at: string }[]
}
export type TicketEstado = 'abierto' | 'en_progreso' | 'esperando' | 'resuelto' | 'cerrado'
export type TicketPrioridad = 'baja' | 'media' | 'alta' | 'urgente'
export interface TicketRow {
  id: string; asunto: string; estado: TicketEstado; prioridad: TicketPrioridad
  asignado_a: string | null; tenant_id: string; created_at: string; updated_at: string
  tenants?: { nombre: string | null } | null
}
export interface TicketMensaje { id: string; autor_tipo: string; autor_id: string | null; cuerpo: string; created_at: string }
export interface TicketDetail { ticket: TicketRow & Record<string, unknown>; mensajes: TicketMensaje[] }

export type MedioPagoManual = 'transferencia' | 'efectivo' | 'tarjeta_mp' | 'otro'
export interface ManualTenantRow {
  id: string; nombre: string | null; plan_tier: string | null; subscription_status: string
  manual_monto_mensual: number | null; manual_paid_until: string | null
}
export interface ManualPagoRow {
  id: string; monto: number; medio: MedioPagoManual; referencia: string | null
  periodo_desde: string; periodo_hasta: string; registrado_por: string | null
  mp_payment_id: string | null; notas: string | null; created_at: string
}

/** Qué se pierde si se borra el negocio. La foto se toma ANTES del DELETE: después del
    CASCADE (~140 FK) no queda nada que contar. */
export interface InventarioTenant {
  usuarios: number; sucursales: number; ventas: number; productos: number
  clientes: number; gastos: number; movimientos: number
  comprobantes_fiscales_con_cae: number
}
export interface CuentaAuth {
  id: string; rol: string; nombre: string | null; email: string | null
  /** Agente del panel de soporte: vive en el mismo pool de auth y NUNCA se borra por arrastre. */
  es_agente: boolean
}
export interface DeletePreview {
  tenant: { id: string; nombre: string | null; subscription_status: string | null; delete_scheduled_at: string | null }
  inventario: InventarioTenant
  cuentas: CuentaAuth[]
  /** El negocio todavía puede generar cobros en Mercado Pago. */
  cobro_vivo: boolean
}
export interface PurgeResult {
  ok: true; purgado: string | null; inventario: InventarioTenant; mp_cancelled: number
  auth_users_borrados: { id: string; email: string | null }[]
  auth_users_omitidos: { id: string; email: string | null; motivo: string }[]
}

export const adminApi = {
  whoami: () => callAdminApi<{ agent: Agent }>('auth.whoami'),
  changePassword: (password: string) => callAdminApi<{ ok: true }>('auth.change_password', { password }),
  metricsOverview: () => callAdminApi<{ metrics: Metrics }>('metrics.overview'),

  listCustomers: (q?: string) => callAdminApi<{ customers: CustomerRow[] }>('customers.list', { q }),
  getCustomer: (tenantId: string) => callAdminApi<CustomerDetail>('customers.get', { tenantId }),

  // Herramientas de soporte sobre un cliente (solo rol admin; la EF lo re-valida).
  extendTrial: (tenantId: string, dias: number) =>
    callAdminApi<{ ok: true; trial_ends_at: string }>('customers.extend_trial', { tenantId, dias }),
  resetPassword: (tenantId: string, email: string) =>
    callAdminApi<{ ok: true; email: string }>('customers.reset_password', { tenantId, email }),

  // Qué hizo el cliente últimamente y qué se le está rompiendo.
  customerActivity: (tenantId: string) =>
    callAdminApi<{ actividad: ActividadEntry[]; afip_pendientes: AfipPendiente[] }>('customers.activity', { tenantId }),

  // Notas internas sobre el cliente (mig 411). Un ticket es un problema con estado; una nota es
  // contexto compartido entre agentes.
  listNotes: (tenantId: string) => callAdminApi<{ notes: NotaCliente[] }>('customers.notes.list', { tenantId }),
  createNote: (tenantId: string, cuerpo: string, fijada = false) =>
    callAdminApi<{ ok: true; id: string }>('customers.notes.create', { tenantId, cuerpo, fijada }),
  deleteNote: (noteId: string) => callAdminApi<{ ok: true }>('customers.notes.delete', { noteId }),

  // El registro de lo que hizo el equipo. La tabla se escribía desde la mig 221 y no había
  // ninguna pantalla para leerla.
  listAudit: (f: { tenantId?: string; agentEmail?: string; action?: string; limit?: number } = {}) =>
    callAdminApi<{ entries: AuditEntry[] }>('audit.list', f),

  listTickets: (f: { estado?: string; tenantId?: string; asignadoA?: 'me' } = {}) =>
    callAdminApi<{ tickets: TicketRow[] }>('support.tickets.list', f),
  getTicket: (ticketId: string) => callAdminApi<TicketDetail>('support.tickets.get', { ticketId }),
  createTicket: (a: { tenantId: string; asunto: string; prioridad?: TicketPrioridad; cuerpo?: string }) =>
    callAdminApi<{ ok: true; id: string }>('support.tickets.create', a),
  replyTicket: (ticketId: string, cuerpo: string) =>
    callAdminApi<{ ok: true }>('support.tickets.reply', { ticketId, cuerpo }),
  updateTicket: (a: { ticketId: string; estado?: TicketEstado; prioridad?: TicketPrioridad; asignadoA?: string | null }) =>
    callAdminApi<{ ok: true }>('support.tickets.update', a),

  billingOverview: () => callAdminApi<{ mrr: number; por_plan: PlanRow[] }>('billing.overview'),
  cancelSubscription: (tenantId: string) =>
    callAdminApi<{ ok: true; mp_cancelled: number }>('billing.cancel_subscription', { tenantId }),
  // Linkea a un tenant una suscripción MP huérfana (activa en MP, sin linkear en la app)
  // por su preapproval_id. La EF verifica contra MP (authorized + plan nuestro + no reclamada)
  // y cancela una anterior distinta antes de activar.
  linkSubscription: (tenantId: string, preapprovalId: string) =>
    callAdminApi<{ ok: true; tier: 'basico' | 'pro'; prev_cancel_error: string | null }>(
      'billing.link_subscription', { tenantId, preapprovalId }),

  // Pago manual (billing_mode='manual') — plan aprobado 2026-07-08.
  listManualTenants: () => callAdminApi<{ tenants: ManualTenantRow[] }>('billing.manual_tenants_list'),
  manualPaymentHistory: (tenantId: string) =>
    callAdminApi<{ pagos: ManualPagoRow[] }>('billing.manual_history', { tenantId }),
  recordManualPayment: (a: { tenantId: string; monto: number; medio: MedioPagoManual; referencia?: string; notas?: string }) =>
    callAdminApi<{ ok: true; manual_paid_until: string }>('billing.manual_record_payment', a),
  // Facturación automática de plataforma (Fede) — techo de categoría monotributo.
  platformFacturasStats: () =>
    callAdminApi<{ facturado_anio_actual: number; cantidad: number }>('billing.platform_facturas_stats'),

  // Embudo real (altas, conversión, churn, origen). El CAC necesita la inversión publicitaria,
  // que todavía no se carga en ningún lado.
  analyticsOverview: () => callAdminApi<AnalyticsOverview>('analytics.overview'),

  listLeads: () => callAdminApi<{ leads: Lead[] }>('crm.leads.list'),
  createLead: (a: { nombre: string; empresa?: string; email?: string; estado?: LeadEstado; valorEstimado?: number; origen?: string }) =>
    callAdminApi<{ ok: true; id: string }>('crm.leads.create', a),
  updateLead: (a: { leadId: string; estado?: LeadEstado; nombre?: string; valorEstimado?: number }) =>
    callAdminApi<{ ok: true }>('crm.leads.update', a),

  // ── Baja de un negocio (solo rol admin; la EF lo re-valida) ──────────────────
  // Dos caminos, igual que en la app: programar con grace period, o purgar YA. Antes de
  // cualquiera de los dos, la EF cancela la suscripción en Mercado Pago fail-closed — si MP no
  // confirma, no se borra nada (si no, se le seguiría cobrando a un negocio que ya no existe).
  deletePreview: (tenantId: string) =>
    callAdminApi<DeletePreview>('customers.delete_preview', { tenantId }),
  scheduleDelete: (a: { tenantId: string; confirmNombre: string; dias?: number; confirmFiscal?: boolean }) =>
    callAdminApi<{ ok: true; delete_scheduled_at: string; mp_cancelled: number; aviso_mp: string | null }>(
      'customers.schedule_delete', a),
  cancelDelete: (tenantId: string) =>
    callAdminApi<{ ok: true; tenant: string }>('customers.cancel_delete', { tenantId }),
  purgeNow: (a: { tenantId: string; confirmNombre: string; confirmFiscal?: boolean; borrarUsuariosAuth?: boolean }) =>
    callAdminApi<PurgeResult>('customers.purge_now', a),

  listAgents: () => callAdminApi<{ agents: Agent[] }>('agents.list'),
  createAgent: (a: { email: string; nombre?: string; rol: Rol; password: string }) =>
    callAdminApi<{ ok: true; id: string }>('agents.create', a),
  updateAgent: (a: { agentId: string; rol?: Rol; activo?: boolean }) =>
    callAdminApi<{ ok: true }>('agents.update', a),
}
