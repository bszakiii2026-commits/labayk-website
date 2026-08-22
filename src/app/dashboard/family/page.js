import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getVisibleFamilyMembers } from "@/lib/family";
import { getCurrentSchoolYear, TRIMESTER_LABELS } from "@/lib/schoolYear";
import { addFamilyMember, deleteFamilyMember } from "./actions";

export default async function FamilyPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const schoolYear = getCurrentSchoolYear();
  const { members } = await getVisibleFamilyMembers(supabase, profile.id);

  const memberIds = members.map((m) => m.id);
  const { data: reportCards } = memberIds.length
    ? await supabase
        .from("report_cards")
        .select("family_member_id, trimester, manual_average, extracted_average")
        .eq("school_year", schoolYear)
        .in("family_member_id", memberIds)
    : { data: [] };

  const reportsByMember = {};
  for (const r of reportCards || []) {
    reportsByMember[r.family_member_id] ??= {};
    reportsByMember[r.family_member_id][r.trimester] = r;
  }

  const ownMembers = members.filter((m) => m.owner_id === profile.id);
  const otherMembers = members.filter((m) => m.owner_id !== profile.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">عائلتي</h1>
        <p className="text-brand-700/80 mt-1">
          السنة الدراسية: {schoolYear}
        </p>
      </div>

      <div className="card">
        <h2 className="font-bold text-brand-900 mb-4">إضافة فرد جديد</h2>
        <form action={addFamilyMember} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">الاسم الكامل</label>
            <input name="full_name" required className="input" />
          </div>
          <div>
            <label className="label">صلة القرابة</label>
            <select name="relation" className="input">
              <option value="ابن">ابن</option>
              <option value="ابنة">ابنة</option>
              <option value="أخ">أخ</option>
              <option value="أخت">أخت</option>
              <option value="آخر">آخر</option>
            </select>
          </div>
          <div>
            <label className="label">المستوى الدراسي</label>
            <input
              name="grade_level"
              placeholder="مثال: السنة الرابعة ابتدائي"
              className="input"
            />
          </div>
          <div>
            <label className="label">تاريخ الميلاد (اختياري)</label>
            <input type="date" name="birth_date" className="input" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              إضافة
            </button>
          </div>
        </form>
      </div>

      <FamilyMembersTable
        title="أبنائي المباشرون"
        members={ownMembers}
        reportsByMember={reportsByMember}
        canManage
      />

      {otherMembers.length > 0 && (
        <FamilyMembersTable
          title="أبناء الأسر الفرعية تحت إشرافي"
          members={otherMembers}
          reportsByMember={reportsByMember}
          canManage={false}
        />
      )}
    </div>
  );
}

function FamilyMembersTable({ title, members, reportsByMember, canManage }) {
  if (members.length === 0 && canManage) {
    return (
      <div className="card">
        <h2 className="font-bold text-brand-900 mb-2">{title}</h2>
        <p className="text-sm text-brand-700/70">لم تُضف أي أسماء بعد.</p>
      </div>
    );
  }
  if (members.length === 0) return null;

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
                {canManage ? (
                  <Link
                    href={`/dashboard/family/${m.id}`}
                    className="text-brand-600 font-medium hover:underline"
                  >
                    فتح الملف
                  </Link>
                ) : (
                  <Link
                    href={`/dashboard/family/${m.id}`}
                    className="text-brand-600 font-medium hover:underline"
                  >
                    عرض
                  </Link>
                )}
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
