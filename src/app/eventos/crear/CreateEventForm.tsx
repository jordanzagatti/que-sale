"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { authErrorMessage, ensureUser } from "@/lib/auth-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/types";

export function CreateEventForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    startsAt: "",
    endsAt: "",
    city: "CABA",
    venue: "",
    address: "",
    category: "Música",
    isFree: true,
    priceText: "Gratis",
    description: "",
    ticketUrl: "",
    imageUrl: "",
    isPrivate: false,
  });

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          router.replace("/ingresar?next=/eventos/crear");
          return;
        }
      } catch {
        router.replace("/ingresar?next=/eventos/crear");
        return;
      }
      setLoading(false);
    };
    void run();
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const user = await ensureUser();
      if (user.is_anonymous) {
        router.replace("/ingresar?next=/eventos/crear");
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const startsAt = new Date(form.startsAt).toISOString();
      const endsAt = form.endsAt ? new Date(form.endsAt).toISOString() : null;
      const slugBase = form.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
      const slug = `${slugBase || "evento"}-${Date.now().toString(36)}`;

      const { error: insertError } = await supabase.from("events").insert({
        created_by: user.id,
        slug,
        title: form.title.trim(),
        normalized_title: form.title.trim().toLowerCase(),
        description: form.description.trim().slice(0, 360) || null,
        category: form.category,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: form.venue.trim() || form.city,
        address: form.address.trim() || null,
        city: form.city.trim(),
        province: "Ciudad Autónoma de Buenos Aires",
        price_text: form.isFree ? "Gratis" : form.priceText.trim() || "Consultar",
        is_free: form.isFree,
        image_url: form.imageUrl.trim() || null,
        source: "user",
        source_url: form.ticketUrl.trim() || null,
        ticket_url: form.ticketUrl.trim() || null,
        fingerprint: `user:${user.id}:${slug}`,
        status: "active",
        is_private: form.isPrivate,
        source_id: `user:${user.id}:${Date.now()}`,
      });

      if (insertError) throw insertError;
      router.push(`/eventos/${slug}`);
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-3xl bg-white/5" />;
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl border border-white/10 bg-zinc-900/40 p-6">
      <div>
        <label className="text-xs text-zinc-400">Título *</label>
        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs text-zinc-400">Inicio *</label>
          <input required type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="text-xs text-zinc-400">Fin (opcional)</label>
          <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs text-zinc-400">Ciudad *</label>
          <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="text-xs text-zinc-400">Lugar</label>
          <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white" />
        </div>
      </div>
      <div>
        <label className="text-xs text-zinc-400">Categoría *</label>
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as EventCategory })} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">
          {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })} />
        Es gratis
      </label>
      {!form.isFree && (
        <div>
          <label className="text-xs text-zinc-400">Precio / Texto</label>
          <input value={form.priceText} onChange={(e) => setForm({ ...form, priceText: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white" />
        </div>
      )}
      <div>
        <label className="text-xs text-zinc-400">Descripción (máx 360)</label>
        <textarea maxLength={360} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 h-24 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white" />
      </div>
      <div>
        <label className="text-xs text-zinc-400">URL de entradas</label>
        <input value={form.ticketUrl} onChange={(e) => setForm({ ...form, ticketUrl: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white" />
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={form.isPrivate} onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })} />
        Evento privado (solo accesible con link compartido)
      </label>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      <button disabled={submitting} className="rounded-full bg-violet-500 px-6 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {submitting ? "Creando..." : "Crear evento"}
      </button>
    </form>
  );
}
