import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getSiteSettings } from "@/lib/siteSettings";
import { getAllSchoolYears } from "@/lib/schoolYear";
import BackButton from "@/components/BackButton";
import {
  updateSiteSettings,
  uploadLogo,
  addSchoolYear,
  setActiveSchoolYear,
} from "./actions";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { associationName, logoUrl } = await getSiteSettings(supabase);
  const years = await getAllSchoolYears(supabase);

  return (
    <div className="space-y-6 max-w-2xl">
      <BackButton href="/dashboard" />
      <h1 className="text-2xl font-bold text-brand-900">إعدادات الموقع</h1>

      <div className="card space-y-4">
        <h2 className="font-bold text-brand-900">شعار الجمعية واسمها</h2>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl border border-black/10 bg-brand-50 flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="شعار الجمعية" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs text-brand-700/50">لا يوجد</span>
            )}
          </div>
          <form action={uploadLogo} className="flex flex-col sm:flex-row gap-2 grow">
            <input
              type="file"
              name="logo"
              accept="image/*"
              required
              className="block text-sm grow"
            />
            <button type="submit" className="btn-secondary shrink-0">
              رفع/تغيير الشعار
            </button>
          </form>
        </div>

        <form action={updateSiteSettings} className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-black/5">
          <div className="grow">
            <label className="label">اسم الجمعية</label>
            <input
              name="association_name"
              defaultValue={associationName}
              required
              className="input"
            />
          </div>
          <button type="submit" className="btn-primary shrink-0 self-end">
            حفظ الاسم
          </button>
        </form>
      </div>

      <div className="card space-y-4">
        <h2 className="font-bold text-brand-900">السنوات الدراسية (الأرشيف)</h2>
        <p className="text-sm text-brand-700/70">
          السنة النشطة هي التي تظهر تلقائياً في كل الصفحات؛ يمكن التنقل بين
          سنوات الأرشيف السابقة من زر السنة الدراسية في كل صفحة.
        </p>

        <ul className="divide-y divide-black/5">
          {years.map((y) => (
            <li key={y.label} className="py-2.5 flex items-center justify-between gap-3">
              <span
                className={
                  y.is_active
                    ? "font-bold text-brand-900"
                    : "text-brand-700/80"
                }
              >
                {y.label} {y.is_active && "· نشطة حالياً"}
              </span>
              {!y.is_active && (
                <form action={setActiveSchoolYear}>
                  <input type="hidden" name="label" value={y.label} />
                  <button
                    type="submit"
                    className="text-sm text-brand-600 font-medium hover:underline"
                  >
                    تفعيل كسنة حالية
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>

        <form action={addSchoolYear} className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-black/5">
          <input
            name="label"
            placeholder="مثال: 2027-2028"
            className="input"
            dir="ltr"
          />
          <button type="submit" className="btn-secondary shrink-0">
            إضافة سنة جديدة
          </button>
        </form>
      </div>
    </div>
  );
}
