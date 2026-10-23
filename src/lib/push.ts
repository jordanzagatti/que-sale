/**
 * Los endpoints de Web Push vienen del navegador, pero la DB es escribible por
 * cualquier sesión autenticada (incluidas las anónimas). Antes de guardarlos o
 * de hacer un POST desde el cron, descartamos destinos que no sean HTTPS
 * públicos para evitar SSRF contra la red interna o servicios locales.
 */
export function isAllowedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (url.port && url.port !== "443") return false;

    const host = url.hostname.toLowerCase();
    if (!host || host === "localhost") return false;
    if (
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return false;
    }

    // IPv4 e IPv6 literales.
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
