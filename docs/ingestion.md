# Ingesta y operación

La ingesta convierte fuentes heterogéneas en eventos normalizados dentro de Supabase. Corre fuera de Vercel, en GitHub Actions, y nunca se ejecuta durante el request de un usuario.

## Flujo

```text
adaptador de fuente
  → fetch con rate limit
    → normalización (título, fecha, lugar, categoría, precio)
      → deduplicación por fingerprint
        → geocoding (Georef + caché en Supabase)
          → upsert en public.events (safe)
          → upsert en public.events_staging (experimental)
            → revalidación de la home
```

## Comandos

```bash
# Ayuda implícita: los argumentos se leen de process.argv
npm run ingest:safe -- --dry-run --limit=5

# Corrida real de todas las fuentes habilitadas
npm run ingest:safe -- --limit=120

# Fuentes específicas (IDs separados por coma)
npm run ingest:safe -- --source=ticketmaster,gcba --limit=50

# Limitar geocodificaciones por corrida
npm run ingest:safe -- --limit=120 --geocode-limit=20

# Pipeline experimental: escribe staging
npm run ingest:experimental -- --limit=30
npm run ingest:experimental -- --source=ticketek --limit=10
```

Argumentos disponibles:

| Argumento | Efecto |
| --- | --- |
| `--mode=safe` | Fuerza modo producción (default) |
| `--mode=experimental` | Fuerza modo staging |
| `--source=a,b` | Solo esas fuentes |
| `--limit=N` | Máximo de eventos por fuente |
| `--dry-run` | No escribe en Supabase |
| `--geocode-limit=N` | Máximo de geocodificaciones por fuente en la corrida |

> `npm run ingest:safe` ya agrega `--mode=safe`; `npm run ingest:experimental` agrega `--mode=experimental`. Si usás `npm run ingest`, pasá el modo explícitamente.

## Modos

### `safe`

- Solo fuentes con `allowedInProd: true`.
- Escribe en `public.events` y `public.event_sources`.
- Actualiza `ingestion_runs`.
- Al terminar, si `APP_URL` y el secreto están configurados, hace `POST /api/revalidate`.

### `experimental`

- Puede ejecutar cualquier adaptador del registry.
- **Siempre** escribe en `public.events_staging` con `status = 'pending'`.
- No revalida la home ni se sirve en la app.
- La promoción es manual con `npm run promote`.

## Deduplicación

Cada evento genera un `fingerprint` estable con título, fecha, ciudad y venue normalizados. El upsert usa ese fingerprint como conflicto principal. Además, `event_sources` guarda la relación `(source, source_id)` para trazabilidad y para evitar duplicados de la misma fuente.

Consecuencias:

- Un evento actualizado en la fuente actualiza la fila existente.
- El mismo evento en dos fuentes puede quedar como una fila principal con relaciones en `event_sources`.
- Cambios de título o fecha pueden generar un fingerprint nuevo. Si pasa seguido, revisar la normalización de esa fuente.

## Fechas y zonas horarias

- La app usa `America/Argentina/Buenos_Aires`.
- Si la fuente manda una fecha con hora y sin offset, se asume `-03:00`.
- Si solo manda fecha, se guarda al mediodía (`12:00 -03:00`) con `all_day = true`.
- Eventos que empezaron hace más de 6 horas se descartan.

## Geocoding

1. Si la fuente trae coordenadas, se usan como `location_precision = 'exact'`.
2. Si no, se busca en `geocode_cache`.
3. Si no hay caché y queda presupuesto, se consulta Georef Argentina.
4. Si falla, se usa el centro de la ciudad con un pequeño jitter determinístico y `location_precision = 'city'`.

El backfill manual:

```bash
npm run geo:backfill -- --limit=100
```

Georef es gratuito, pero tiene límites. El script espera ~1,1 s entre requests y el presupuesto por corrida evita bloquear la ingesta.

## Staging y promoción

Revisar staging:

```sql
select id, source, title, starts_at, city, venue_name, image_url, status
from public.events_staging
where status = 'pending'
order by first_seen_at
limit 50;
```

Promover:

```bash
npm run promote -- --limit=100
npm run promote -- --source=alternativa --limit=20
```

`promote`:

