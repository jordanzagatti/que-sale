import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Términos de uso de ¿Qué Sale?, la agenda de eventos de Argentina.",
};

export default function TerminosPage() {
  return (
    <article>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
        Legal
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
        Términos y condiciones
      </h1>
      <p className="mt-2 text-xs text-zinc-500">
        Última actualización: 23 de octubre de 2026
      </p>

      <p>
        ¿Qué Sale? es una agenda que reúne información pública sobre eventos en
        Argentina y permite guardarlos, compartirlos y recibir recordatorios.
        Al usar el sitio o la app aceptás estos términos.
      </p>

      <h2>1. Qué hacemos</h2>
      <p>
        Mostramos datos factuales de eventos obtenidos de fuentes públicas y
        APIs: nombre, fecha, lugar, ciudad, categoría, precio cuando está
        disponible y un enlace a la fuente original. No somos productores,
        organizadores ni ticketeras. La compra, reserva, reprogramación o
        cancelación se rige por las condiciones del organizador y de la
        ticketera correspondiente.
      </p>

      <h2>2. Precisión de la información</h2>
      <p>
        Hacemos un esfuerzo razonable para mantener la agenda actualizada, pero
        los horarios, precios, line-ups, direcciones y disponibilidad pueden
        cambiar sin aviso. <strong>Confirmá siempre en la fuente original</strong>{" "}
        antes de comprar una entrada o viajar a un evento.
      </p>

      <h2>3. Cuenta y uso personal</h2>
      <ul>
        <li>
          Podés usar la agenda sin registrarte. Para guardar eventos, búsquedas
          o follows podés iniciar sesión con email, Google o una sesión anónima.
        </li>
        <li>
          Sos responsable de la actividad de tu cuenta y de mantener el acceso
          a tu email.
        </li>
        <li>
          No está permitido usar la app para spam, scraping masivo, eludir
          límites técnicos, intentar acceder a datos de otras personas o
          afectar la disponibilidad del servicio.
        </li>
      </ul>

      <h2>4. Contenido de terceros y marcas</h2>
      <p>
        Las marcas, imágenes, descripciones y enlaces pertenecen a sus
        respectivos titulares. Cuando usamos una imagen de terceros mostramos la
        fuente y enlazamos al sitio original. Si sos titular de un derecho y
        querés que corrijamos o quitemos un contenido, escribinos y lo revisamos.
      </p>

      <h2>5. Enlaces y compras</h2>
      <p>
        Los enlaces a ticketeras o sitios de organizadores son informativos. No
        procesamos pagos en esta etapa. Cualquier compra se realiza fuera de ¿Qué
        Sale? y bajo los términos de ese sitio.
      </p>

      <h2>6. Disponibilidad del servicio</h2>
      <p>
        La agenda se ofrece “tal como está”. Podemos modificar, suspender o
        discontinuar funciones, y no garantizamos disponibilidad ininterrumpida.
        Los recordatorios push dependen del sistema operativo, del navegador y de
        que hayas dado permiso; pueden demorarse o no entregarse.
      </p>

      <h2>7. Propiedad intelectual de la app</h2>
      <p>
        El diseño, el código y la marca ¿Qué Sale? son nuestros. Podés compartir
        enlaces y capturas de eventos para uso personal o periodístico citando
        la fuente. No podés revender la base de datos ni reproducir
        masivamente la agenda sin autorización.
      </p>

      <h2>8. Limitación de responsabilidad</h2>
      <p>
        En la medida permitida por la ley, no somos responsables por daños
        derivados de información desactualizada, cancelaciones, compras
        realizadas en sitios de terceros o interrupciones del servicio.
      </p>

      <h2>9. Cambios</h2>
      <p>
        Podemos actualizar estos términos. La versión vigente es la publicada en
        esta página. Si el cambio es relevante, lo avisamos en la app.
      </p>

      <h2>10. Contacto</h2>
      <p>
        Para consultas, correcciones de datos o reclamos legales escribinos a{" "}
        <a href="mailto:hola@quesale.ar">hola@quesale.ar</a>.
      </p>
    </article>
  );
}
