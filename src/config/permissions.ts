// Roles del panel y matriz rol → módulos. ESPEJO de la EF admin-api (ROLE_MODULES).
// El front oculta lo no permitido (UX); la seguridad real la enforza la EF en cada acción.

export type Rol = 'admin' | 'support' | 'marketing' | 'billing'

export type ModuleKey =
  | 'dashboard' | 'customers' | 'crm' | 'support' | 'analytics' | 'billing' | 'users'

export interface Agent {
  id: string
  email: string
  nombre: string | null
  rol: Rol
  activo: boolean
  created_at?: string
}

export const ROLE_MODULES: Record<Rol, ModuleKey[]> = {
  admin:     ['dashboard', 'customers', 'crm', 'support', 'analytics', 'billing', 'users'],
  support:   ['dashboard', 'customers', 'support'],
  marketing: ['dashboard', 'crm', 'analytics'],
  billing:   ['dashboard', 'billing'],
}

export const ROL_LABEL: Record<Rol, string> = {
  admin: 'Administrador',
  support: 'Soporte',
  marketing: 'Marketing',
  billing: 'Facturación',
}

export function canSee(rol: Rol | undefined, mod: ModuleKey): boolean {
  return !!rol && (ROLE_MODULES[rol] ?? []).includes(mod)
}
