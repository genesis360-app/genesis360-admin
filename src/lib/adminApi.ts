import { supabase } from './supabase'

/**
 * Capa de datos del panel. TODO el acceso cross-tenant pasa por Edge Functions con
 * `service_role` (definidas en el repo de Genesis360, p.ej. `admin-api`), que:
 *   1) validan que el caller es un agente de soporte autenticado (tabla support_agents),
 *   2) registran el acceso en `admin_audit_log`,
 *   3) devuelven la data agregada / scopeada.
 * Nunca se expone la service_role key al cliente ni se abre la RLS por tenant.
 */
export async function callAdminApi<T = unknown>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: { action, ...payload },
  })
  if (error) throw error
  return data as T
}

// Stubs de Fase 0 — se implementan contra la EF `admin-api` en fases siguientes.
export const adminApi = {
  metricsOverview: () => callAdminApi('metrics.overview'),
  listCustomers: (q?: string) => callAdminApi('customers.list', { q }),
  getCustomer: (tenantId: string) => callAdminApi('customers.get', { tenantId }),
  listTickets: (filter?: Record<string, unknown>) => callAdminApi('support.tickets.list', filter ?? {}),
  startImpersonation: (tenantId: string) => callAdminApi('impersonation.start', { tenantId }),
}
