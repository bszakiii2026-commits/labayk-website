"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addFamilyMember(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "يجب تسجيل الدخول." };

  const full_name = formData.get("full_name")?.toString().trim();
  const relation = formData.get("relation")?.toString().trim() || "ابن/ابنة";
  const grade_level = formData.get("grade_level")?.toString().trim() || null;
  const birth_date = formData.get("birth_date")?.toString() || null;

  if (!full_name) return { error: "الاسم مطلوب." };

  const { error } = await supabase.from("family_members").insert({
    owner_id: user.id,
    full_name,
    relation,
    grade_level,
    birth_date: birth_date || null,
  });

  if (error) return { error: "تعذّرت إضافة الفرد، حاول مجدداً." };

  revalidatePath("/dashboard/family");
  return { success: true };
}

export async function deleteFamilyMember(memberId) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("family_members")
    .delete()
    .eq("id", memberId);

  if (error) return { error: "تعذّر الحذف." };
  revalidatePath("/dashboard/family");
  return { success: true };
}
