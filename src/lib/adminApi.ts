import { supabase } from './supabase'
import type { Agent, Rol } from '@/config/permissions'

/**
 * Capa de datos del panel. TODO el acceso cross-tenant pasa por la Edge Function
 * `admin-api` (service_role), que valida agente + AUTORIZA por rol + audita.
 * Nunca se expone la service_role key al cliente ni se abre la RLS por tenant.
 */
export async function callAdminApi<T = unknown>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-api', { body: { action, ...payload } })
  if (error) {
    // La EF manda el detalle en el body (403/400/etc.) — intentar leerlo
    let msg = error.message
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error } catch { /* noop */ }
    throw new Error(msg)
  }
  return data as T
}

export interface CustomerRow { id: string; nombre: string | null; created_at: string }

export const adminApi = {
  whoami: () => callAdminApi<{ agent: Agent }>('auth.whoami'),
  listCustomers: (q?: string) => callAdminApi<{ customers: CustomerRow[] }>('customers.list', { q }),
  getCustomer: (tenantId: string) => callAdminApi('customers.get', { tenantId }),
  listAgents: () => callAdminApi<{ agents: Agent[] }>('agents.list'),
  createAgent: (a: { email: string; nombre?: string; rol: Rol; password: string }) =>
    callAdminApi<{ ok: true; id: string }>('agents.create', a),
  updateAgent: (a: { agentId: string; rol?: Rol; activo?: boolean }) =>
    callAdminApi<{ ok: true }>('agents.update', a),
}
