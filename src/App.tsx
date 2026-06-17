import { Routes, Route } from 'react-router-dom'
import { AuthGate } from '@/auth/AuthGate'
import { AdminLayout } from '@/components/layout/AdminLayout'
import DashboardPage from '@/pages/DashboardPage'
import CustomersPage from '@/pages/CustomersPage'
import CrmPage from '@/pages/CrmPage'
import SupportPage from '@/pages/SupportPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import BillingPage from '@/pages/BillingPage'

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/crm" element={<CrmPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/billing" element={<BillingPage />} />
        </Route>
      </Routes>
    </AuthGate>
  )
}
