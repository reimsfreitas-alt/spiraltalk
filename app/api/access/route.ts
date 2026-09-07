import { NextResponse } from "next/server";
import { getAuthenticatedUser, hasActiveSpiralSubscription } from "@/lib/access";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.email) return NextResponse.json({ authenticated: false, active: false }, { status: 401 });

    const active = await hasActiveSpiralSubscription(user.email);
    return NextResponse.json({ authenticated: true, active });
  } catch {
    return NextResponse.json({ authenticated: true, active: false, error: "access_check_unavailable" }, { status: 503 });
  }
}
