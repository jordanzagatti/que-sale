# Setup de Supabase

Esta guía deja la base lista para que la app use datos reales, el login funcione y los recordatorios push corran solos.

## 0. Checklist

- [ ] Proyecto de Supabase creado.
- [ ] Extensiones `postgis`, `pg_trgm`, `pg_cron` y `pg_net` disponibles.
- [ ] `supabase/migrations/0001_init.sql` aplicado.
- [ ] `app_url` y `cron_secret` cargados en `public.app_config`.
- [ ] `supabase/migrations/0002_cron.sql` aplicado.
- [ ] Auth configurado: Site URL, redirect URLs, anonymous sign-ins y Google.
- [ ] SMTP propio configurado para magic links en producción.
- [ ] Variables de entorno cargadas en `.env.local` y Vercel.
- [ ] Primera ingesta ejecutada.
- [ ] `/api/health` responde `200` con `database.connected: true`.

## 1. Crear el proyecto y obtener claves

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. Ir a **Project Settings → API**.
3. Copiar:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable / anon key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Secret / service_role key** → `SUPABASE_SERVICE_KEY`

> La secret key salta RLS. Usala solo en scripts, GitHub Actions, cron y API routes server-side. Nunca la pongas en una variable `NEXT_PUBLIC_*` ni en un componente cliente.

Si el proyecto usa las claves nuevas (`sb_publishable_...` y `sb_secret_...`), funcionan igual con `@supabase/supabase-js`. Las claves legacy `anon` y `service_role` también sirven.

## 2. Extensiones

La migración `0001_init.sql` hace:

```sql
create extension if not exists postgis;
create extension if not exists pg_trgm;
```

Si el SQL Editor devuelve un error de extensión no disponible:

1. Ir a **Database → Extensions**.
2. Habilitar `postgis` y `pg_trgm`.
3. Volver a ejecutar la migración.

Para los recordatorios, `0002_cron.sql` necesita `pg_cron` y `pg_net`. También se pueden habilitar desde **Database → Extensions** antes de correrla.

## 3. Aplicar `0001_init.sql`

### Opción A: SQL Editor (recomendada para empezar)

1. Abrir **SQL Editor** en el dashboard.
2. Copiar todo el contenido de [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).
3. Ejecutar.
4. Verificar que no haya errores.

### Opción B: Supabase CLI

Requiere tener la contraseña de la base y un access token de Supabase.

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

La migración crea, entre otras cosas:

- `profiles`
- `events`
- `events_staging`
- `event_sources`
- `saved_searches`
- `attendance`
- `follows`
- `push_subscriptions`
- `notification_log`
- `ingestion_runs`
- `geocode_cache`
- `app_config`
- `promotions`
- Vistas `event_attendance_counts`
- RPCs de cercanía y búsqueda
- Políticas RLS y grants

Verificación rápida en el SQL Editor:

```sql
select tablename
from pg_tables
where schemaname = 'public'
order by tablename;

select count(*) as eventos from public.events;
```

`public.events` tiene que existir. Si la API devuelve `PGRST205` (“Could not find the table 'public.events' in the schema cache”), la migración no se aplicó o se aplicó en otro proyecto.

> No intentes aplicar DDL con la publishable/secret key vía REST. Supabase no expone un endpoint SQL en PostgREST; hace falta SQL Editor, CLI o Management API con un Personal Access Token.

## 4. Configurar `app_config`

Antes de aplicar `0002_cron.sql`, cargar la URL pública de la app y el mismo secreto que vas a usar en Vercel/GitHub:

```sql
insert into public.app_config (key, value)
values
  ('app_url', 'https://tu-app.vercel.app'),
  ('cron_secret', 'un-secreto-largo-y-aleatorio')
on conflict (key) do update set value = excluded.value;
```

- `app_url` no lleva barra final.
- `cron_secret` debe ser idéntico a `CRON_SECRET` en Vercel.
- Para local podés usar `http://localhost:3000`, pero pg_cron en Supabase no puede llamar a tu localhost. Los recordatorios locales se prueban con `curl`.

## 5. Aplicar `0002_cron.sql`

1. Copiar [`supabase/migrations/0002_cron.sql`](../supabase/migrations/0002_cron.sql).
2. Ejecutar en el SQL Editor.
3. Verificar el job:

```sql
select jobid, schedule, command, active
from cron.job;

select status, return_message, start_time
from cron.job_run_details
order by start_time desc
limit 10;
```

El job corre cada 15 minutos y hace un `POST` a:

```text
<app_url>/api/cron/reminders
Authorization: Bearer <cron_secret>
```

También podés dispararlo a mano:

```sql
select public.ping_reminders();
```

