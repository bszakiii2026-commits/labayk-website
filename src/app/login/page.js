"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <div className="text-center mb-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold mb-3">
            لبيك
          </div>
          <h1 className="text-xl font-bold text-brand-900">تسجيل الدخول</h1>
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
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "جارٍ الدخول..." : "دخول"}
        </button>

        <p className="text-sm text-center text-brand-800/80">
          ليس لديك حساب؟{" "}
          <Link href="/signup" className="text-brand-600 font-medium">
            إنشاء حساب جديد
          </Link>
        </p>
      </form>
    </main>
  );
}
