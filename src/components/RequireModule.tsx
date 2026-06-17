import { Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import { useAgent } from '@/auth/AgentContext'
import { canSee, type ModuleKey } from '@/config/permissions'

/** Guard de ruta por módulo. Si el rol del agente no lo tiene, redirige al Dashboard. */
export function RequireModule({ module, children }: { module: ModuleKey; children: ReactElement }) {
  const agent = useAgent()
  if (!canSee(agent.rol, module)) return <Navigate to="/" replace />
  return children
}
