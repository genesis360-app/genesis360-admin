import { LayoutDashboard, Users, Contact, LifeBuoy, BarChart3, CreditCard, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

// Los 6 módulos del PRD (proyecto Stitch "Genesis360 Admin Control Panel").
export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Clientes', icon: Users },
  { to: '/crm', label: 'CRM', icon: Contact },
  { to: '/support', label: 'Soporte', icon: LifeBuoy },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/billing', label: 'Facturación', icon: CreditCard },
]
