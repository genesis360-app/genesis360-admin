export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
    </div>
  )
}

/** Marca un módulo aún no implementado (Fase 0). */
export function ComingSoon({ fase }: { fase: string }) {
  return (
    <div className="rounded-xl border border-dashed border-outline bg-surface/60 p-10 text-center">
      <p className="text-sm text-muted">
        Módulo en construcción · <span className="font-medium text-ink">{fase}</span>
      </p>
    </div>
  )
}
