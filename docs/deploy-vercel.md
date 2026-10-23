# Deploy en Vercel

La app está pensada para correr gratis al principio: Vercel Hobby para el frontend, Supabase Free para la base y GitHub Actions para la ingesta pesada. Cuando haya ingresos, el primer cambio recomendado es pasar Vercel a Pro por los límites de uso comercial y de ejecución.

## 1. Antes de deployar

Completar primero el [setup de Supabase](setup-supabase.md), incluyendo migraciones, Auth y la primera ingesta. Si la base no está lista, la app funciona con el fallback live, pero login, agenda y push no van a operar contra datos propios.

Checklist mínimo:

- [ ] Migraciones `0001` y `0002` aplicadas.
- [ ] `app_config` con `app_url` y `cron_secret`.
- [ ] Auth con Site URL y redirect URLs de producción.
- [ ] SMTP propio configurado.
- [ ] Claves VAPID generadas.
- [ ] Repo en GitHub con `package-lock.json` actualizado.
- [ ] `npm run build` pasa en local.

## 2. Importar el proyecto

1. En Vercel: **Add New → Project**.
2. Importar el repositorio.
3. Framework preset: **Next.js** (se detecta solo).
4. Build command: `npm run build`.
5. Install command: `npm install` o `npm ci` (Vercel detecta el lockfile).
6. Node.js: 22.x.
7. Cargar las variables de entorno antes del primer deploy.

## 3. Variables en Vercel

Cargar en **Production** y **Preview**:

| Variable | Ejemplo / notas |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable/anon key |
| `SUPABASE_SERVICE_KEY` | Secret/service key, solo server-side |
| `NEXT_PUBLIC_SITE_URL` | `https://quesale.ar` (sin barra final) |
| `APP_URL` | Igual que la URL pública |
| `TICKETMASTER_API_KEY` | API key de Ticketmaster |
| `EVENTBRITE_TOKEN` | Token de Eventbrite |
| `GCBA_RESOURCE_ID` | `juqdkmgo-1081-resource` si no cambió |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública VAPID |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID |
| `VAPID_SUBJECT` | `mailto:hola@quesale.ar` |
| `CRON_SECRET` | Igual al `cron_secret` de `app_config` |
| `REVALIDATE_SECRET` | Secreto distinto para `/api/revalidate` |

Notas:

- `NEXT_PUBLIC_*` se incorpora en build. Si cambia, hay que redeployar.
- `SUPABASE_SERVICE_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET` y `REVALIDATE_SECRET` nunca deben quedar en el cliente.
- En Preview podés usar el mismo Supabase o uno de staging. Si usás el mismo, evitá correr ingesta desde previews.
- `APP_URL` es la URL que usa el script de ingesta en GitHub Actions para pedir revalidación.

## 4. Deploy

1. Deployar.
2. Abrir `/api/health`.

Ejemplo de respuesta sana:

```json
{
  "ok": true,
  "database": { "connected": true, "activeEvents": 120 },
  "env": {
    "supabaseUrl": true,
    "supabaseAnonKey": true,
    "supabaseServiceKey": true,
    "ticketmaster": true,
    "eventbrite": true,
    "vapidPublic": true,
    "vapidPrivate": true,
    "cronSecret": true
  },
  "latencyMs": 42
}
```

Si devuelve `503`:

- `database.connected: false` → migraciones o claves incorrectas.
- `PGRST205` → falta `0001_init.sql`.
- `42501` → grants/RLS o proyecto equivocado.
- `env.*` en `false` → falta una variable o no se redeployó.

## 5. GitHub Actions

La ingesta corre en GitHub Actions, no en Vercel. Configurar en **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Conexión |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente |
| `SUPABASE_SERVICE_KEY` | Escritura en Supabase |
| `TICKETMASTER_API_KEY` | Fuente Ticketmaster |
| `EVENTBRITE_TOKEN` | Fuente Eventbrite |
| `GCBA_RESOURCE_ID` | Fuente GCBA |
| `APP_URL` | Revalidación de la home |
| `REVALIDATE_SECRET` | Autorización de `/api/revalidate` |
| `CRON_SECRET` | Fallback de autorización |

Workflows incluidos:

| Workflow | Cuándo corre | Qué hace |
| --- | --- | --- |
| `ingest-safe.yml` | Cada 6 horas + manual | Ingesta de fuentes habilitadas |
| `ingest-experimental.yml` | Solo manual | Escribe en `events_staging` |
| `maintenance.yml` | Diario + manual | Cleanup, promote y geocoding |

Primera corrida manual:

