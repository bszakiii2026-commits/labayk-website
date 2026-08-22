import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getCurrentSchoolYear } from "@/lib/schoolYear";

export default async function DashboardHome() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile) {
    return <CompleteProfilePrompt />;
  }

  const schoolYear = getCurrentSchoolYear();

  const { count: ownMembersCount } = await supabase
    .from("family_members")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", profile.id);

  const { count: subSupervisorsCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("parent_supervisor_id", profile.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">
          مرحباً، {profile.full_name}
        </h1>
        <p className="text-brand-700/80 mt-1">
          السنة الدراسية الحالية: <span className="font-medium">{schoolYear}</span>
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-brand-700/70">الأبناء تحت إشرافي المباشر</p>
          <p className="text-3xl font-bold text-brand-900 mt-1">
            {ownMembersCount || 0}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-brand-700/70">مشرفون فرعيون (أبناء لديهم حساب)</p>
          <p className="text-3xl font-bold text-brand-900 mt-1">
            {subSupervisorsCount || 0}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-brand-700/70">صفتك في المنصة</p>
          <p className="text-lg font-bold text-brand-900 mt-2">
            {profile.role === "super_admin" ? "مشرف عام (لجنة الجمعية)" : "مشرف عائلة"}
          </p>
        </div>
      </div>

      <div className="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-brand-900">إدارة أبنائك وكشوف نقاطهم</h2>
          <p className="text-sm text-brand-700/70 mt-1">
            أضف أبناءك، ثم ارفع صورة كشف النقاط لكل فصل دراسي.
          </p>
        </div>
        <Link href="/dashboard/family" className="btn-primary shrink-0">
          الذهاب إلى عائلتي
        </Link>
      </div>

      {profile.role === "super_admin" && (
        <div className="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-gold-500/40">
          <div>
            <h2 className="font-bold text-brand-900">لوحة المشرف العام</h2>
            <p className="text-sm text-brand-700/70 mt-1">
              اطّلع على ترتيب كل الأبناء حسب المستوى الدراسي لتحضير التكريم.
            </p>
          </div>
          <Link href="/dashboard/admin/ranking" className="btn-secondary shrink-0">
            فتح لوحة الترتيب
          </Link>
        </div>
      )}
    </div>
  );
}

function CompleteProfilePrompt() {
  return (
    <div className="card max-w-md">
      <h2 className="font-bold text-brand-900">إكمال الملف الشخصي</h2>
      <p className="text-sm text-brand-700/70 mt-2">
        لم يتم العثور على ملفك الشخصي بعد. حاول تسجيل الخروج ثم الدخول مجدداً،
        أو تواصل مع المشرف العام إن استمرت المشكلة.
      </p>
    </div>
  );
}
