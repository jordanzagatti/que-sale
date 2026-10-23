import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Cómo ¿Qué Sale? recopila, usa y protege tus datos personales.",
};

export default function PrivacidadPage() {
  return (
    <article>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
        Legal
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
        Política de privacidad
      </h1>
      <p className="mt-2 text-xs text-zinc-500">
        Última actualización: 23 de octubre de 2026
      </p>

      <p>
        Esta política explica qué datos usamos en ¿Qué Sale? y para qué. Tratamos
        los datos personales conforme a la Ley 25.326 de Protección de los Datos
        Personales de Argentina y sus normas complementarias.
      </p>

      <h2>1. Datos que usamos</h2>
      <ul>
        <li>
          <strong>Cuenta:</strong> si ingresás con email o Google, guardamos tu
          identificador de usuario, email, nombre y avatar público que devuelve
          el proveedor. Si usás una sesión anónima, no pedimos email.
        </li>
        <li>
          <strong>Actividad:</strong> eventos que marcás “Voy”, búsquedas
          guardadas, lugares, categorías o ciudades que seguís.
        </li>
        <li>
          <strong>Notificaciones:</strong> endpoint y claves públicas del
          navegador necesarias para enviar push, más una marca de último uso.
        </li>
        <li>
          <strong>Ubicación aproximada:</strong> usamos la ciudad que Vercel
          deriva de tu IP para elegir la agenda inicial. No guardamos tu IP para
          este fin.
        </li>
        <li>
          <strong>Ubicación precisa:</strong> solo si tocás “Cerca mío” y das
          permiso. El navegador nos envía latitud y longitud a la API para
          calcular distancias. No guardamos esas coordenadas en tu perfil.
        </li>
        <li>
          <strong>Datos técnicos:</strong> logs básicos de acceso y errores para
          seguridad y diagnóstico.
        </li>
      </ul>

      <h2>2. Para qué los usamos</h2>
      <ul>
        <li>Mostrar eventos y ordenarlos por cercanía o ciudad.</li>
        <li>Guardar tu agenda, búsquedas y follows.</li>
        <li>Enviar recordatorios 24 horas y 2 horas antes si los activaste.</li>
        <li>Prevenir abuso, mantener la seguridad y corregir errores.</li>
        <li>Entender de forma agregada qué funciona para mejorar el producto.</li>
      </ul>

      <h2>3. Base legal</h2>
      <p>
        Usamos tus datos porque son necesarios para prestarte el servicio que
        pediste, porque diste tu consentimiento (por ejemplo, ubicación precisa y
        push) o porque tenemos un interés legítimo en mantener la app segura.
        Podés retirar el consentimiento en cualquier momento.
      </p>

      <h2>4. Cookies y almacenamiento local</h2>
      <p>
        Usamos cookies de sesión de Supabase para mantener tu login y
        almacenamiento del navegador para el service worker y preferencias
        básicas. No usamos cookies publicitarias de terceros en esta etapa.
      </p>

      <h2>5. Proveedores</h2>
      <p>
        Nos apoyamos en proveedores que procesan datos por nosotros: Supabase
        (base de datos y autenticación), Vercel (hosting y geolocalización
        aproximada por IP), Google (si elegís ese login) y los servicios de push
        del navegador (Google, Apple o Mozilla según el dispositivo). No vendemos
        tus datos personales.
      </p>

      <h2>6. Conservación</h2>
      <p>
        Conservamos tu cuenta y actividad mientras uses el servicio. Si pedís la
        eliminación, borramos tu perfil y los datos asociados, salvo registros
        mínimos que debamos conservar por obligación legal o para resolver
        reclamos. Las suscripciones push inválidas se eliminan automáticamente.
      </p>

      <h2>7. Tus derechos</h2>
      <p>
        Podés solicitar acceso, rectificación, actualización o supresión de tus
        datos, y oponerte a determinados tratamientos. Escribinos a{" "}
        <a href="mailto:privacidad@quesale.ar">privacidad@quesale.ar</a> desde el
        email de tu cuenta. También podés presentar un reclamo ante la Agencia de
        Acceso a la Información Pública (AAIP).
      </p>

      <h2>8. Menores de edad</h2>
      <p>
        La app no está dirigida a menores de 13 años. Si detectamos una cuenta de
        un menor sin autorización, la eliminamos.
      </p>

      <h2>9. Seguridad</h2>
      <p>
        Aplicamos controles de acceso, RLS en la base de datos y cifrado en
        tránsito. Ningún sistema es infalible; si ocurre un incidente relevante,
        lo comunicamos según corresponda.
      </p>

      <h2>10. Cambios</h2>
      <p>
        Podemos actualizar esta política. Publicamos la fecha de la última
        revisión y, si el cambio es sustancial, lo avisamos en la app.
      </p>

      <h2>11. Contacto</h2>
      <p>
        Responsable del tratamiento: ¿Qué Sale? ·{" "}
        <a href="mailto:privacidad@quesale.ar">privacidad@quesale.ar</a>.
      </p>
    </article>
  );
}
