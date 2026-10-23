# Políticas de fuentes y datos

Este documento define qué se puede ingerir, qué se guarda y qué no se publica. La fuente de verdad técnica es [`src/lib/sources/registry.ts`](../src/lib/sources/registry.ts); este archivo explica el criterio operativo y legal.

> Este documento es una guía de producto y operación, no asesoramiento legal. Antes de escalar una fuente o monetizar, conviene una revisión legal específica para Argentina.

## Principios

1. **Datos factuales, no contenido editorial ajeno.** Guardamos título, fecha, lugar, dirección, ciudad, categoría, precio cuando es público, enlace a la fuente y un extracto corto.
2. **Siempre enlazamos a la fuente original.** El usuario tiene que poder confirmar horario, precio, disponibilidad y compra en el sitio del organizador o la ticketera.
3. **No replicamos la experiencia de la ticketera.** No vendemos entradas, no procesamos pagos y no reproducimos largos textos, line-ups editoriales ni galerías.
4. **Respetamos límites y robots.** Cada adaptador tiene `rateLimitMs`; los `fetch` usan un User-Agent identificable cuando corresponde. No se hacen consultas en el request del usuario.
5. **Lo dudoso va a staging.** Si no hay certeza sobre términos o licencia, el adaptador queda con `allowedInProd: false` y escribe en `events_staging`. Nada de staging se sirve en la app.
6. **Corrección y retiro.** Cualquier titular puede pedir corrección o baja escribiendo a `fuentes@quesale.ar`.

## Qué guardamos por evento

| Campo | Qué es | Regla |
| --- | --- | --- |
| `title` | Nombre del evento | Factual |
| `starts_at`, `ends_at` | Fecha y hora | Factual |
| `venue_name`, `address`, `city`, `province` | Lugar | Factual |
| `latitude`, `longitude` | Coordenadas | Geocodificadas o centro de ciudad |
| `category` | Categoría normalizada | Propia |
| `price_text`, `price_min`, `is_free` | Precio público | Factual, sin inventar |
| `source_url` | Página original | Obligatorio cuando existe |
| `ticket_url` | Link de compra | Link, no copia |
| `image_url` | Imagen remota | Solo si la licencia está revisada; si no, portada propia |
| `description` | Extracto | Máximo 360 caracteres, sin HTML |
| `organizer` | Organizador público | Factual |
| `metadata.attribution` | Atribución | Se conserva para trazabilidad |

Las descripciones se recortan en [`src/lib/ingest.ts`](../src/lib/ingest.ts) con `descriptionExcerpt`. Las imágenes de fuentes con `legalStatus !== "ok"` se reemplazan por una portada propia de categoría; la fuente sigue enlazada.

## Estados del registry

| Campo | Significado |
| --- | --- |
| `allowedInProd: true` | El pipeline `safe` puede ejecutarlo |
| `allowedInProd: false` | Solo corre en `experimental` y escribe en staging |
| `legalStatus: "ok"` | Términos y licencia revisados |
| `legalStatus: "review"` | Funciona técnicamente, pero falta completar revisión o hay dudas |
| `legalStatus: "blocked"` | No debe ejecutarse |
| `rateLimitMs` | Pausa mínima entre requests |
| `attribution` | Texto de atribución |

`allowedInProd` y `legalStatus` son cosas distintas: una fuente puede ser técnicamente estable pero seguir en revisión legal. Para un lanzamiento público, la recomendación es no escalar fuentes en `review` hasta cerrar esa revisión; si hay duda, cambiar `allowedInProd` a `false`.

## Matriz de fuentes

### Producción (`safe`)

| ID | Fuente | Método | Estado legal | Cobertura | Notas |
| --- | --- | --- | --- | --- | --- |
| `gcba` | Agenda GCBA | API pública | OK | CABA | API oficial del Gobierno de la Ciudad. Mantener atribución. |
| `ticketmaster` | Ticketmaster | Discovery API | OK | Nacional | Requiere API key. Usar solo datos permitidos por el acuerdo de desarrollador. |
| `eventbrite` | Eventbrite | JSON-LD público | En revisión | Nacional | Se leen páginas de descubrimiento. Revisar ToS antes de escalar. |
| `passline` | Passline | API pública sin doc formal | En revisión | Nacional | Puede bloquear Node/Cloudflare. Bajo volumen y atribución. |
| `cultura` | Cultura Argentina | JSON-LD | En revisión | Nacional | Verificar términos y cobertura provincial. |

