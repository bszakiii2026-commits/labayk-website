import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { resolveSchoolYear, TRIMESTER_LABELS } from "@/lib/schoolYear";
import DeleteMemberButton from "./DeleteMemberButton";
import YearSwitcher from "@/components/YearSwitcher";
import BackButton from "@/components/BackButton";

export default async function MemberPage({ params, searchParams }) {
  const { memberId } = await params;
  const { year } = (await searchParams) || {};
  const supabase = await createClient();

  // ثلاثة استعلامات مستقلة عن بعضها (الملف الشخصي، الفرد، السنة الدراسية)
  // تُنفَّذ بالتوازي بدل التتابع.
  const [profile, memberRes, { schoolYear, years }] = await Promise.all([
    getCurrentProfile(),
    supabase.from("family_members").select("*").eq("id", memberId).maybeSingle(),
    resolveSchoolYear(year),
  ]);

  const member = memberRes.data;
  if (!member) notFound();

  const canManage = member.owner_id === profile?.id;

  const { data: reports } = await supabase
    .from("report_cards")
    .select("*")
    .eq("family_member_id", memberId)
    .eq("school_year", schoolYear);

  const reportByTrimester = Object.fromEntries(
    (reports || []).map((r) => [r.trimester, r])
  );

  const averages = [1, 2, 3]
    .map((t) => reportByTrimester[t])
    .map((r) => (r ? r.manual_average ?? r.extracted_average : null))
    .filter((v) => v != null);
  const annualAverage = averages.length
    ? (averages.reduce((a, b) => a + Number(b), 0) / averages.length).toFixed(2)
    : null;

  return (
    <div className="space-y-6">
      <BackButton href="/dashboard/family" label="عودة إلى عائلتي" />

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">
            {member.full_name}
          </h1>
          <p className="text-brand-700/80">
            {member.relation} · {member.grade_level || "بدون مستوى دراسي"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <YearSwitcher years={years} currentYear={schoolYear} />
          {canManage && <DeleteMemberButton memberId={member.id} />}
        </div>
      </div>

      {annualAverage && (
        <div className="card inline-flex items-center gap-3 bg-brand-50">
          <span className="text-sm text-brand-700/70">المعدل السنوي ({schoolYear})</span>
          <span className="text-xl font-bold text-brand-900">{annualAverage}</span>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((trimester) => {
          const report = reportByTrimester[trimester];
          const average = report?.manual_average ?? report?.extracted_average;
          return (
            <div key={trimester} className="card">
              <h3 className="font-bold text-brand-900">
                {TRIMESTER_LABELS[trimester]}
              </h3>
              <p className="text-sm text-brand-700/70 mt-1">
                {report
                  ? average != null
                    ? `المعدل: ${average}`
                    : "تم رفع الصورة، بانتظار تأكيد المعدل"
                  : "لم يُرفع كشف بعد"}
              </p>
              {canManage ? (
                <Link
                  href={`/dashboard/family/${member.id}/report/${trimester}?year=${encodeURIComponent(schoolYear)}`}
                  className="btn-secondary mt-4 w-full"
                >
                  {report ? "تعديل الكشف" : "رفع كشف النقاط"}
                </Link>
              ) : (
                report && (
                  <Link
                    href={`/dashboard/family/${member.id}/report/${trimester}?year=${encodeURIComponent(schoolYear)}`}
                    className="btn-secondary mt-4 w-full"
                  >
                    عرض الكشف
                  </Link>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
