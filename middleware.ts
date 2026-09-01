import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Public acquisition surface: visitors must be able to see the offer
  // and reach the Stripe checkout without signing in first.
  if (path === "/") return response;

  const protectedPath = path.startsWith("/chat");
  if (!user && protectedPath) return NextResponse.redirect(new URL("/login", request.url));
  if (user && path === "/login") return NextResponse.redirect(new URL("/", request.url));

  return response;
}

export const config = { matcher: ["/", "/login", "/chat/:path*"] };
