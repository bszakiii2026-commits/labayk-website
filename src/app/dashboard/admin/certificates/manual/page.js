import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getActiveSchoolYear } from "@/lib/schoolYear";
import BackButton from "@/components/BackButton";

// نموذج إدخال بيانات شهادة يدوياً — لشخص غير مسجَّل في الموقع كـ"فرد
// عائلة"، أو لطباعة شهادة ببيانات مخصّصة لا تعتمد على كشوف النقاط
// المرفوعة. النموذج يُرسل بطريقة GET حتى يمكن فتح رابط المعاينة نفسه
// أو مشاركته دون الحاجة لأي كود جافاسكربت في هذه الصفحة.
export default async function ManualCertificatePage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();

  const [templatesRes, schoolYear] = await Promise.all([
    supabase
      .from("certificate_templates")
      .select("id, name")
      .order("updated_at", { ascending: false }),
    getActiveSchoolYear(),
  ]);

  const templates = templatesRes.data || [];

  return (
    <div className="space-y-6 max-w-xl">
      <BackButton href="/dashboard/admin/certificates" label="عودة إلى القوالب" />

      <div>
        <h1 className="text-2xl font-bold text-brand-900">شهادة تكريم يدوية</h1>
        <p className="text-brand-700/80 mt-1">
          لطباعة شهادة لشخص غير مسجَّل في الموقع، أو ببيانات مخصّصة لا
          تطابق كشوف النقاط المرفوعة — أدخل البيانات هنا مباشرة، دون
          الحاجة لإضافته كـ"فرد عائلة" في النظام.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="card">
          <p className="text-brand-700/70">
            لا يوجد أي قالب شهادة بعد.{" "}
            <a
              href="/dashboard/admin/certificates"
              className="text-brand-600 underline"
            >
              أنشئ قالباً أولاً من صفحة قوالب الشهادات
            </a>
            .
          </p>
        </div>
      ) : (
        <form
          action="/dashboard/admin/certificates/print/manual"
          method="GET"
          className="card space-y-4"
        >
          <div>
            <label className="label">الاسم الكامل</label>
            <input
              name="name"
              required
              className="input"
              placeholder="مثال: أحمد بن علي"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">المستوى الدراسي</label>
              <input
                name="grade"
                className="input"
                placeholder="مثال: السنة الرابعة ابتدائي"
              />
            </div>
            <div>
              <label className="label">المعدل السنوي</label>
              <input
                name="average"
                className="input"
                placeholder="مثال: 17.25"
              />
            </div>
            <div>
              <label className="label">الترتيب (اختياري)</label>
              <input name="rank" className="input" placeholder="مثال: 1" />
            </div>
            <div>
              <label className="label">السنة الدراسية</label>
              <input
                name="year"
                defaultValue={schoolYear}
                className="input"
                dir="ltr"
              />
            </div>
            <div>
              <label className="label">التاريخ (اختياري)</label>
              <input name="date" type="date" className="input" dir="ltr" />
            </div>
          </div>

          <div>
            <label className="label">القالب</label>
            <select name="template" required className="input">
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-primary w-full">
            معاينة الشهادة
          </button>
        </form>
      )}
    </div>
  );
}