## 6. Configurar Auth

### Site URL y redirect URLs

En **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` en desarrollo o `https://tu-dominio.com` en producción.
- **Redirect URLs:**
  - `http://localhost:3000/auth/callback`
  - `https://tu-dominio.com/auth/callback`

Sin esto, el magic link o Google vuelven a la URL equivocada.

### Magic link por email

En **Authentication → Providers → Email**:

- Habilitar Email.
- Para producción, configurar **SMTP propio** en **Authentication → SMTP Settings**. El servicio de email incluido por Supabase tiene límites bajos y no es apto para un lanzamiento público.
- Recomendado: Resend, Postmark, SendGrid o Amazon SES.

### Google

1. En Google Cloud Console crear credenciales OAuth 2.0.
2. Agregar como redirect URI:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

3. En Supabase, **Authentication → Providers → Google**: pegar Client ID y Client Secret.
4. Agregar los redirect URLs de la app (sección anterior).

### Anonymous sign-ins

En **Authentication → Providers → Anonymous**:

- Habilitar **Anonymous sign-ins**.

La app crea usuarios anónimos desde “Probar sin registrarme”. Las políticas RLS usan el rol `authenticated`, que incluye a los usuarios anónimos de Supabase. Si está deshabilitado, ese botón falla.

### Apple

No está implementado todavía. Si se agrega, conviene hacerlo junto con la monetización para cumplir las reglas de la App Store si algún día se publica una app nativa.

## 7. Variables de entorno

En `.env.local` y en Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_KEY=sb_secret_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
APP_URL=http://localhost:3000
CRON_SECRET=<el-mismo-de-app_config>
REVALIDATE_SECRET=<otro-secreto>
```

Después de cambiar variables en Vercel, redeployar.

## 8. Primera ingesta

Con las migraciones aplicadas y `.env.local` completo:

```bash
npm run ingest:safe -- --dry-run --limit=5
npm run ingest:safe -- --limit=120
```

Luego verificar:

```bash
curl http://localhost:3000/api/health
```

Respuesta esperada:

```json
{
  "ok": true,
  "database": { "connected": true, "activeEvents": 120 },
  "env": { "supabaseUrl": true, "supabaseServiceKey": true }
}
```

La home debería dejar de usar el fallback live. Podés comprobarlo mirando los logs del servidor: ya no aparece `[getEventos] DB no disponible`.

## 9. Seguridad y RLS

Resumen de accesos:

- `anon` y `authenticated` leen eventos con `status = 'active'`.
- `authenticated` (incluye anónimos) solo puede leer y modificar sus propios datos en `profiles`, `saved_searches`, `attendance`, `follows` y `push_subscriptions`.
- `notification_log` solo se lee propio.
- `events_staging`, `app_config`, `geocode_cache`, `ingestion_runs` y `event_sources` no son públicos.
- `service_role` se usa en ingesta, cron y APIs administrativas.

Nunca desactives RLS en `events` o en tablas de usuario para “hacer que funcione”. Si faltan permisos, revisá grants y políticas.

## 10. Problemas frecuentes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `PGRST205` en `public.events` | Migración no aplicada | Ejecutar `0001_init.sql` |
| `42501 permission denied` | Tabla vieja, grants faltantes o key equivocada | Verificar que la app use `events` y aplicar grants de la migración |
| Login vuelve a localhost | Site URL mal configurada | Corregir URL Configuration y redirect URLs |
| “Anonymous sign-ins are disabled” | Proveedor anónimo apagado | Habilitarlo en Auth → Providers |
| No llega el magic link | SMTP ausente o límite | Configurar SMTP propio y revisar spam |
| Push no llega | Sin permiso, VAPID mal, iOS sin instalar | Revisar `/cuenta` → Notificaciones y logs de pg_cron |
| El cron no corre | `pg_cron`/`pg_net` apagados o `app_config` vacío | Habilitar extensiones y cargar `app_config` |
| `Passline 403` | Cloudflare bloquea Node | Dejar que use curl o `PASSLINE_DISABLE_CURL=1` |
| La home muestra eventos pero `/cuenta` falla | DB sin migrar | Aplicar migraciones y correr ingesta |

## 11. Backup y mantenimiento

- Activar backups diarios en Supabase cuando el proyecto pase a producción.
- Correr `npm run cleanup` a diario (el workflow de mantenimiento ya lo hace).
- Revisar `ingestion_runs` para detectar fuentes que fallan.
- Revisar `notification_log` y `cron.job_run_details` si los recordatorios no salen.
- Rotar `CRON_SECRET` y `REVALIDATE_SECRET` si se filtran; actualizar Vercel, GitHub Actions y `app_config`.
