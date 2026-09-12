import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, CornerDownLeft } from 'lucide-react'
import { adminApi } from '@/lib/adminApi'

/**
 * Búsqueda global (Ctrl/⌘ + K).
 *
 * Entrar por Clientes cada vez que llega un mail funciona con diez clientes; con doscientos, no.
 * Busca por negocio, mail del dueño, mail de cualquier usuario o id del tenant — lo mismo que la
 * pantalla de Clientes, porque va contra la misma acción (`customers.list`, mig 410).
 */
export function BusquedaGlobal() {
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Atajo global. Se escucha en `keydown` de la ventana para que funcione desde cualquier pantalla.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setAbierto(a => !a)
      }
      if (e.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => { if (abierto) setTimeout(() => inputRef.current?.focus(), 0) }, [abierto])

  // Sin debounce, cada tecla dispara una llamada a la Edge Function (que además audita cada
  // búsqueda): el log se llenaría de basura y el panel iría a los tirones.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250)
    return () => clearTimeout(t)
  }, [q])

  const { data, isFetching } = useQuery({
    queryKey: ['busqueda-global', debounced],
    queryFn: () => adminApi.listCustomers(debounced),
    enabled: abierto && debounced.length >= 2,
  })
  const resultados = (data?.customers ?? []).slice(0, 8)

  useEffect(() => { setSel(0) }, [debounced])

  const ir = (id: string) => {
    setAbierto(false); setQ(''); setDebounced('')
    navigate(`/customers/${id}`)
  }

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-[12vh] px-4"
      onClick={() => setAbierto(false)}>
      <div className="w-full max-w-xl bg-surface rounded-xl shadow-card overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 border-b border-outline/30">
          <Search size={16} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, resultados.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
              if (e.key === 'Enter' && resultados[sel]) ir(resultados[sel].id)
            }}
            placeholder="Negocio, mail del dueño, mail de un usuario o id…"
            className="flex-1 h-12 bg-transparent text-sm text-ink outline-none"
          />
          {isFetching && <span className="text-xs text-muted">buscando…</span>}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {debounced.length < 2 && (
            <div className="px-4 py-6 text-sm text-muted">Escribí al menos 2 caracteres.</div>
          )}
          {debounced.length >= 2 && resultados.length === 0 && !isFetching && (
            <div className="px-4 py-6 text-sm text-muted">Sin resultados para “{debounced}”.</div>
          )}
          {resultados.map((c, i) => (
            <button key={c.id} onClick={() => ir(c.id)} onMouseEnter={() => setSel(i)}
              className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 ${i === sel ? 'bg-primary-50' : ''}`}>
              <span className="min-w-0">
                <span className="block text-ink truncate">{c.nombre ?? '—'}</span>
                <span className="block text-xs text-muted truncate">{c.dueno_email ?? 'sin dueño'}</span>
              </span>
              {i === sel && <CornerDownLeft size={14} className="text-muted shrink-0" />}
            </button>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-outline/30 text-xs text-muted">
          ↑↓ para moverte · Enter para abrir · Esc para cerrar
        </div>
      </div>
    </div>
  )
}
