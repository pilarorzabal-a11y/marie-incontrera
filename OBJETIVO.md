# Proyecto Marie Incontrera - Objetivo

## Objetivo principal

Recopilar automaticamente todos los eventos futuros de TEDx desde el sitio oficial
(`ted.com/tedx/events`) y almacenarlos en una base de datos centralizada,
manteniendolos actualizados de forma periodica y sin duplicados.

## Objetivo secundario (enriquecimiento)

Para cada evento TEDx, completar informacion util para outreach y postulacion:
- deadline de speaker application (si existe)
- URL del formulario para speakers
- website oficial del evento (fuera de ted.com)
- email de contacto
- redes sociales (Facebook, X/Twitter, Instagram, LinkedIn)
- tema/notas relevantes

Este enriquecimiento se ejecuta bajo demanda (manual) y persiste en la misma tabla `tedx_events`.

---

## Stack tecnico

| Capa           | Tecnologia                                    |
|----------------|-----------------------------------------------|
| Framework      | Next.js 16 (App Router) + TypeScript          |
| Base de datos  | Neon (PostgreSQL serverless)                  |
| Scraping       | Crawl4AI (instancia propia en servidor Oracle) |
| Deploy         | Vercel                                        |
| Cron           | Vercel Cron Jobs                              |

---

## Arquitectura

```
Vercel Cron (cada 2 dias)
  |
  v
GET /api/cron/scrape-tedx
  |  (autenticado con CRON_SECRET)
  v
scrapeTedxEvents()
  |  pagina por pagina: ted.com/tedx/events?when=future&pageIndex=N
  v
crawlUrl() -> Crawl4AI API
  |  (http://144.22.186.186:11235)
  |  extraccion CSS: li.event -> nombre, fecha, ciudad, pais, tipo, url
  v
INSERT INTO tedx_events (Neon DB)
  |  ON CONFLICT (slug) DO UPDATE -> sin duplicados
  |  solo actualiza si cambiaron nombre, fecha, ciudad o pais
  v
FIN
```

---

## Arquitectura de enriquecimiento

```
Seleccion en frontend (eventos)
  |
  v
POST /api/enrich
  |  marca filas en status = pending
  v
GET /api/enrich/run?ids=...
  |  stream SSE con progreso por evento
  v
TEDX Enrichment Agent (Python/FastAPI)
  |  busca datos de contacto y speaker application
  v
UPDATE tedx_events
  |  deadline, speaker_app_url, website, contact_email,
  |  facebook, twitter, instagram, linkedin, theme, notes
  |  enrichment_status, enriched_at
  v
FIN
```

---

## Base de datos - Tabla `tedx_events`

| Columna      | Tipo        | Descripcion                                    |
|--------------|-------------|-----------------------------------------------|
| `id`         | SERIAL PK   | ID interno                                    |
| `slug`       | TEXT UNIQUE | Identificador unico: `nombre-ano`             |
| `name`       | TEXT        | Nombre del evento TEDx                        |
| `event_date` | DATE        | Fecha del evento                              |
| `city`       | TEXT        | Ciudad                                        |
| `country`    | TEXT        | Pais                                          |
| `event_type` | TEXT        | Tipo de evento (TEDx, TEDxSalon, etc.)        |
| `url`        | TEXT        | URL del evento en ted.com                     |
| `raw_data`   | JSONB       | Datos crudos del scraper                      |
| `scraped_at` | TIMESTAMPTZ | Fecha de primera insercion                    |
| `updated_at` | TIMESTAMPTZ | Fecha de ultima actualizacion                 |

Campos de enriquecimiento:
- `deadline` (DATE)
- `speaker_app_url` (TEXT)
- `website` (TEXT)
- `contact_email` (TEXT)
- `facebook` (TEXT)
- `twitter` (TEXT)
- `instagram` (TEXT)
- `linkedin` (TEXT)
- `theme` (TEXT)
- `notes` (TEXT)
- `enrichment_status` (TEXT: `pending` | `running` | `done` | `failed`)
- `enriched_at` (TIMESTAMPTZ)

