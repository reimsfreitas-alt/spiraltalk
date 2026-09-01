import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const next = url.searchParams.get("next");
    const safeNext = next && next.startsWith("/") ? next : "/";

    if (code) {
      const s = await createServerSupabaseClient();
      const { error } = await s.auth.exchangeCodeForSession(code);
      if (error) return NextResponse.redirect(new URL("/login?error=oauth", req.url));
    }

    return NextResponse.redirect(new URL(safeNext, req.url));
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth", req.url));
  }
}
