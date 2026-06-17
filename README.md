# Genesis360 — Panel interno (admin.genesis360.pro)

Consola interna para el equipo de soporte/operaciones de Genesis360. Permite ver la
salud de cada cliente (tenant), gestionar tickets, pipeline comercial (CRM), facturación
(MercadoPago) y métricas del negocio (MRR/churn/LTV:CAC).

> Diseño base: proyecto Stitch **"Genesis360 Admin Control Panel"** + design system
> "Genesis360 Internal System" (violeta `#8B5CF6`, verde `#10B981`, Inter, Modern SaaS).

## Arquitectura

- **Frontend (este repo):** React + TS + Vite + Tailwind. Deploy en `admin.genesis360.pro`.
- **Backend:** el **mismo Supabase** que la app principal. El esquema (migraciones) y las
  Edge Functions viven en el repo de **Genesis360** (`supabase/`) — **fuente única de verdad**
  para evitar drift. Este repo solo consume.
- **Acceso cross-tenant:** NUNCA por RLS abierta ni service_role en el cliente. El panel llama
  **Edge Functions con `service_role`** que (1) validan que el caller es un agente de soporte,
  (2) auditan el acceso (`admin_audit_log`), (3) devuelven la data.
- **Impersonación:** "Ver como cliente" = sesión real en la app de Genesis360, **read-only**,
  con token efímero y auditada.

## Módulos (PRD)

Dashboard (BI: MRR/churn/LTV:CAC) · Customers (health score + uso + tickets) ·
CRM (pipeline Lead→Qualified→Demo→Trial→Won/Lost) · Support (tickets + chat) ·
Analytics (Meta Pixel/GA4, CAC) · Billing (MercadoPago).

## Setup

```bash
npm install
cp .env.example .env.local   # completar VITE_SUPABASE_ANON_KEY
npm run dev                   # http://localhost:5174
```

## Estado

**Fase 0 (cimientos):** scaffold + design system + shell de navegación + auth gate de agentes.
Pendiente: capa de datos vía Edge Functions, migraciones `support_agents` / `admin_audit_log`
(en el repo de Genesis360), y los módulos reales.
