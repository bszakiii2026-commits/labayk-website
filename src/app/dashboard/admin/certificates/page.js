import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import BackButton from "@/components/BackButton";
import { createTemplate } from "./actions";
import DeleteTemplateButton from "./DeleteTemplateButton";

export default async function CertificatesPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("certificate_templates")
    .select("id, name, orientation, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <BackButton href="/dashboard" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">قوالب شهادات التكريم</h1>
          <p className="text-brand-700/80 mt-1">
            صمّم شكل الشهادة (الخلفية، النصوص، الشعار) ثم استعملها لطباعة
            شهادة كل طالب من لوحة الترتيب.
          </p>
        </div>
        <form action={createTemplate}>
          <button type="submit" className="btn-primary">
            + قالب جديد
          </button>
        </form>
      </div>

      {(!templates || templates.length === 0) && (
        <div className="card">
          <p className="text-brand-700/70">لا توجد قوالب بعد. أنشئ أول قالب.</p>
        </div>
      )}

      {templates && templates.length > 0 && (
        <div className="card divide-y divide-black/5">
          {templates.map((t) => (
            <div key={t.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-brand-900">{t.name}</p>
                <p className="text-xs text-brand-700/60">
                  {t.orientation === "portrait" ? "عمودي" : "أفقي"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/dashboard/admin/certificates/${t.id}`}
                  className="text-brand-600 font-medium hover:underline text-sm"
                >
                  فتح المحرر
                </Link>
                <DeleteTemplateButton templateId={t.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
