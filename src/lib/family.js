import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// يجمع كل حسابات المشرفين الموجودة أسفل حساب معيّن في الهرم (أبناء، أحفاد...)
// عبر تصفح parent_supervisor_id طبقة بعد طبقة.
export const getDescendantSupervisorIds = cache(async function getDescendantSupervisorIds(
  rootProfileId
) {
  const supabase = await createClient();
  const ids = [rootProfileId];
  let frontier = [rootProfileId];

  for (let depth = 0; depth < 8 && frontier.length > 0; depth++) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .in("parent_supervisor_id", frontier);

    const nextIds = (data || []).map((p) => p.id).filter((id) => !ids.includes(id));
    if (nextIds.length === 0) break;
    ids.push(...nextIds);
    frontier = nextIds;
  }

  return ids;
});

// يرجع كل أفراد العائلة المرئيين لحساب معيّن: أبناؤه المباشرون + كل أبناء
// الحسابات الفرعية تحته، مع اسم المشرف المسؤول عن كل فرد.
export const getVisibleFamilyMembers = cache(async function getVisibleFamilyMembers(
  rootProfileId
) {
  const supabase = await createClient();
  const supervisorIds = await getDescendantSupervisorIds(rootProfileId);

  const { data: supervisors } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", supervisorIds);

  const supervisorNameById = Object.fromEntries(
    (supervisors || []).map((s) => [s.id, s.full_name])
  );

  const { data: members, error } = await supabase
    .from("family_members")
    .select("*")
    .in("owner_id", supervisorIds)
    .order("created_at", { ascending: true });

  return {
    members: (members || []).map((m) => ({
      ...m,
      owner_name: supervisorNameById[m.owner_id] || "",
    })),
    error,
  };
});
