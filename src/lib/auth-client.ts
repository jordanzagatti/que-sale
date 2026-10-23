"use client";

import type { User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

let anonymousPromise: Promise<User | null> | null = null;

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
}

/**
 * Cualquier acción social funciona sin registro: si no hay sesión, creamos
 * una cuenta anónima de Supabase. Después la persona puede vincular su email.
 */
export async function ensureUser(): Promise<User> {
  const existing = await getCurrentUser();
  if (existing) return existing;

  if (!anonymousPromise) {
    anonymousPromise = (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      return data.user;
    })().finally(() => {
      anonymousPromise = null;
    });
  }

  const user = await anonymousPromise;
  if (!user) throw new Error("No se pudo crear la sesión anónima");
  return user;
}

export function authErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/anonymous.*disabled|anonymous sign-ins are disabled/i.test(message)) {
    return "Las sesiones anónimas están desactivadas. Entrá con email o Google.";
  }

  if (/provider is not enabled|unsupported provider/i.test(message)) {
    return "Ese proveedor todavía no está configurado en Supabase.";
  }

  if (/rate limit|too many requests/i.test(message)) {
    return "Demasiados intentos. Esperá un minuto y probá de nuevo.";
  }

  return "No pudimos completar la acción. Probá de nuevo.";
}
