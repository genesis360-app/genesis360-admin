import { LayoutDashboard, Users, Contact, LifeBuoy, BarChart3, CreditCard, ShieldCheck, type LucideIcon } from 'lucide-react'
import type { ModuleKey } from './permissions'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  module: ModuleKey
}

// Módulos del PRD + Usuarios (gestión de agentes, solo admin). El sidebar filtra por rol.
export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { to: '/customers', label: 'Clientes', icon: Users, module: 'customers' },
  { to: '/crm', label: 'CRM', icon: Contact, module: 'crm' },
  { to: '/support', label: 'Soporte', icon: LifeBuoy, module: 'support' },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, module: 'analytics' },
  { to: '/billing', label: 'Facturación', icon: CreditCard, module: 'billing' },
  { to: '/users', label: 'Usuarios', icon: ShieldCheck, module: 'users' },
]
