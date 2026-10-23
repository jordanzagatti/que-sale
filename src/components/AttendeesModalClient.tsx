"use client";

import { useState } from "react";

import { AttendeesModal } from "@/components/AttendeesModal";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AttendeesModalClient({
  eventId,
  createdBy,
}: {
  eventId: string;
  createdBy?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [allowed, setAllowed] = useState(false);

  async function check() {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (userId && createdBy && userId === createdBy) {
      setAllowed(true);
      setOpen(true);
      return;
    }
    setAllowed(false);
  }

  if (!createdBy) return null;

  return (
    <>
      <button
        onClick={check}
        className="mt-3 text-xs font-medium text-violet-300 hover:text-violet-200"
      >
        Ver asistentes
      </button>
      {allowed ? <AttendeesModal eventId={eventId} open={open} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
