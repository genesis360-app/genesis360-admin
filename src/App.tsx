import { Routes, Route } from 'react-router-dom'
import { AuthGate } from '@/auth/AuthGate'
import { AgentProvider } from '@/auth/AgentContext'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { RequireModule } from '@/components/RequireModule'
import DashboardPage from '@/pages/DashboardPage'
import CustomersPage from '@/pages/CustomersPage'
import CustomerDetailPage from '@/pages/CustomerDetailPage'
import CrmPage from '@/pages/CrmPage'
import SupportPage from '@/pages/SupportPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import BillingPage from '@/pages/BillingPage'
import UsersPage from '@/pages/UsersPage'
import AuditPage from '@/pages/AuditPage'

export default function App() {
  return (
    <AuthGate>
      <AgentProvider>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/customers" element={<RequireModule module="customers"><CustomersPage /></RequireModule>} />
            <Route path="/customers/:id" element={<RequireModule module="customers"><CustomerDetailPage /></RequireModule>} />
            <Route path="/crm" element={<RequireModule module="crm"><CrmPage /></RequireModule>} />
            <Route path="/support" element={<RequireModule module="support"><SupportPage /></RequireModule>} />
            <Route path="/analytics" element={<RequireModule module="analytics"><AnalyticsPage /></RequireModule>} />
            <Route path="/billing" element={<RequireModule module="billing"><BillingPage /></RequireModule>} />
            <Route path="/users" element={<RequireModule module="users"><UsersPage /></RequireModule>} />
            {/* Auditoría: el módulo es `users` (solo admin) — es el registro de lo que hizo el
                equipo, no data de un cliente. */}
            <Route path="/audit" element={<RequireModule module="users"><AuditPage /></RequireModule>} />
          </Route>
        </Routes>
      </AgentProvider>
    </AuthGate>
  )
}
