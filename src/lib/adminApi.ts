import { supabase } from './supabase'
import type { Agent, Rol } from '@/config/permissions'

/**
 * Capa de datos del panel. TODO el acceso cross-tenant pasa por la Edge Function
 * `admin-api` (service_role), que valida agente + AUTORIZA por rol + audita.
 */
export async function callAdminApi<T = unknown>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-api', { body: { action, ...payload } })
  if (error) {
    let msg = error.message
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error } catch { /* noop */ }
    throw new Error(msg)
  }
  return data as T
}

// ── Tipos ──
export interface CustomerRow { id: string; nombre: string | null; created_at: string }
export interface Metrics {
  total: number; altas30: number; enTrial: number; ticketsAbiertos: number; basico: number; avanzado: number; mrr: number
}
export interface PlanRow { nombre: string; precio_mensual: number; tenants: number; subtotal: number }
export type LeadEstado = 'lead' | 'qualified' | 'demo' | 'trial' | 'won' | 'lost'
export interface Lead {
  id: string; nombre: string; empresa: string | null; email: string | null; telefono: string | null
  estado: LeadEstado; valor_estimado: number | null; origen: string | null; created_at: string; updated_at: string
}
export interface CustomerDetail {
  tenant: {
    id: string; nombre: string | null; plan_id: string | null; modo_operacion: string | null
    created_at: string; trial_ends_at: string | null; inicio_actividades: string | null
    subscription_status: string | null
  }
  stats: {
    usuarios: number; sucursales: number; ventas_total: number; ventas_30d: number
    tickets_abiertos: number; ultima_venta_at: string | null
  }
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

export const adminApi = {
  whoami: () => callAdminApi<{ agent: Agent }>('auth.whoami'),
  changePassword: (password: string) => callAdminApi<{ ok: true }>('auth.change_password', { password }),
  metricsOverview: () => callAdminApi<{ metrics: Metrics }>('metrics.overview'),

  listCustomers: (q?: string) => callAdminApi<{ customers: CustomerRow[] }>('customers.list', { q }),
  getCustomer: (tenantId: string) => callAdminApi<CustomerDetail>('customers.get', { tenantId }),

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

  listLeads: () => callAdminApi<{ leads: Lead[] }>('crm.leads.list'),
  createLead: (a: { nombre: string; empresa?: string; email?: string; estado?: LeadEstado; valorEstimado?: number; origen?: string }) =>
    callAdminApi<{ ok: true; id: string }>('crm.leads.create', a),
  updateLead: (a: { leadId: string; estado?: LeadEstado; nombre?: string; valorEstimado?: number }) =>
    callAdminApi<{ ok: true }>('crm.leads.update', a),

  listAgents: () => callAdminApi<{ agents: Agent[] }>('agents.list'),
  createAgent: (a: { email: string; nombre?: string; rol: Rol; password: string }) =>
    callAdminApi<{ ok: true; id: string }>('agents.create', a),
  updateAgent: (a: { agentId: string; rol?: Rol; activo?: boolean }) =>
    callAdminApi<{ ok: true }>('agents.update', a),
}
