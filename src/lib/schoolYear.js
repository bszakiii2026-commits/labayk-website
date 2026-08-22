import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// يُعاد تصديره هنا لأن صفحات كثيرة (مكوّنات خادم) تستورده من هذا الملف؛
// المصدر الفعلي في ملف منفصل خالٍ من أي استيراد خاص بالخادم حتى يبقى
// صالحاً للاستعمال من مكوّنات العميل أيضاً (راجع ScanEditor و FamilySearch).
export { TRIMESTER_LABELS } from "./schoolYearLabels";

// دالة احتياطية فقط (تُستعمل إن لم يوجد أي صف بعد في جدول school_years،
// مثلاً قبل تنفيذ migration_002). السنة الدراسية في الجزائر تبدأ في سبتمبر.
function computeDefaultSchoolYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

// يرجع كل السنوات الدراسية المخزّنة (الأحدث أولاً) مع علامة السنة النشطة.
// ملفوفة بـ cache() لتفادي تكرار نفس الاستعلام أكثر من مرة في نفس الطلب.
export const getAllSchoolYears = cache(async function getAllSchoolYears() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("school_years")
    .select("label, is_active, created_at")
    .order("label", { ascending: false });
  return data || [];
});

// يرجع تسمية السنة النشطة حالياً من قاعدة البيانات
export const getActiveSchoolYear = cache(async function getActiveSchoolYear() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("school_years")
    .select("label")
    .eq("is_active", true)
    .maybeSingle();
  return data?.label || computeDefaultSchoolYear();
});

// يحدد السنة الدراسية المطلوب عرضها في صفحة معيّنة: يعتمد على ?year= في
// الرابط إن كانت قيمة صالحة موجودة في الأرشيف، وإلا يرجع السنة النشطة.
// يُستعمل هذا في كل صفحة تدعم التنقل بين سنوات الأرشيف (YearSwitcher).
export const resolveSchoolYear = cache(async function resolveSchoolYear(requestedYear) {
  const years = await getAllSchoolYears();

  if (requestedYear && years.some((y) => y.label === requestedYear)) {
    return { schoolYear: requestedYear, years };
  }

  const active = years.find((y) => y.is_active) || years[0];
  return { schoolYear: active?.label || computeDefaultSchoolYear(), years };
});