1. GitHub → Actions → **Ingesta segura** → **Run workflow**.
2. Usar `limit = 20` y `dry_run = true` para probar.
3. Repetir con `dry_run = false`.
4. Revisar logs y `/api/health`.

## 6. Cron y recordatorios

Vercel Hobby solo permite **un cron diario**, por eso los recordatorios no usan Vercel Cron.

El flujo real es:

```text
Supabase pg_cron (cada 15 min)
  → pg_net POST /api/cron/reminders
    → consulta attendance + push_subscriptions
      → Web Push
        → notification_log (deduplicación)
```

Requisitos:

- `0002_cron.sql` aplicado.
- `app_config.app_url` apuntando a producción.
- `app_config.cron_secret` igual a `CRON_SECRET`.
- `pg_cron` y `pg_net` habilitados.

Ver logs:

```sql
select status, return_message, start_time
from cron.job_run_details
order by start_time desc
limit 20;
```

Probar el endpoint desde tu máquina:

```bash
curl -X POST https://tu-dominio.com/api/cron/reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

En Windows PowerShell:

```powershell
curl.exe -X POST https://tu-dominio.com/api/cron/reminders `
  -H "Authorization: Bearer $env:CRON_SECRET"
```

## 7. Revalidación de caché

Después de una ingesta, `scripts/ingest.ts` llama a `/api/revalidate` si `APP_URL` y el secreto están presentes.

```bash
curl -X POST https://tu-dominio.com/api/revalidate \
  -H "Authorization: Bearer $REVALIDATE_SECRET"
```

La ruta invalida el tag `events` con `revalidateTag("events", "max")`. Si no revalidás, la home puede tardar en mostrar eventos nuevos según el cacheo de Next.

## 8. Límites del plan Hobby

| Límite | Implicancia |
| --- | --- |
| 1 cron por día | Los recordatorios van por Supabase pg_cron |
| Funciones serverless acotadas | La ingesta pesada va a GitHub Actions |
| 5.000 transformaciones de imagen/mes | `images.unoptimized: true`; servimos imágenes de terceros sin optimizar |
| Uso no comercial | Pasar a Pro antes de cobrar o mostrar publicidad |
| Ancho de banda/funciones | Monitorear cuando crezca el tráfico |

La ingesta y el cron están diseñados para no depender de funciones largas de Vercel.

## 9. PWA en producción

- El manifest se sirve como `/manifest.webmanifest`.
- El service worker se sirve desde `/sw.js` y tiene scope raíz.
- El header de `sw.js` fuerza revalidación para que los cambios se tomen rápido.
- En iOS, la instalación es manual: Compartir → Agregar a inicio. Sin eso no hay push.
- Para probar la instalación, usá HTTPS. `localhost` es la excepción permitida por los navegadores.

## 10. Dominio y SMTP

1. Agregar el dominio en Vercel.
2. Configurar DNS según indique Vercel.
3. Actualizar `NEXT_PUBLIC_SITE_URL` y `APP_URL`.
4. Actualizar Supabase Auth:
   - Site URL.
   - Redirect URL `https://tu-dominio.com/auth/callback`.
5. Actualizar `app_config.app_url` con el dominio final.
6. Verificar que el SMTP use un dominio con SPF/DKIM configurados.

## 11. Checklist post-deploy

- [ ] `/` muestra eventos.
- [ ] `/api/health` devuelve `200`.
- [ ] `/ingresar` envía magic link y Google funciona.
- [ ] “Probar sin registrarme” crea una sesión anónima.
- [ ] `/cuenta` muestra agenda, búsquedas y follows.
- [ ] “Asistir” guarda asistencia.
- [ ] Follows de lugar/categoría/ciudad persisten.
- [ ] `/mapa` carga MapLibre y los eventos.
- [ ] `/eventos/<slug>` abre, descarga `.ics` y comparte.
- [ ] PWA instalable desde el navegador.
- [ ] Push activado desde `/cuenta`.
- [ ] `select public.ping_reminders();` responde sin error.
- [ ] GitHub Actions `ingest-safe` termina en verde.
- [ ] `/sitemap.xml` y `/robots.txt` responden.
- [ ] `/legales/terminos`, `/legales/privacidad` y `/fuentes` cargan.

## 12. Rollback

Si un deploy rompe algo:

1. Vercel → Deployments → elegir el deploy anterior → **Promote to Production**.
2. Si el problema es de datos, restaurar backup de Supabase.
3. Si el problema es de schema, no borrar columnas a mano: escribir una migración correctiva.
4. Si el cron falla, desactivar el job:

```sql
select cron.unschedule('que-sale-reminders');
```

El nombre exacto está en `cron.job`. Volver a aplicar `0002_cron.sql` cuando esté resuelto.