- Toma solo eventos futuros con `status = 'pending'`.
- Hace upsert en `events` por fingerprint.
- Copia la relación a `event_sources`.
- Marca staging como `approved` con `reviewed_at`.

No promuevas a ciegas. Revisá que el título, lugar, fecha y URL sean correctos, y que la fuente permita publicar esos datos.

## Limpieza

```bash
npm run cleanup
```

Borra:

- Eventos que empezaron hace más de 7 días.
- Staging con más de 30 días desde `first_seen_at`.
- `notification_log` con más de 180 días.
- `geocode_cache` con más de 365 días.
- `ingestion_runs` con más de 90 días.

## Automatización

### GitHub Actions

| Workflow | Frecuencia | Acción |
| --- | --- | --- |
| `ingest-safe.yml` | Cada 6 horas y manual | Ingesta safe |
| `ingest-experimental.yml` | Manual | Ingesta a staging |
| `maintenance.yml` | Diario y manual | Cleanup / promote / geo-backfill |

El workflow safe permite elegir `source`, `limit` y `dry_run` al ejecutarlo a mano.

### Recordatorios

No dependen de la ingesta. `pg_cron` en Supabase llama cada 15 minutos a `/api/cron/reminders`. Ver [setup de Supabase](setup-supabase.md) y [deploy](deploy-vercel.md).

## Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
TICKETMASTER_API_KEY=
EVENTBRITE_TOKEN=
GCBA_RESOURCE_ID=
APP_URL=
REVALIDATE_SECRET=
CRON_SECRET=
TZ=America/Argentina/Buenos_Aires
```

`TZ` es opcional, pero ayuda a que los logs y fechas locales sean previsibles. Los scripts usan la zona de Argentina de forma explícita en la app.

## Observabilidad

- `ingestion_runs` guarda una fila por fuente con estado, contadores y error.
- Los workflows imprimen un resumen por fuente.
- `/api/health` muestra si la base responde y cuántos eventos activos hay.
- Los logs de GitHub Actions conservan la salida de los adaptadores.

Consulta útil:

```sql
select source, mode, status, fetched, inserted, updated, skipped,
       started_at, finished_at, error, metadata
from public.ingestion_runs
order by started_at desc
limit 30;
```

## Fallas comunes

| Síntoma | Causa | Acción |
| --- | --- | --- |
| `Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY` | Env incompleto | Cargar `.env.local` o secrets |
| `PGRST205` | Migración no aplicada | Aplicar `0001_init.sql` |
| Todos los eventos se saltean | Fechas viejas o normalización | Revisar `--dry-run` y logs |
| Duplicados | Fingerprint inestable | Revisar título/fecha/venue de la fuente |
| Passline 403 | Cloudflare bloquea Node | Usar curl o `PASSLINE_DISABLE_CURL=1` |
| Geocoding lento o sin resultados | Límite de Georef o dirección sucia | Subir `geocode-cache`, mejorar `address` |
| Imágenes genéricas | Fuente en revisión legal | Es esperado; ver políticas de fuentes |
| Revalidación 401 | Secreto distinto | Igualar `REVALIDATE_SECRET` / `CRON_SECRET` |

## Agregar una fuente

1. Crear el adaptador en `src/lib/eventSources.ts` o en `src/lib/sources/`.
2. Devolver `Partial<Evento>[]` con `id`, `titulo`, `fecha`/`inicio`, `lugar`, `ciudad`, `url`.
3. Registrarlo en `src/lib/sources/registry.ts` con `allowedInProd`, `legalStatus`, `rateLimitMs` y `attribution`.
4. Documentarlo en [`docs/source-policies.md`](source-policies.md).
5. Probar `--dry-run --source=<id> --limit=5`.
6. Correr en experimental y revisar staging.
7. Recién después habilitar en safe.

## Checklist de una corrida manual

- [ ] `/api/health` responde bien.
- [ ] `npm run ingest:safe -- --dry-run --limit=5` no tiene errores nuevos.
- [ ] Corrida real con límite bajo.
- [ ] Revisar resumen y `ingestion_runs`.
- [ ] Abrir la home y un detalle de evento.
- [ ] Verificar que las imágenes y links funcionen.
- [ ] Revisar que no haya duplicados evidentes.
- [ ] Si hubo cambios masivos, confirmar revalidación.
