import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Keeps the Supabase auth session fresh on every request and redirects
// signed-out visitors away from protected /dashboard routes.
export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // صفحات طباعة الشهادات خارج /dashboard عمداً (لتفادي ظهور شريط التنقل
  // في نتيجة الطباعة)، لكنها تبقى محمية بنفس طريقة /dashboard.
  const isProtected = path.startsWith("/dashboard") || path.startsWith("/print");
  const isAuthPage = path === "/login" || path === "/signup";

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