---

## Secrets (gestionados con Doppler)

Los secrets **no se usan via `.env.local`**. Se gestionan centralmente en Doppler.

- **Proyecto Doppler:** `marie-incontrera`
- **Config:** `prd`
- **Workspace:** `pilarorzabal`

### Secrets almacenados

| Secret           | Descripcion                                                    |
|------------------|----------------------------------------------------------------|
| `DATABASE_URL`   | Cadena de conexion Neon (PostgreSQL, con pooler)               |
| `CRON_SECRET`    | Token para autenticar el endpoint cron                         |
| `CRAWL4AI_URL`   | URL del servidor Crawl4AI (`http://144.22.186.186:11235`)      |
| `CRAWL4AI_TOKEN` | Token de acceso a Crawl4AI                                     |

> `TEDX_AGENT_URL` y `TEDX_AGENT_TOKEN` estan configurados directamente en Vercel (no en Doppler).

### Comandos Doppler utiles

```bash
# Ver todos los secrets
doppler secrets --project marie-incontrera --config prd

# Agregar o actualizar un secret
doppler secrets set NOMBRE="valor" --project marie-incontrera --config prd

# Correr el servidor de dev con secrets inyectados
doppler run -- npm run dev

# Correr migracion con secrets inyectados
doppler run -- npm run migrate

# Verificar que Doppler esta configurado correctamente
doppler configure debug
```

---

## Cron schedule

- Frecuencia: cada 2 dias a las 06:00 UTC
- Cron expression: `0 6 */2 * *`
- Endpoint: `GET /api/cron/scrape-tedx`

---

## Anti-duplicados

El scraper usa `slug` como clave unica (formato: `nombre-del-evento-2026`).
El `INSERT ... ON CONFLICT DO UPDATE` garantiza que:
- No se crean registros duplicados
- Si el evento cambia (fecha, ciudad, pais) se actualiza automaticamente
- Si no cambio nada, no se toca el registro (evita writes innecesarios)

---

## Estado actual

- [x] Tabla `tedx_events` creada en Neon
- [x] Scraper paginado con Crawl4AI
- [x] Endpoint cron con autenticacion
- [x] Cron configurado cada 2 dias en Vercel
- [x] Deploy en Vercel - https://marie-incontrera.vercel.app
- [x] Env vars configuradas en Vercel (TEDX_AGENT_URL, TEDX_AGENT_TOKEN)
- [x] Secrets centralizados en Doppler (DATABASE_URL, CRON_SECRET, CRAWL4AI_URL, CRAWL4AI_TOKEN)
- [x] Frontend para visualizar eventos (grilla responsiva + filtros por nombre/pais/tipo)
- [x] Scraping funcionando (confirmado 2026-02-19)
- [x] Enriquecimiento manual por lote (SSE) con estado por evento
- [x] Persistencia de datos de contacto y speaker application
- [x] Integracion con TEDX Enrichment Agent (Python/FastAPI)

---

## Disparar el scraping manualmente

