"use client";

import { useEffect, useState } from "react";

type Attendee = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string;
};

export function AttendeesModal({
  eventId,
  open,
  onClose,
}: {
  eventId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/eventos/${eventId}/attendees`);
        if (!res.ok) {
          setError("No tenés permiso para ver esta lista");
          return;
        }
        const data = (await res.json()) as Attendee[];
        setAttendees(Array.isArray(data) ? data : []);
      } catch {
        setError("No pudimos cargar la lista");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [eventId, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Quien va</h2>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400 hover:text-white"
          >
            Cerrar
          </button>
        </div>
        <div className="mt-4 space-y-2 max-h-[60vh] overflow-auto">
          {loading ? (
            <p className="text-sm text-zinc-500">Cargando...</p>
          ) : error ? (
            <p className="text-sm text-rose-300">{error}</p>
          ) : attendees.length === 0 ? (
            <p className="text-sm text-zinc-500">Nadie se anotó aún</p>
          ) : (
            attendees.map((attendee) => (
              <div
                key={attendee.user_id}
                className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-3 py-2"
              >
                {attendee.avatar_url ? (
                  <img
                    src={attendee.avatar_url}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/20 text-xs font-semibold text-violet-200">
                    {(attendee.display_name || "I").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm text-white">
                    {attendee.display_name || "Invitado"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
