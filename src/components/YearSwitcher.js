"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

// قائمة منسدلة للتنقل بين أرشيف السنوات الدراسية. تُحدّث ?year= في الرابط
// الحالي وتُبقي بقية معطيات البحث (params) كما هي.
export default function YearSwitcher({ years, currentYear }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!years || years.length <= 1) {
    return (
      <span className="text-sm text-brand-700/70">
        السنة الدراسية: <span className="font-medium">{currentYear}</span>
      </span>
    );
  }

  function onChange(e) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-brand-700/80">
      السنة الدراسية:
      <select
        value={currentYear}
        onChange={onChange}
        className="input w-auto py-1.5 px-3 text-sm"
      >
        {years.map((y) => (
          <option key={y.label} value={y.label}>
            {y.label}
            {y.is_active ? " (الحالية)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
