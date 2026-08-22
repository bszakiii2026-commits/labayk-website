import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// يُستدعى عند الضغط على رابط تأكيد البريد الإلكتروني (إن كان مفعّلاً في
// إعدادات Supabase). يفتح الجلسة، ثم يُنشئ صف profiles إن لم يكن موجوداً
// باستخدام البيانات التي أُرسلت عند التسجيل (full_name, parent_supervisor_id).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    const user = data?.user;
    if (user) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("profiles").insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || "بدون اسم",
          parent_supervisor_id: user.user_metadata?.parent_supervisor_id || null,
          role: "supervisor",
        });
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
