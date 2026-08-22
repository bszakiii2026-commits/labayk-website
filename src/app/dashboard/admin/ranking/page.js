import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getCurrentSchoolYear } from "@/lib/schoolYear";

export default async function RankingPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const schoolYear = getCurrentSchoolYear();

  const { data: members } = await supabase
    .from("family_members")
    .select("id, full_name, grade_level, owner_id")
    .eq("is_student", true);

  const { data: owners } = await supabase.from("profiles").select("id, full_name");
  const ownerNameById = Object.fromEntries((owners || []).map((o) => [o.id, o.full_name]));

  const memberIds = (members || []).map((m) => m.id);
  const { data: reportCards } = memberIds.length
    ? await supabase
        .from("report_cards")
        .select("family_member_id, trimester, manual_average, extracted_average")
        .eq("school_year", schoolYear)
        .in("family_member_id", memberIds)
    : { data: [] };

  const reportsByMember = {};
  for (const r of reportCards || []) {
    const avg = r.manual_average ?? r.extracted_average;
    if (avg == null) continue;
    reportsByMember[r.family_member_id] ??= [];
    reportsByMember[r.family_member_id].push(Number(avg));
  }

  const rows = (members || [])
    .map((m) => {
      const values = reportsByMember[m.id] || [];
      const annualAverage = values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null;
      return {
        ...m,
        owner_name: ownerNameById[m.owner_id] || "",
        trimesters_uploaded: values.length,
        annual_average: annualAverage,
      };
    })
    .filter((r) => r.annual_average != null);

  const groups = {};
  for (const row of rows) {
    const key = row.grade_level || "بدون مستوى محدد";
    groups[key] ??= [];
    groups[key].push(row);
  }
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => b.annual_average - a.annual_average);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">
            لوحة الترتيب والتكريم
          </h1>
          <p className="text-brand-700/80 mt-1">
            السنة الدراسية: {schoolYear} · الترتيب حسب المستوى الدراسي بناءً
            على المعدل السنوي (متوسط الفصول المرفوعة)
          </p>
        </div>
        <Link href="/dashboard/admin/ranking/export" className="btn-secondary">
          تصدير CSV
        </Link>
      </div>

      {Object.keys(groups).length === 0 && (
        <div className="card">
          <p className="text-brand-700/70">لا توجد بيانات كافية بعد لعرض الترتيب.</p>
        </div>
      )}

      {Object.entries(groups).map(([gradeLevel, list]) => (
        <div key={gradeLevel} className="card overflow-x-auto">
          <h2 className="font-bold text-brand-900 mb-4">{gradeLevel}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-brand-700/70 border-b border-black/5">
                <th className="pb-2 pr-2">الترتيب</th>
                <th className="pb-2">الاسم</th>
                <th className="pb-2">العائلة</th>
                <th className="pb-2">عدد الفصول المرفوعة</th>
                <th className="pb-2">المعدل السنوي</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row, i) => (
                <tr key={row.id} className="border-b border-black/5 last:border-0">
                  <td className="py-3 pr-2 font-bold text-brand-900">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="py-3">{row.full_name}</td>
                  <td className="py-3">{row.owner_name}</td>
                  <td className="py-3">{row.trimesters_uploaded} / 3</td>
                  <td className="py-3 font-bold">{row.annual_average.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
