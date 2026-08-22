"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TRIMESTER_LABELS } from "@/lib/schoolYear";

// خانة بحث + جداول أفراد العائلة. البحث فوري (client-side) بالاسم أو
// المستوى الدراسي أو اسم المشرف.
export default function FamilySearch({ ownMembers, otherMembers, reportsByMember }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  function matches(m) {
    if (!normalizedQuery) return true;
    return (
      m.full_name.toLowerCase().includes(normalizedQuery) ||
      (m.grade_level || "").toLowerCase().includes(normalizedQuery) ||
      (m.owner_name || "").toLowerCase().includes(normalizedQuery)
    );
  }

  const filteredOwn = useMemo(
    () => ownMembers.filter(matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ownMembers, normalizedQuery]
  );
  const filteredOther = useMemo(
    () => otherMembers.filter(matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [otherMembers, normalizedQuery]
  );

  return (
    <div className="space-y-6">
      <div className="max-w-sm">
        <label className="label">🔍 البحث عن ابن/ابنة</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="اكتب الاسم أو المستوى الدراسي..."
          className="input"
        />
      </div>

      <FamilyMembersTable
        title="أبنائي المباشرون"
        members={filteredOwn}
        reportsByMember={reportsByMember}
        canManage
        emptyHint={
          query.trim() ? "لا توجد نتائج مطابقة." : "لم تُضف أي أسماء بعد."
        }
      />

      {otherMembers.length > 0 && (
        <FamilyMembersTable
          title="أبناء الأسر الفرعية تحت إشرافي"
          members={filteredOther}
          reportsByMember={reportsByMember}
          canManage={false}
          emptyHint="لا توجد نتائج مطابقة."
        />
      )}
    </div>
  );
}

function FamilyMembersTable({ title, members, reportsByMember, canManage, emptyHint }) {
  if (members.length === 0) {
    return (
      <div className="card">
        <h2 className="font-bold text-brand-900 mb-2">{title}</h2>
        <p className="text-sm text-brand-700/70">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <h2 className="font-bold text-brand-900 mb-4">{title}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-right text-brand-700/70 border-b border-black/5">
            <th className="pb-2 pr-2">الاسم</th>
            <th className="pb-2">المستوى الدراسي</th>
            {!canManage && <th className="pb-2">المشرف</th>}
            <th className="pb-2">{TRIMESTER_LABELS[1]}</th>
            <th className="pb-2">{TRIMESTER_LABELS[2]}</th>
            <th className="pb-2">{TRIMESTER_LABELS[3]}</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-b border-black/5 last:border-0">
              <td className="py-3 pr-2 font-medium text-brand-900">
                {m.full_name}
                <div className="text-xs text-brand-700/60 font-normal">
                  {m.relation}
                </div>
              </td>
              <td className="py-3">{m.grade_level || "—"}</td>
              {!canManage && <td className="py-3">{m.owner_name}</td>}
              {[1, 2, 3].map((t) => (
                <td key={t} className="py-3">
                  <StatusBadge report={reportsByMember[m.id]?.[t]} />
                </td>
              ))}
              <td className="py-3 text-left">
                <Link
                  href={`/dashboard/family/${m.id}`}
                  className="text-brand-600 font-medium hover:underline"
                >
                  {canManage ? "فتح الملف" : "عرض"}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ report }) {
  const average = report?.manual_average ?? report?.extracted_average;
  if (average != null) {
    return (
      <span className="inline-block rounded-full bg-brand-100 text-brand-800 px-2.5 py-1 text-xs font-medium">
        {average}
      </span>
    );
  }
  if (report) {
    return (
      <span className="inline-block rounded-full bg-gold-400/20 text-gold-600 px-2.5 py-1 text-xs font-medium">
        بانتظار المعدل
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-black/5 text-brand-700/50 px-2.5 py-1 text-xs">
      لم يُرفع
    </span>
  );
}