### Experimental (staging, nunca público)

| ID | Fuente | Método | Estado | Motivo |
| --- | --- | --- | --- | --- |
| `alternativa` | Alternativa Teatral | JSON-LD | En revisión | Solo JSON-LD; no copiar funciones ni precios internos. |
| `ticketek` | Ticketek | JSON-LD | En revisión | Ticketera; revisar ToS y robots antes de habilitar. |
| `timeout` | Time Out Argentina | JSON-LD | En revisión | Contenido editorial: no copiar descripciones largas ni imágenes. |
| `plateanet` | Plateanet | JSON-LD | En revisión | Ticketera; priorizar link de compra y datos factuales. |

## Pipeline

```text
Fuente
  → adaptador (rate limit)
    → normalización
      → deduplicación por fingerprint
        → geocoding (Georef + cache)
          → safe: public.events
          → experimental: public.events_staging
```

Reglas:

- `safe` solo ejecuta `allowedInProd`.
- `experimental` puede ejecutar todo, pero **siempre** escribe en `events_staging`.
- Promover staging es una acción manual y auditada (`npm run promote`).
- Cada corrida deja registro en `ingestion_runs`.
- La app nunca lee `events_staging`.

## Checklist antes de habilitar una fuente

- [ ] Leí los términos de uso y la política de privacidad de la fuente.
- [ ] Revisé `robots.txt` y las condiciones de la API o del feed.
- [ ] La fuente permite almacenar y mostrar datos factuales.
- [ ] La licencia de imágenes permite hotlink o uso promocional; si no, uso portada propia.
- [ ] No voy a copiar descripciones largas ni contenido editorial.
- [ ] Hay atribución visible y link a la fuente.
- [ ] El rate limit es conservador.
- [ ] Probé `--dry-run` y una corrida limitada.
- [ ] Si es experimental, revisé staging y promoví solo eventos correctos.
- [ ] Dejé registrado el criterio en este documento o en el PR.

## Fuentes que no se deben usar

- Páginas con login, paywall o contenido privado.
- APIs sin autorización o con credenciales de terceros.
- Scraping agresivo de ticketeras para replicar catálogos completos.
- Copia de imágenes, textos o bases de datos sin licencia.
- Datos personales de organizadores o asistentes.

## Pedidos de corrección o baja

Proceso sugerido:

1. Recibir el pedido en `fuentes@quesale.ar` con URL del evento y motivo.
2. Identificar el registro por `source`, `source_id` y `source_url`.
3. Si corresponde, marcar el evento como `status = 'inactive'` o borrarlo.
4. Si el problema es sistémico, deshabilitar la fuente en el registry y redeployar.
5. Responder al solicitante y registrar la decisión.

SQL de baja manual:

```sql
update public.events
set status = 'inactive', updated_at = now()
where source = 'eventbrite'
  and source_id = '<id>';

-- o borrado definitivo
delete from public.events
where source = 'eventbrite'
  and source_id = '<id>';
```

También se puede ocultar sin borrar para conservar trazabilidad. La app solo muestra `status = 'active'`.

## Atribución en la UI

- El detalle del evento enlaza a `source_url` y, si existe, a `ticket_url`.
- La página [`/fuentes`](../src/app/fuentes/page.tsx) lista las fuentes y su estado.
- Los metadatos de ingesta guardan `source_name` y `attribution`.
- Si se agrega una fuente nueva, actualizar el registry y esta matriz.

## Revisión periódica

- Trimestral: revisar términos de las fuentes activas.
- Ante un cambio de HTML/API: pausar la fuente y abrir un issue.
- Ante un reclamo: priorizar la baja y después investigar.
- Antes de monetizar: revisar contratos, licencias de imágenes y condiciones de las APIs.
