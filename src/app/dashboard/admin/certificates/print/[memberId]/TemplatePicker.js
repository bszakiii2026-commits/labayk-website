"use client";

import { useRouter } from "next/navigation";

export default function TemplatePicker({ templates, currentTemplateId, memberId, year, rank }) {
  const router = useRouter();

  function buildUrl(templateId) {
    const params = new URLSearchParams();
    params.set("template", templateId);
    if (year) params.set("year", year);
    if (rank) params.set("rank", rank);
    return `/dashboard/admin/certificates/print/${memberId}?${params.toString()}`;
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
