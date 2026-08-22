import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/siteSettings";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  const { associationName, logoUrl } = await getSiteSettings(supabase);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={associationName}
            className="mx-auto w-16 h-16 rounded-2xl object-contain bg-brand-50 border border-black/5"
          />
        ) : (
          <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-2xl font-bold">
            لبيك
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-brand-900">
            {associationName}
          </h1>
          <p className="mt-2 text-brand-700/80">
            منصة خاصة بأفراد العائلة لمتابعة كشوف النقاط الدراسية للأبناء
            وتكريم المتفوقين كل سنة.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link href="/login" className="btn-primary">
            تسجيل الدخول
          </Link>
          <Link href="/signup" className="btn-secondary">
            إنشاء حساب جديد
          </Link>
        </div>
      </div>
    </main>
  );
}
