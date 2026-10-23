# ¿Qué Sale?

Agenda nacional de eventos de Argentina. Reúne recitales, teatro, ferias, deportes, gastronomía, cultura y planes de distintas fuentes en una sola app, con búsqueda por ciudad o cercanía, mapa, agenda personal y recordatorios push.

> **Estado:** MVP funcional. La app funciona con datos en vivo mientras la base todavía no está migrada; para producción hay que aplicar las migraciones de Supabase y correr la primera ingesta. Ver [Setup de Supabase](docs/setup-supabase.md).

## Qué incluye

- **Cobertura nacional** con foco inicial en CABA, Córdoba, Rosario y Mendoza.
- **Geolocalización aproximada por IP** para elegir la ciudad inicial. La ubicación precisa se pide solo al tocar “Cerca mío”.
- **Búsqueda y filtros** por texto, categoría, ciudad, fecha y distancia.
- **Mapa** con clustering sobre MapLibre GL + OpenFreeMap.
- **Detalle de evento** con datos factuales, mapa, enlace a la fuente, calendario `.ics` y JSON-LD para SEO.
- **Cuenta** con magic link, Google o sesión anónima (sin Facebook).
- **Agenda personal**: botón “Asistir”, búsquedas guardadas (incluida la ubicación), follows a lugares, categorías y ciudades, y feed “Para vos”.
- **PWA instalable** con service worker y página offline.
- **Web Push** con recordatorios 24 h y 2 h antes, deduplicados en `notification_log`.
- **Dos pipelines de ingesta**:
  - `safe`: APIs oficiales, JSON-LD y feeds públicos habilitados. Escribe en producción.
  - `experimental`: adaptadores en revisión. Escribe en `events_staging` y no se muestra hasta promoverlo manualmente.
- **Base DB-first**: las páginas leen Supabase. Solo si la base no está disponible caen a las fuentes en vivo.

## Stack

| Capa | Tecnología |
| --- | --- |
| App | Next.js 16 (App Router, Cache Components), React 19, TypeScript |
| Estilos | Tailwind CSS 4 |
| Base de datos | Supabase / PostgreSQL + PostGIS + pg_trgm |
| Auth | Supabase Auth: magic link, Google y anónimo |
| Mapas | MapLibre GL JS + OpenFreeMap |
| Push | Web Push + VAPID + service worker propio |
| Ingesta | TypeScript + `tsx` en GitHub Actions |
| Deploy | Vercel + Supabase + GitHub Actions |

## Arquitectura

```text
GitHub Actions (ingesta safe)        Supabase pg_cron (recordatorios)
          │                                      │
          ▼                                      ▼
  adaptadores de fuentes                 /api/cron/reminders
          │                                      │
          └──────────► Supabase ◄────────────────┘
                  Postgres + PostGIS
                         │
                         ▼
              Next.js (RSC + API routes)
                         │
                         ▼
                 PWA / navegador / push
```

Decisiones importantes:

- **Nunca se consultan fuentes externas en el request** de una página. La ingesta corre como job y la app lee la base.
- El **fallback live** existe solo para que el proyecto sea usable mientras se configura Supabase.
- La ingesta pesada vive en **GitHub Actions** por los límites de Vercel Hobby.
- Los recordatorios corren cada 15 minutos con **pg_cron + pg_net** de Supabase, porque Vercel Hobby solo permite un cron diario.
- Las imágenes de terceros se sirven **sin optimizar** (`images.unoptimized: true`) para no agotar las 5.000 transformaciones mensuales del plan gratuito.
- Los eventos recurrentes se guardan como **una fila por función** con un `series_id` compartido; el detalle agrupa las funciones.

## Empezar en local

Requisitos: Node.js 20.9 o superior y npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

Para que funcionen login, agenda y push necesitás Supabase configurado. Sin migraciones la home sigue funcionando con el fallback live, pero `/cuenta`, `/ingresar` y `/api/health` van a mostrar errores de base.

### Variables mínimas

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable/anon key (pública) |
| `SUPABASE_SERVICE_KEY` | Secret/service key, solo server-side |
| `NEXT_PUBLIC_SITE_URL` | URL pública sin barra final |
| `APP_URL` | URL usada por la ingesta para revalidar |
| `TICKETMASTER_API_KEY` | Fuente Ticketmaster |
| `EVENTBRITE_TOKEN` | Fuente Eventbrite |
| `GCBA_RESOURCE_ID` | Recurso de datos abiertos GCBA |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública de Web Push |
| `VAPID_PRIVATE_KEY` | Clave privada de Web Push |
| `VAPID_SUBJECT` | `mailto:` o URL de contacto |
| `CRON_SECRET` | Protege `/api/cron/reminders` |
| `REVALIDATE_SECRET` | Protege `/api/revalidate` |

Generá las claves VAPID con:

```bash
npx web-push generate-vapid-keys
```

## Base de datos

Las migraciones están en [`supabase/migrations`](supabase/migrations):

| Archivo | Qué hace |
| --- | --- |
| `0001_init.sql` | Esquema, PostGIS, índices, RLS, RPCs, vistas y grants |
| `0002_cron.sql` | Job de recordatorios con pg_cron + pg_net |

