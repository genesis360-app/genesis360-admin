import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { adminApi, type Lead, type LeadEstado } from '@/lib/adminApi'

const COLS: { estado: LeadEstado; label: string }[] = [
  { estado: 'lead', label: 'Lead' },
  { estado: 'qualified', label: 'Calificado' },
  { estado: 'demo', label: 'Demo' },
  { estado: 'trial', label: 'Trial' },
  { estado: 'won', label: 'Ganado' },
  { estado: 'lost', label: 'Perdido' },
]
const ORDER: LeadEstado[] = COLS.map(c => c.estado)
const money = (n: number | null) => (n ? '$' + Math.round(n).toLocaleString('es-AR') : '')

export default function CrmPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['leads'], queryFn: () => adminApi.listLeads() })
  const leads = data?.leads ?? []

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ nombre: '', empresa: '', valorEstimado: '' })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['leads'] })
  const create = useMutation({
    mutationFn: () => adminApi.createLead({ nombre: form.nombre, empresa: form.empresa || undefined, valorEstimado: form.valorEstimado ? Number(form.valorEstimado) : undefined }),
    onSuccess: () => { setOpen(false); setForm({ nombre: '', empresa: '', valorEstimado: '' }); invalidate() },
  })
  const move = useMutation({
    mutationFn: (a: { leadId: string; estado: LeadEstado }) => adminApi.updateLead(a),
    onSuccess: invalidate,
  })

  const byEstado = (e: LeadEstado) => leads.filter(l => l.estado === e)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <PageHeader title="CRM" subtitle="Pipeline comercial de leads" />
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600">
          <Plus size={16} /> Nuevo lead
        </button>
      </div>

      {open && (
        <div className="bg-surface rounded-xl shadow-card p-4 mb-4 flex flex-wrap items-end gap-3">
          <label className="block"><span className="block text-xs text-muted mb-1">Nombre</span>
            <input className="inp" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></label>
          <label className="block"><span className="block text-xs text-muted mb-1">Empresa</span>
            <input className="inp" value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} /></label>
          <label className="block"><span className="block text-xs text-muted mb-1">Valor estimado (MRR)</span>
            <input className="inp" type="number" value={form.valorEstimado} onChange={e => setForm(f => ({ ...f, valorEstimado: e.target.value }))} /></label>
          <button disabled={!form.nombre || create.isPending} onClick={() => create.mutate()}
            className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50">
            {create.isPending ? 'Creando…' : 'Crear'}
          </button>
        </div>
      )}

      {isLoading ? <div className="text-sm text-muted">Cargando…</div> : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {COLS.map(col => {
            const items = byEstado(col.estado)
            return (
              <div key={col.estado} className="w-64 shrink-0">
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-sm font-semibold text-ink">{col.label}</span>
                  <span className="text-xs text-muted">{items.length}</span>
                </div>
                <div className="space-y-2 min-h-[60px]">
                  {items.map(l => <LeadCard key={l.id} lead={l} onMove={(estado) => move.mutate({ leadId: l.id, estado })} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LeadCard({ lead, onMove }: { lead: Lead; onMove: (e: LeadEstado) => void }) {
  const idx = ORDER.indexOf(lead.estado)
  return (
    <div className="bg-surface rounded-lg shadow-card p-3">
      <div className="font-medium text-ink text-sm">{lead.nombre}</div>
      {lead.empresa && <div className="text-xs text-muted">{lead.empresa}</div>}
      {lead.valor_estimado ? <div className="text-xs text-accent-600 mt-1">{money(lead.valor_estimado)}/mes</div> : null}
      <div className="flex justify-between mt-2">
        <button disabled={idx <= 0} onClick={() => onMove(ORDER[idx - 1])}
          className="text-xs text-muted hover:text-ink disabled:opacity-30">←</button>
        <button disabled={idx >= ORDER.length - 1} onClick={() => onMove(ORDER[idx + 1])}
          className="text-xs text-primary hover:underline disabled:opacity-30">mover →</button>
      </div>
    </div>
  )
}
