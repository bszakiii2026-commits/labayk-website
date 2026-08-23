"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

// خانة بحث فوق لوحة الترتيب، تصفّي كل المجموعات (المستويات الدراسية) حسب
// اسم الابن/الابنة أو اسم العائلة (المشرف). تُخفي المجموعات الفارغة بعد
// التصفية فقط.
export default function RankingSearch({ groups, schoolYear, hasTemplates }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const filteredEntries = useMemo(() => {
    return Object.entries(groups)
      .map(([gradeLevel, list]) => {
        const filtered = normalizedQuery
          ? list.filter(
              (row) =>
                row.full_name.toLowerCase().includes(normalizedQuery) ||
                row.owner_name.toLowerCase().includes(normalizedQuery)
            )
          : list;
        return [gradeLevel, filtered];
      })
      .filter(([, list]) => list.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, normalizedQuery]);

  return (
    <div className="space-y-6">
      <div className="max-w-sm">
        <label className="label">🔍 البحث عن طالب أو عائلة</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="اكتب الاسم..."
          className="input"
        />
      </div>

      {filteredEntries.length === 0 && (
        <div className="card">
          <p className="text-brand-700/70">
            {query.trim()
              ? "لا توجد نتائج مطابقة."
              : "لا توجد بيانات كافية بعد لعرض الترتيب."}
          </p>
        </div>
      )}

      {filteredEntries.map(([gradeLevel, list]) => (
        <div key={gradeLevel} className="card overflow-x-auto">
          <h2 className="font-bold text-brand-900 mb-4">{gradeLevel}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-brand-700/70 border-b border-black/5">
                <th className="pb-2 pr-2">الترتيب</th>
                <th className="pb-2">الاسم</th>
                <th className="pb-2">العائلة</th>
                <th className="pb-2">عدد الفصول المرفوعة</th>
                <th className="pb-2">المعدل السنوي</th>
                {hasTemplates && <th className="pb-2"></th>}
              </tr>
            </thead>
            <tbody>
              {list.map((row, i) => (
                <tr key={row.id} className="border-b border-black/5 last:border-0">
                  <td className="py-3 pr-2 font-bold text-brand-900">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="py-3">{row.full_name}</td>
                  <td className="py-3">{row.owner_name}</td>
                  <td className="py-3">{row.trimesters_uploaded} / 3</td>
                  <td className="py-3 font-bold">{row.annual_average.toFixed(2)}</td>
                  {hasTemplates && (
                    <td className="py-3 text-left">
                      <Link
                        href={`/print/certificate/${row.id}?year=${encodeURIComponent(
                          schoolYear
                        )}&rank=${i + 1}`}
                        className="text-brand-600 font-medium hover:underline"
                      >
                        شهادة 🎓
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
