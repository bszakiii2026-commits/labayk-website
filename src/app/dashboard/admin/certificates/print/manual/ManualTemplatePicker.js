"use client";

import { useRouter } from "next/navigation";

// نفس فكرة TemplatePicker المستعملة لشهادات الطلاب المسجّلين، لكن هذه
// النسخة تحافظ على كل الحقول اليدوية (الاسم، المستوى، المعدل...) في
// الرابط عند تبديل القالب، بدل الاعتماد على memberId من قاعدة البيانات.
export default function ManualTemplatePicker({
  templates,
  currentTemplateId,
  name,
  grade,
  average,
  rank,
  year,
}) {
  const router = useRouter();

  function buildUrl(templateId) {
    const params = new URLSearchParams();
    params.set("template", templateId);
    if (name) params.set("name", name);
    if (grade) params.set("grade", grade);
    if (average) params.set("average", average);
    if (rank) params.set("rank", rank);
    if (year) params.set("year", year);
    return `/dashboard/admin/certificates/print/manual?${params.toString()}`;
  }

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3">
      <label className="inline-flex items-center gap-2 text-sm">
        القالب:
        <select
          value={currentTemplateId}
          onChange={(e) => router.push(buildUrl(e.target.value))}
          className="input w-auto py-1.5 px-3 text-sm"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={() => window.print()} className="btn-primary">
        🖨 طباعة / حفظ PDF
      </button>
    </div>
  );
}
