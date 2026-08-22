import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Returns the signed-in user's profile row (id, full_name, role,
// parent_supervisor_id) or null if not signed in / profile not created yet.
// ملفوفة بـ cache() حتى لا تُعاد نفس الاستعلامات (auth.getUser + profiles)
// أكثر من مرة عند استدعائها من التخطيط (layout) والصفحة في نفس الطلب.
export const getCurrentProfile = cache(async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, parent_supervisor_id")
    .eq("id", user.id)
    .maybeSingle();

  return profile;
});
