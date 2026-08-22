import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getCurrentSchoolYear } from "@/lib/schoolYear";
import ScanEditor from "@/components/ScanEditor";

export default async function ReportPage({ params }) {
  const { memberId, trimester } = await params;
  const trimesterNum = Number(trimester);
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data: member } = await supabase
    .from("family_members")
    .select("*")
    .eq("id", memberId)
    .maybeSingle();

  if (!member || ![1, 2, 3].includes(trimesterNum)) notFound();

  const schoolYear = getCurrentSchoolYear();
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
  );
}