```bash
curl -X GET "https://marie-incontrera.vercel.app/api/cron/scrape-tedx" \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Disparar enriquecimiento manualmente

Opciones:
- Desde frontend: seleccionar eventos y usar accion `Enriquecer seleccionados`.
- Via API interna:
  1. `POST /api/enrich` con body `{ "ids": [1,2,3] }` para pasar a `pending`.
  2. `GET /api/enrich/run?ids=1,2,3` para ejecutar y recibir progreso SSE.

---

## Notas operativas

- Los secrets del proyecto estan en Doppler (`marie-incontrera / prd`). No hay `.env.local`.
- Para agregar o cambiar un secret: `doppler secrets set NOMBRE="valor" --project marie-incontrera --config prd`
- Para cambiar env vars en Vercel (TEDX_AGENT_URL, TEDX_AGENT_TOKEN): `printf "valor" | vercel env add NOMBRE production --force` y luego redeployar
- Para correr localmente: `doppler run -- npm run dev`

---

## CLI disponibles en este entorno (actualizado 2026-05-06)

- `vercel` -> `Vercel CLI 50.18.2`
- `neon` -> `2.20.2`
- `doppler` -> `3.76.0` (autenticado como `pilarorzabal`)
- `oci` -> `3.74.1` (instalado, pero sin `~/.oci/config` en esta maquina)

---

## Incidente enriquecimiento E2E (2026-02-19) - resuelto

Prueba real ejecutada:
- `POST https://marie-incontrera.vercel.app/api/enrich` con `{ "ids": [1] }` -> `{ "queued": 1 }`
- Primer intento: `GET https://marie-incontrera.vercel.app/api/enrich/run?ids=1` (SSE) -> `start`, luego `error: "fetch failed"`, luego `done`
- Verificacion final (tras fix): `GET https://marie-incontrera.vercel.app/api/enrich/run?ids=1` -> `start`, `result`, `done`

Diagnostico inicial:
- El agente Python estaba arriba en VM:
  - proceso `uvicorn main:app --host 0.0.0.0 --port 8001`
  - `curl http://localhost:8001/health` devolvia `{ "status": "ok" }`
- Desde Internet, `http://144.22.186.186:8001/health` no respondia (timeout)
- Abrir `iptables` local no alcanzo para exponer `8001`

Fix aplicado (sin tocar OCI):
- Se actualizo `cloudflared` en la VM para enrutar `https://crawl4ai.1kairos.com/enrich` hacia `http://localhost:8001`
- El resto del trafico de `crawl4ai.1kairos.com` sigue yendo a `http://localhost:11235` (Crawl4AI)
- Se actualizo `TEDX_AGENT_URL` en Vercel a `https://crawl4ai.1kairos.com`
- Se ejecuto redeploy de produccion en Vercel y el flujo E2E quedo funcionando

---

## Runbook rapido para validar enrich (estado actual)

1. Verificar routing actual:
   - `curl https://crawl4ai.1kairos.com/health` (debe responder Crawl4AI)
   - `POST https://crawl4ai.1kairos.com/enrich` con Bearer `TEDX_AGENT_TOKEN` (debe responder el agente)
2. Reprobar flujo E2E:
   - `POST /api/enrich` con un `id` valido
   - `GET /api/enrich/run?ids=...` y esperar `type: "result"` y luego `type: "done"`
3. Validar en frontend:
   - seleccionar un evento
   - click en `Buscar info ->`
   - confirmar que `Estado` pase a `Listo` y se completen columnas de enriquecimiento

Fallback (si vuelve `fetch failed`):
1. Revisar `sudo systemctl status cloudflared` en VM.
2. Verificar `/etc/cloudflared/config.yml` mantenga reglas por `path` para `/enrich`.
3. Reaplicar `TEDX_AGENT_URL=https://crawl4ai.1kairos.com` en Vercel y redeploy.

---
## Acceso al servidor Crawl4AI (SSH)

Pasos documentados para el acceso SSH (la clave privada **no** se versiona):

1. Crear el directorio local:
   - `mkdir C:\Users\Marcos Tauszig\.oci`
2. Guardar la clave privada en:
   - `C:\Users\Marcos Tauszig\.oci\n8n_ssh_key`
3. Ajustar permisos (requerido por OpenSSH en Windows):
   - `icacls "C:\Users\Marcos Tauszig\.oci\n8n_ssh_key" /inheritance:r /grant:r "Marcos Tauszig:(R)"`
4. Conectar:
   - `ssh -i "C:\Users\Marcos Tauszig\.oci\n8n_ssh_key" ubuntu@144.22.186.186`

Notas:
- La clave privada debe mantenerse fuera del repo.
- Si la conexion se queda colgada, probar con `ssh -vvv` para diagnostico.