Pasos resumidos:

1. Crear el proyecto en Supabase.
2. Ejecutar `0001_init.sql` en el SQL Editor.
3. Cargar `app_url` y `cron_secret` en `public.app_config`.
4. Ejecutar `0002_cron.sql`.
5. Configurar Auth (anonymous, Google, SMTP y redirect URLs).
6. Correr la primera ingesta.

El detalle paso a paso está en [docs/setup-supabase.md](docs/setup-supabase.md).

Verificación rápida:

```bash
curl http://localhost:3000/api/health
```

Cuando todo está bien responde `200` con `database.connected: true` y la cantidad de eventos activos.

## Ingesta

```bash
# Probar sin escribir nada
npm run ingest:safe -- --dry-run --limit=5

# Ingesta de producción
npm run ingest:safe -- --limit=120

# Una sola fuente
npm run ingest:safe -- --source=ticketmaster

# Pipeline experimental (escribe en events_staging)
npm run ingest:experimental -- --limit=30

# Revisar y promover staging a producción
npm run promote -- --source=alternativa --limit=20

# Mantenimiento
npm run cleanup
npm run geo:backfill -- --limit=100
```

Los scripts cargan `.env.local` y `.env` automáticamente con `dotenv`. El modo `safe` solo ejecuta fuentes con `allowedInProd: true`; el modo `experimental` puede leer todas, pero siempre escribe en staging.

Automatización:

- **GitHub Actions** corre `ingest-safe` cada 6 horas y permite ejecución manual con `source`, `limit` y `dry_run`.
- **Ingest experimental** es solo manual.
- **Mantenimiento** corre `cleanup` a diario y permite promover staging o geocodificar a mano.
- **Supabase pg_cron** llama a `/api/cron/reminders` cada 15 minutos.

## PWA y notificaciones

- El manifest se genera en [`src/app/manifest.ts`](src/app/manifest.ts) y se sirve en `/manifest.webmanifest`.
- El service worker está en [`public/sw.js`](public/sw.js) y se registra desde el layout.
- La página offline está en [`public/offline.html`](public/offline.html).
- En iOS, las notificaciones web requieren instalar la app en la pantalla de inicio (iOS 16.4+). La UI muestra el instructivo.
- Los recordatorios se envían solo a eventos con `attendance.status = 'going'` dentro de las ventanas de 24 h y 2 h.

Para probar push en local:

1. Configurar las tres variables VAPID.
2. Correr la app con HTTPS o usar `localhost` (los navegadores permiten push en localhost).
3. Ingresar, abrir `/cuenta` → Notificaciones → Activar.
4. Marcar un evento que empiece dentro de las próximas 2 o 24 horas.
5. Ejecutar `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders`.

En Windows PowerShell:

```powershell
curl.exe -H "Authorization: Bearer $env:CRON_SECRET" http://localhost:3000/api/cron/reminders
```

## Deploy

1. Aplicar migraciones en Supabase.
2. Importar el repo en Vercel.
3. Cargar todas las variables de entorno en Vercel (Production y Preview).
4. Configurar los secrets del repo en GitHub Actions.
5. Ejecutar `ingest-safe` manualmente.
6. Verificar `/api/health`, login, PWA y push.

Guía completa: [docs/deploy-vercel.md](docs/deploy-vercel.md).

## Scripts

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servir el build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run ingest:safe` | Ingesta de fuentes habilitadas |
| `npm run ingest:experimental` | Ingesta a staging |
| `npm run promote` | Promover eventos de staging |
| `npm run cleanup` | Borrar eventos viejos y logs |
| `npm run geo:backfill` | Completar coordenadas faltantes |
| `npm run icons` | Regenerar iconos PWA con `sharp` |

## Estructura

```text
src/app/                 Rutas, páginas y API routes
src/components/          UI: home, mapa, cuenta, push, follows
src/lib/events.ts        Consultas a Supabase y mapeo de eventos
src/lib/getEventos.ts    DB-first con fallback live
src/lib/ingest.ts        Pipeline de ingesta, normalización y staging
src/lib/sources/         Registry, JSON-LD y políticas de fuentes
src/lib/geo/             Ciudades, Georef y geolocalización
supabase/migrations/     Esquema y cron
scripts/                 Ingesta, promoción, limpieza e iconos
.github/workflows/       Automatización de ingesta y mantenimiento
docs/                    Guías operativas
```

## Documentación

- [Setup de Supabase](docs/setup-supabase.md)
- [Deploy en Vercel](docs/deploy-vercel.md)
- [Políticas de fuentes y datos](docs/source-policies.md)
- [Ingesta y operación](docs/ingestion.md)
- [Roadmap y monetización](docs/roadmap.md)

## Legal y datos

La app muestra datos factuales de eventos y enlaza a la fuente original. No vende entradas ni procesa pagos. Antes de habilitar una fuente nueva hay que revisar sus términos, `robots.txt` y licencias de imágenes. Ver [políticas de fuentes](docs/source-policies.md) y las páginas públicas de [términos](src/app/legales/terminos/page.tsx) y [privacidad](src/app/legales/privacidad/page.tsx).

Contacto: `hola@quesale.ar`.
