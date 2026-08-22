import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getSiteSettings } from "@/lib/siteSettings";
import { getActiveSchoolYear } from "@/lib/schoolYear";
import BackButton from "@/components/BackButton";
import CertificateEditor from "@/components/CertificateEditor";

export default async function CertificateEditorPage({ params }) {
  const { templateId } = await params;
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();

  // ثلاثة استعلامات مستقلة عن بعضها، تُنفَّذ بالتوازي بدل التتابع.
  const [templateRes, { associationName, logoUrl }, schoolYear] = await Promise.all([
    supabase.from("certificate_templates").select("*").eq("id", templateId).maybeSingle(),
    getSiteSettings(),
    getActiveSchoolYear(),
  ]);

  const template = templateRes.data;
  if (!template) notFound();

  let backgroundImageUrl = null;
  if (template.background_image_path) {
    const { data: pub } = supabase.storage
      .from("site-assets")
      .getPublicUrl(template.background_image_path);
    backgroundImageUrl = pub?.publicUrl || null;
  }

  return (
    <div className="space-y-4">
      <BackButton href="/dashboard/admin/certificates" label="عودة إلى القوالب" />
      <CertificateEditor
        template={template}
        backgroundImageUrl={backgroundImageUrl}
        associationLogoUrl={logoUrl}
        associationName={associationName}
        schoolYear={schoolYear}
      />
    </div>
  );
}
