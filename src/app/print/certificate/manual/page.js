import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getSiteSettings } from "@/lib/siteSettings";
import { resolveCertificateAssetUrl } from "@/lib/certificateVariables";
import CertificateRender from "@/components/CertificateRender";
import BackButton from "@/components/BackButton";
import ManualTemplatePicker from "./ManualTemplatePicker";

// طباعة شهادة ببيانات يدوية (بدون أي ربط بجدول family_members أو
// report_cards) — البيانات كلها تأتي من رابط الصفحة نفسه (searchParams)
// كما أدخلها المشرف العام في نموذج /dashboard/admin/certificates/manual.
// الصفحة خارج تخطيط /dashboard عمداً — نفس سبب صفحة طباعة شهادة الطالب.
export default async function ManualCertificatePrintPage({ searchParams }) {
  const { name, grade, average, rank, year, date, template: templateId } =
    (await searchParams) || {};

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  if (!name || !templateId) {
    redirect("/dashboard/admin/certificates/manual");
  }

  const supabase = await createClient();

  // استعلامان مستقلان عن بعضهما، يُنفَّذان بالتوازي بدل التتابع.
  const [templatesRes, { associationName, logoUrl }] = await Promise.all([
    supabase
      .from("certificate_templates")
      .select(
        "id, name, orientation, background_color, background_image_path, elements, updated_at"
      )
      .order("updated_at", { ascending: false }),
    getSiteSettings(),
  ]);

  const templates = templatesRes.data;
  if (!templates || templates.length === 0) {
    redirect("/dashboard/admin/certificates");
  }

  const activeTemplate = templates.find((t) => t.id === templateId) || templates[0];

  const backgroundImageUrl = resolveCertificateAssetUrl(
    supabase,
    activeTemplate.background_image_path
  );

  const elementsWithSrc = (activeTemplate.elements || []).map((el) => {
    if (el.type !== "image") return el;
    if (el.imagePath === "__LOGO__") return { ...el, resolvedSrc: logoUrl };
    return { ...el, resolvedSrc: resolveCertificateAssetUrl(supabase, el.imagePath) };
  });

  const data = {
    name,
    date: date || "",
    grade_level: grade || "",
    average: average || "",
    rank: rank || "",
    school_year: year || "",
    association_name: associationName,
  };

  const renderTemplate = { ...activeTemplate, elements: elementsWithSrc };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="print:hidden space-y-4">
        <BackButton
          href="/dashboard/admin/certificates/manual"
          label="تعديل البيانات"
        />
        <ManualTemplatePicker
          templates={templates.map((t) => ({ id: t.id, name: t.name }))}
          currentTemplateId={activeTemplate.id}
          name={name}
          grade={grade}
          average={average}
          rank={rank}
          year={year}
          date={date}
          template={renderTemplate}
          backgroundImageUrl={backgroundImageUrl}
          data={data}
        />
      </div>

      <CertificateRender
        template={renderTemplate}
        backgroundImageUrl={backgroundImageUrl}
        data={data}
      />
    </div>
  );
}
