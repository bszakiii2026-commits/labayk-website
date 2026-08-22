import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { resolveSchoolYear } from "@/lib/schoolYear";
import ScanEditor from "@/components/ScanEditor";
import BackButton from "@/components/BackButton";

export default async function ReportPage({ params, searchParams }) {
  const { memberId, trimester } = await params;
  const { year } = (await searchParams) || {};
  const trimesterNum = Number(trimester);
  const supabase = await createClient();

  // ثلاثة استعلامات مستقلة عن بعضها، تُنفَّذ بالتوازي بدل التتابع.
  const [profile, memberRes, { schoolYear }] = await Promise.all([
    getCurrentProfile(),
    supabase.from("family_members").select("*").eq("id", memberId).maybeSingle(),
    resolveSchoolYear(year),
  ]);

  const member = memberRes.data;
  if (!member || ![1, 2, 3].includes(trimesterNum)) notFound();

  const canManage = member.owner_id === profile?.id;

  const { data: report } = await supabase
    .from("report_cards")
    .select("*")
    .eq("family_member_id", memberId)
    .eq("school_year", schoolYear)
    .eq("trimester", trimesterNum)
    .maybeSingle();

  let existingImageUrl = null;
  if (report?.image_path) {
    const { data: signed } = await supabase.storage
      .from("report-cards")
      .createSignedUrl(report.image_path, 3600);
    existingImageUrl = signed?.signedUrl || null;
  }

  return (
    <div className="space-y-4">
      <BackButton
        href={`/dashboard/family/${memberId}?year=${encodeURIComponent(schoolYear)}`}
        label="عودة إلى الملف"
      />
      <ScanEditor
        memberId={memberId}
        memberName={member.full_name}
        schoolYear={schoolYear}
        trimester={trimesterNum}
        canManage={canManage}
        existingImageUrl={existingImageUrl}
        existingManualAverage={report?.manual_average ?? null}
        existingExtractedAverage={report?.extracted_average ?? null}
      />
    </div>
  );
}
