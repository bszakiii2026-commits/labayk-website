"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function SignupForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const inviteId = searchParams.get("invite") || null;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          parent_supervisor_id: inviteId,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setLoading(false);
      setError(
        error.message?.includes("already registered")
          ? "هذا البريد الإلكتروني مسجّل مسبقاً."
          : "تعذر إنشاء الحساب، حاول مجدداً."
      );
      return;
    }

    // إذا كان تأكيد البريد الإلكتروني معطّلاً في إعدادات Supabase، تُفتح
    // الجلسة فوراً ونقوم بإنشاء صف profiles هنا مباشرة.
    if (data.session) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName,
        parent_supervisor_id: inviteId,
        role: "supervisor",
      });
      setLoading(false);
      if (profileError && profileError.code !== "23505") {
        setError("تم إنشاء الحساب لكن حدث خطأ في إعداد الملف الشخصي.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setLoading(false);
    setNotice(
      "تم إرسال رابط تأكيد إلى بريدك الإلكتروني. افتحه لإكمال إنشاء الحساب."
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
      <div className="text-center mb-2">
        <div className="mx-auto w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold mb-3">
          لبيك
        </div>
        <h1 className="text-xl font-bold text-brand-900">إنشاء حساب جديد</h1>
        {inviteId && (
          <p className="text-xs text-brand-600 mt-1">
            ستُضاف كأسرة فرعية تحت المشرف الذي أرسل لك هذا الرابط
          </p>
        )}
      </div>

      <div>
        <label className="label">الاسم الكامل</label>
        <input
          required
          className="input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      <div>
        <label className="label">البريد الإلكتروني</label>
        <input
          type="email"
          required
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          dir="ltr"
        />
      </div>

      <div>
        <label className="label">كلمة المرور</label>
        <input
          type="password"
          required
          minLength={6}
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-brand-700">{notice}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
      </button>

      <p className="text-sm text-center text-brand-800/80">
        لديك حساب؟{" "}
        <Link href="/login" className="text-brand-600 font-medium">
          تسجيل الدخول
        </Link>
      </p>
    </form>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </main>
  );
}
