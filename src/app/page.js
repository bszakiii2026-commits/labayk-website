import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/siteSettings";

export default async function Home() {
  const supabase = await createClient();

  // مستقلان عن بعضهما، فيُنفَّذان بالتوازي بدل التتابع.
  const [
    {
      data: { user },
    },
    { associationName, logoUrl },
  ] = await Promise.all([supabase.auth.getUser(), getSiteSettings()]);

  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={associationName}
            width={64}
            height={64}
            priority
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
