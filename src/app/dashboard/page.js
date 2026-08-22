import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getActiveSchoolYear } from "@/lib/schoolYear";

export default async function DashboardHome() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return <CompleteProfilePrompt />;
  }

  const supabase = await createClient();

  // ثلاثة استعلامات مستقلة عن بعضها، تُنفَّذ بالتوازي بدل التتابع.
  const [schoolYear, ownMembersRes, subSupervisorsRes] = await Promise.all([
    getActiveSchoolYear(),
    supabase.from("family_members").select("id").eq("owner_id", profile.id),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("parent_supervisor_id", profile.id),
  ]);

  const ownMemberIds = (ownMembersRes.data || []).map((m) => m.id);
  const ownMembersCount = ownMemberIds.length;
  const subSupervisorsCount = subSupervisorsRes.count;

  let uploadedCount = 0;
  if (ownMemberIds.length) {
    const { data: reports } = await supabase
      .from("report_cards")
      .select("family_member_id")
      .eq("school_year", schoolYear)
      .in("family_member_id", ownMemberIds);
    uploadedCount = new Set((reports || []).map((r) => r.family_member_id)).size;
  }

  const completionPct = ownMembersCount
    ? Math.round((uploadedCount / ownMembersCount) * 100)
    : 0;
  const ringCircumference = 2 * Math.PI * 34;
  const ringOffset = ringCircumference * (1 - completionPct / 100);

  return (
    <div className="space-y-6">
      <div className="card-dark relative overflow-hidden">
        <div
          className="absolute -top-10 -start-10 w-56 h-56 rounded-full opacity-40 blur-2xl pointer-events-none"
          style={{ background: "var(--gold-500)" }}
        />
        <div
          className="absolute -bottom-16 -end-6 w-48 h-48 rounded-full opacity-30 blur-2xl pointer-events-none"
          style={{ background: "var(--brand-600)" }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <p className="text-white/60 text-sm">مرحباً بعودتك</p>
            <h1 className="text-2xl font-bold mt-1">{profile.full_name}</h1>
            <p className="text-white/70 text-sm mt-2">
              السنة الدراسية: <span className="font-medium text-white">{schoolYear}</span>
              {" · "}
              {profile.role === "super_admin" ? "مشرف عام (لجنة الجمعية)" : "مشرف عائلة"}
            </p>
          </div>

          {ownMembersCount > 0 && (
            <div className="flex items-center gap-4 shrink-0">
              <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="44" cy="44" r="34" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
                <circle
                  cx="44"
                  cy="44"
                  r="34"
                  fill="none"
                  stroke="var(--gold-500)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              <div>
                <p className="text-2xl font-bold">{completionPct}٪</p>
                <p className="text-white/60 text-xs mt-1">
                  {uploadedCount} من {ownMembersCount} رفعوا كشوفهم
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-brand-700/70">الأبناء تحت إشرافي المباشر</p>
          <p className="text-3xl font-bold text-brand-900 mt-1">{ownMembersCount}</p>
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
        <>
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

          <div className="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-brand-900">إعدادات الموقع</h2>
              <p className="text-sm text-brand-700/70 mt-1">
                شعار الجمعية، اسم الجمعية، ألوان الموقع، وإدارة السنوات الدراسية.
              </p>
            </div>
            <Link href="/dashboard/admin/settings" className="btn-secondary shrink-0">
              فتح الإعدادات
            </Link>
          </div>

          <div className="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-brand-900">شهادات التكريم</h2>
              <p className="text-sm text-brand-700/70 mt-1">
                صمّم قوالب شهادات التكريم واطبعها لكل طالب.
              </p>
            </div>
            <Link href="/dashboard/admin/certificates" className="btn-secondary shrink-0">
              فتح محرر الشهادات
            </Link>
          </div>
        </>
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
