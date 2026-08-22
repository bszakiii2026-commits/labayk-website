import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { resolveSchoolYear } from "@/lib/schoolYear";
import YearSwitcher from "@/components/YearSwitcher";
import RankingSearch from "@/components/RankingSearch";
import BackButton from "@/components/BackButton";

export default async function RankingPage({ searchParams }) {
  const { year } = (await searchParams) || {};
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();

  // الاستعلامات الأربعة التالية مستقلة عن بعضها، فتُنفَّذ بالتوازي بدل
  // التتابع لتقليل زمن تحميل الصفحة.
  const [{ schoolYear, years }, membersRes, ownersRes, templatesRes] = await Promise.all([
    resolveSchoolYear(year),
    supabase
      .from("family_members")
      .select("id, full_name, grade_level, owner_id")
      .eq("is_student", true),
    supabase.from("profiles").select("id, full_name"),
    supabase.from("certificate_templates").select("id", { count: "exact", head: true }),
  ]);

  const members = membersRes.data;
  const owners = ownersRes.data;
  const templatesCount = templatesRes.count;

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
      <BackButton href="/dashboard" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">
            لوحة الترتيب والتكريم
          </h1>
          <p className="text-brand-700/80 mt-1">
            الترتيب حسب المستوى الدراسي بناءً على المعدل السنوي (متوسط
            الفصول المرفوعة)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <YearSwitcher years={years} currentYear={schoolYear} />
          <a
            href={`/dashboard/admin/ranking/export?year=${encodeURIComponent(schoolYear)}`}
            className="btn-secondary"
          >
            تصدير CSV
          </a>
        </div>
      </div>

      <RankingSearch
        groups={groups}
        schoolYear={schoolYear}
        hasTemplates={(templatesCount || 0) > 0}
      />
    </div>
  );
}
