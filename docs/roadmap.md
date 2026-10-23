# Roadmap y monetización

## Visión

¿Qué Sale? quiere ser la agenda de referencia de Argentina: una sola app para descubrir qué hacer, guardar planes y recibir recordatorios, sin depender de Facebook Events ni de tener que revisar diez ticketeras.

La estrategia es construir primero utilidad real y confianza en los datos. La monetización llega después, cuando haya audiencia recurrente y relaciones con organizadores.

## Estado actual

| Fase | Estado | Qué incluye |
| --- | --- | --- |
| 0. Fundación | Hecho | Schema, auth, ingesta, DB-first, PWA, mapa, detalle, legales |
| 1. Lanzamiento | En curso | Calidad de fuentes, 4 ciudades, SEO, operación estable |
| 2. Personalización | Base lista | Agenda, follows, búsquedas, push 24 h / 2 h |
| 3. Crecimiento | Pendiente | Organizadores, contenido, retención, distribución |
| 4. Monetización | Pendiente | Promotions, MercadoPago, reportes |

## Fase 1: lanzamiento (CABA, Córdoba, Rosario, Mendoza)

Objetivo: que una persona encuentre un plan confiable en menos de dos minutos.

### Producto

- [ ] Home con ciudad detectada por IP y selector manual.
- [ ] Búsqueda por texto, categoría, fecha y cercanía.
- [ ] Mapa usable en mobile con clustering.
- [ ] Detalle con datos completos, mapa, `.ics` y link a la fuente.
- [ ] Agenda personal y “Asistir” funcionando contra Supabase.
- [ ] PWA instalable y offline básico.
- [ ] Push 24 h / 2 h probado en Android, iOS instalado y desktop.

### Datos

- [ ] Migraciones aplicadas en producción.
- [ ] Ingesta safe corriendo cada 6 horas.
- [ ] Primera ingesta real y revisión de duplicados.
- [ ] Cobertura mínima por ciudad: 150 eventos futuros.
- [ ] Geocoding de venues principales.
- [ ] Limpieza semanal y monitoreo de `ingestion_runs`.
- [ ] Criterios legales de [`docs/source-policies.md`](source-policies.md) revisados.

### Operación

- [ ] SMTP propio y magic links confiables.
- [ ] Google OAuth verificado.
- [ ] Backups de Supabase.
- [ ] Alertas si `/api/health` falla.
- [ ] Alertas si una fuente lleva 24 horas sin insertar.
- [ ] Dominio y analytics privacy-first.

### Métricas de salida

- 1.000 usuarios únicos mensuales.
- 20% de usuarios con al menos un evento guardado.
- 10% de opt-in a push entre usuarios registrados.
- 30% de clics salientes a fuentes/ticketeras en detalles.
- Menos de 2% de eventos con datos claramente incorrectos.

## Fase 2: personalización y retención

La base ya está implementada; falta validarla con uso real.

- Feed “para vos” según follows, ciudad y eventos guardados.
- Búsquedas guardadas con acceso rápido desde la home.
- Recordatorios 24 h / 2 h y resumen semanal opcional.
- Seguir venue, categoría y ciudad.
- Emails transaccionales mínimos: bienvenida, recordatorio, cambios de cuenta.
- Onboarding de instalación PWA y push en iOS.
- Preferencias de notificación y baja en un clic.

Ideas a medir:

- ¿El feed personalizado aumenta el guardado?
- ¿Los recordatorios aumentan la asistencia real?
- ¿Qué categorías retienen mejor?
- ¿La instalación PWA mejora la recurrencia?

## Fase 3: crecimiento

### Distribución

- SEO por evento, venue, ciudad y categoría.
- Sitemap dinámico y datos estructurados `Event`.
- Páginas de “qué hacer este fin de semana en…”.
- Compartir eventos por WhatsApp.
- Alianzas con venues, productoras y medios locales.

### Organizadores

- Página para reclamar un venue o evento.
- Formulario para enviar eventos.
- Panel simple para editar datos y ver clics.
- Newsletter semanal para audiencia.
- “Destacado” editorial no pago al principio, para aprender qué funciona.

### Calidad

- Detección de duplicados entre fuentes.
- Normalización de venues y direcciones.
- Reporte de datos incorrectos desde el detalle.
- Moderación de eventos promovidos.

## Fase 4: monetización

Principio: **no vender datos personales**. Monetizar visibilidad y herramientas para organizadores, no la audiencia.

### Líneas de ingreso

#### 1. Promociones destacadas

Un organizador paga para destacar un evento o venue durante 7/14/30 días.

- Usa la tabla `promotions` ya creada.
- Campos: `kind`, `status`, `starts_at`, `ends_at`, `budget_cents`, `amount_paid_cents`, `payment_provider`, `payment_id`.
- Se muestran con etiqueta “Promocionado”.
- No alteran el orden orgánico fuera del bloque pago.
- Límite por pantalla para no degradar la experiencia.

#### 2. Suscripción para organizadores

Plan mensual con:

- Panel de eventos.
- Edición de datos y logo.
- Métricas de vistas y clics.
- Publicación de eventos ilimitada.
- Prioridad de revisión.

Precio inicial sugerido: ARS 15.000–40.000/mes según cantidad de eventos y ciudad. Validar con 10 organizadores antes de fijar.

