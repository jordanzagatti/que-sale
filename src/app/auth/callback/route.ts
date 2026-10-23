import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
      ? next
      : "/";

  if (!code) {
    return NextResponse.redirect(
      new URL("/ingresar?error=missing_code", request.url),
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL("/ingresar?error=callback", request.url),
      );
    }

    return NextResponse.redirect(new URL(safeNext, request.url));
  } catch {
    return NextResponse.redirect(
      new URL("/ingresar?error=callback", request.url),
    );
  }
}
