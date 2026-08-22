import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-2xl font-bold">
          لبيك
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">
            منصة جمعية لبيك الخيرية
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