#### 3. Afiliación o comisión por venta

Cuando exista un programa de afiliados con ticketeras, usar links de tracking. Si no hay programa, cobrar por clic calificado o por campaña.

No implementar atribución dudosa ni cookies invasivas.

#### 4. Sponsorship editorial

Un sponsor semanal en el newsletter o en la home, claramente identificado. Requiere audiencia y métricas verificables.

### MercadoPago

Implementar recién en Fase 4:

- **Checkout Pro** para promociones puntuales.
- **Preapproval** para suscripciones mensuales.
- Webhook para confirmar pago y activar `promotions.status = 'active'`.
- Idempotencia por `payment_id`.
- Reembolsos y cancelaciones desde el panel.
- Facturación electrónica y obligaciones fiscales en Argentina.

El flujo técnico esperado:

```text
Organizador elige plan
  → Checkout Pro / Preapproval
    → MercadoPago webhook
      → verificación de firma
        → promotions.status = active
          → evento destacado
```

La tabla `promotions` ya contempla el modelo, pero no hay integración de pagos todavía.

### Precios y costos

| Etapa | Costo | Cuándo pasar al pago |
| --- | --- | --- |
| Vercel Hobby | USD 0 | Antes de uso comercial o publicidad |
| Vercel Pro | USD 20+/mes | Al monetizar |
| Supabase Free | USD 0 | Cuando se acerque a límites de DB/storage o se necesiten backups |
| Supabase Pro | USD 25+/mes | Producción con tráfico real |
| SMTP | USD 0–20/mes | Magic links a escala |
| Dominio | ~USD 10–15/año | Desde el lanzamiento |
| MercadoPago | Comisión por transacción | Solo cuando cobres |

Regla: no lanzar cobros hasta que el ingreso esperado cubra Vercel Pro, Supabase Pro, SMTP y soporte.

### Qué no hacer

- Vender emails o perfiles.
- Publicidad invasiva o pop-ups que rompan la PWA.
- Promociones sin etiqueta.
- Cobrar por “verificar” datos que la fuente ya publica.
- Scraping masivo para vender una base.

## Métricas

### Producto

- Usuarios únicos y recurrentes.
- Eventos vistos por sesión.
- Búsquedas con resultado.
- Guardados y asistencias por usuario.
- Follows por usuario.
- Instalaciones PWA.
- Opt-in y entrega de push.

### Datos

- Eventos activos por ciudad.
- Fuentes con error.
- Duplicados detectados.
- Eventos sin coordenadas.
- Clics salientes por fuente.
- Tiempo desde la publicación de la fuente hasta la ingesta.

### Monetización

- Impresiones y clics de promociones.
- CTR por ubicación.
- Ingreso por organizador.
- Churn de suscripciones.
- Costo de infraestructura por 1.000 usuarios.

## Riesgos

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Cambio de ToS de una fuente | Pérdida de datos o legal | Revisión periódica, fallback y adaptadores desacoplados |
| Imágenes sin licencia | Reclamo legal | Portadas propias para fuentes en revisión |
| Datos desactualizados | Pérdida de confianza | Link a fuente, reporte de errores, ingesta frecuente |
| Push no entregado | Mala experiencia | Estado claro, reintentos, deduplicación |
| Dependencia de Vercel/Supabase | Costos o caída | Monitoreo, backups, migración documentada |
| Baja densidad de eventos | Poca utilidad | Priorizar ciudades y fuentes con mayor cobertura |
| Comercial en Hobby | Suspensión | Pasar a Pro antes de cobrar |

## Próximos 90 días

### Semanas 1–2

- Aplicar migraciones y correr ingesta real.
- Verificar login, agenda, push y PWA end-to-end.
- Configurar SMTP, dominio y GitHub Actions.

### Semanas 3–4

- Medir calidad por ciudad.
- Corregir duplicados y venues.
- Publicar páginas SEO de fin de semana.
- Agregar reporte de datos incorrectos.

### Mes 2

- Entrevistar 10 organizadores.
- Diseñar panel de organizador.
- Evaluar primer sponsor editorial.
- Mejorar feed personalizado.

### Mes 3

- Piloto pago con 3–5 organizadores.
- Implementar MercadoPago Checkout Pro.
- Medir ingreso y costos.
- Decidir pase a Vercel Pro y Supabase Pro.

## Backlog técnico

- [ ] Panel de administración para staging y promociones.
- [ ] Reporte de errores en eventos.
- [ ] Página de venue.
- [ ] Página de ciudad.
- [ ] Newsletter semanal.
- [ ] Analítica privacy-first.
- [ ] Tests E2E de auth, guardado y push.
- [ ] Rate limiting en APIs públicas.
- [ ] Moderación de imágenes.
- [ ] Soporte Apple Sign-In si se publica app nativa.
- [ ] Integración MercadoPago.
- [ ] Facturación y emails de recibo.

## Definición de “listo para monetizar”

- [ ] 10.000 usuarios únicos mensuales o una comunidad muy fiel en 2 ciudades.
- [ ] 30% de retención mensual.
- [ ] 20% de usuarios con evento guardado.
- [ ] Datos estables y fuentes legales revisadas.
- [ ] PWA y push funcionando en iOS y Android.
- [ ] Costos de infraestructura cubiertos por ingresos.
- [ ] Términos, privacidad y facturación listos.
