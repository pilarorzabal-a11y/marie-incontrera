# Marie Incontrera — TEDx Toolkit

Dos herramientas para gestionar aplicaciones como speaker de TEDx.

---

## 1. TEDx Deadline Tracker (Web App)

**URL:** https://tedx-deadline-tracker.pilar-orzabal.workers.dev

App web para visualizar y gestionar deadlines de aplicación a eventos TEDx.

### Qué hace
- Carga un archivo CSV o Excel (`.xlsx`) con eventos TEDx
- Muestra una tabla con estado de urgencia por deadline (Crítico ≤7d, Pronto ≤30d, OK ≤90d, Futuro)
- Exporta un archivo `.ics` para importar en Google Calendar con recordatorios
- Envía un resumen al canal de Slack vía Incoming Webhook

### Cómo usar
1. Entrar a la URL de arriba
2. Subir el archivo `TEDxMASTER.xlsx` (o exportarlo como CSV)
3. Usar los filtros para ver eventos por urgencia
4. Exportar al calendar o enviar a Slack

### Columnas que lee del archivo
| Columna | Descripción |
|---|---|
| `DEADLINE` | Fecha límite de aplicación |
| `NAME` | Nombre del evento |
| `CITY` | Ciudad |
| `STATE` | Estado/Provincia/País |
| `THEME` | Tema del evento |
| `TYPE` | Tipo (Standard, University, Women, Salon) |
| `WEBSITE` | Sitio web oficial |
| `SUBMISSION FORMS` | Link al formulario de aplicación |
| `CONTACT` | Email de contacto |

### Stack
- Cloudflare Worker (sin servidor, sin base de datos)
- SheetJS para leer Excel
- Todo el procesamiento ocurre en el browser del usuario

### Deploy
```bash
cd tedx-tracker-worker
npx wrangler deploy
```

---

## 2. TEDx Scraper + Dashboard (Next.js)

**URL:** https://marie-incontrera.vercel.app

App que scrapa automáticamente eventos TEDx futuros desde ted.com y los almacena en base de datos.

### Stack
| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Base de datos | Neon (PostgreSQL serverless) |
| Scraping | Crawl4AI (servidor propio) |
| Deploy | Vercel |
| Cron | Vercel Cron Jobs (cada 2 días) |

### Infraestructura
- **DB:** Neon PostgreSQL — `ep-raspy-tooth-aih7gqoo.c-4.us-east-1.aws.neon.tech`
- **Crawl4AI:** `http://144.22.186.186:11235` (puede estar caído, verificar antes de usar)
- **Cron:** `0 6 */2 * *` → `GET /api/cron/scrape-tedx`
- **Enrichment Agent:** `https://crawl4ai.1kairos.com/enrich`

### Archivos clave
- `lib/db.ts` — conexión Neon
- `lib/crawl4ai.ts` — cliente Crawl4AI con polling async
- `lib/tedx-scraper.ts` — scraper paginado de ted.com/tedx/events
- `app/api/cron/scrape-tedx/route.ts` — endpoint cron
- `app/page.tsx` — frontend con filtros
- `OBJETIVO.md` — documentación técnica detallada

### Disparar scraping manualmente
```bash
curl -X GET "https://marie-incontrera.vercel.app/api/cron/scrape-tedx" \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Estado
- [x] Scraper automático cada 2 días
- [x] Base de datos Neon con deduplicación por slug
- [x] Dashboard con filtros (nombre, país, tipo)
- [x] Enriquecimiento manual: deadline, formulario, contacto, redes sociales
- [x] Integración con agente Python vía Cloudflare Tunnel

---

## Repositorio
https://github.com/pilarorzabal-a11y/marie-incontrera
