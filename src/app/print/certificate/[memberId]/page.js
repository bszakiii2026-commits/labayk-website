import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getSiteSettings } from "@/lib/siteSettings";
import { resolveSchoolYear } from "@/lib/schoolYear";
import { resolveCertificateAssetUrl } from "@/lib/certificateVariables";
import CertificateRender from "@/components/CertificateRender";
import BackButton from "@/components/BackButton";
import TemplatePicker from "./TemplatePicker";

// صفحة الطباعة خارج تخطيط لوحة التحكم (/dashboard) عمداً — حتى لا يظهر
// الشريط الجانبي/السفلي داخل نتيجة الطباعة أو حفظ PDF (كانت المشكلة أن
// أي صفحة تحت /dashboard ترث تلقائياً شريط التنقل من dashboard/layout.js).
export default async function CertificatePrintPage({ params, searchParams }) {
  const { memberId } = await params;
  const { year, rank, template: templateId } = (await searchParams) || {};

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();

  // أربعة استعلامات مستقلة عن بعضها، تُنفَّذ بالتوازي بدل التتابع.
  const [memberRes, { schoolYear }, templatesRes, { associationName, logoUrl }] = await Promise.all([
    supabase.from("family_members").select("id, full_name, grade_level").eq("id", memberId).maybeSingle(),
    resolveSchoolYear(year),
    supabase
      .from("certificate_templates")
      .select("id, name, orientation, background_color, background_image_path, elements, updated_at")
      .order("updated_at", { ascending: false }),
    getSiteSettings(),
  ]);

  const member = memberRes.data;
  if (!member) notFound();

  const { data: reports } = await supabase
    .from("report_cards")
    .select("manual_average, extracted_average")
    .eq("family_member_id", memberId)
    .eq("school_year", schoolYear);

  const values = (reports || [])
    .map((r) => r.manual_average ?? r.extracted_average)
    .filter((v) => v != null)
    .map(Number);
  const annualAverage = values.length
    ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
    : "—";

  const templates = templatesRes.data;

  if (!templates || templates.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <BackButton href="/dashboard/admin/ranking" />
        <div className="card">
          <p className="text-brand-700/70">
            لا يوجد أي قالب شهادة بعد.{" "}
            <a href="/dashboard/admin/certificates" className="text-brand-600 underline">
              أنشئ قالباً أولاً من صفحة قوالب الشهادات
            </a>
            .
          </p>
        </div>
      </div>
    );
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
    name: member.full_name,
    grade_level: member.grade_level || "",
    average: annualAverage,
    rank: rank || "",
    school_year: schoolYear,
    association_name: associationName,
  };

  const renderTemplate = { ...activeTemplate, elements: elementsWithSrc };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4 print:p-0 print:m-0 print:max-w-none print:space-y-0">
      <div className="print:hidden space-y-4">
        <BackButton href="/dashboard/admin/ranking" />
        <TemplatePicker
          templates={templates.map((t) => ({ id: t.id, name: t.name }))}
          currentTemplateId={activeTemplate.id}
          memberId={memberId}
          year={schoolYear}
          rank={rank}
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
