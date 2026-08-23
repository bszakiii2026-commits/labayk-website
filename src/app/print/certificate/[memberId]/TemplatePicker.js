"use client";

import { useRouter } from "next/navigation";
import CertificatePrintBar from "@/components/CertificatePrintBar";

export default function TemplatePicker({
  templates,
  currentTemplateId,
  memberId,
  year,
  rank,
  template,
  backgroundImageUrl,
  data,
}) {
  const router = useRouter();

  function buildUrl(templateId) {
    const params = new URLSearchParams();
    params.set("template", templateId);
    if (year) params.set("year", year);
    if (rank) params.set("rank", rank);
    return `/print/certificate/${memberId}?${params.toString()}`;
  }

  return (
    <CertificatePrintBar template={template} backgroundImageUrl={backgroundImageUrl} data={data}>
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
    </CertificatePrintBar>
  );
}
