import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getVisibleFamilyMembers } from "@/lib/family";
import { resolveSchoolYear } from "@/lib/schoolYear";
import { addFamilyMember } from "./actions";
import YearSwitcher from "@/components/YearSwitcher";
import FamilySearch from "@/components/FamilySearch";
import BackButton from "@/components/BackButton";

export default async function FamilyPage({ searchParams }) {
  const { year } = (await searchParams) || {};
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const { schoolYear, years } = await resolveSchoolYear(supabase, year);
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
      <BackButton href="/dashboard" />
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">عائلتي</h1>
        </div>
        <YearSwitcher years={years} currentYear={schoolYear} />
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

      <FamilySearch
        ownMembers={ownMembers}
        otherMembers={otherMembers}
        reportsByMember={reportsByMember}
      />
    </div>
  );
}
