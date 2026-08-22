"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";

async function requireSuperAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") return null;
  return profile;
}

export async function updateSiteSettings(formData) {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "غير مصرح." };

  const association_name = formData.get("association_name")?.toString().trim();
  if (!association_name) return { error: "اسم الجمعية مطلوب." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .update({ association_name })
    .eq("id", true);

  if (error) return { error: "تعذّر الحفظ." };

  revalidatePath("/dashboard/admin/settings");
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { success: true };
}

export async function uploadLogo(formData) {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "غير مصرح." };

  const file = formData.get("logo");
  if (!file || typeof file === "string" || file.size === 0) {
    return { error: "الرجاء اختيار صورة." };
  }

  const supabase = await createClient();
  const ext = (file.name?.split(".").pop() || "png").toLowerCase();
  const path = `logo/logo-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("site-assets")
    .upload(path, file, { upsert: true, contentType: file.type || "image/png" });
  if (uploadError) return { error: "تعذّر رفع الشعار." };

  const { error } = await supabase
    .from("site_settings")
    .update({ logo_path: path })
    .eq("id", true);
  if (error) return { error: "تعذّر حفظ الشعار." };

  revalidatePath("/dashboard/admin/settings");
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { success: true };
}

export async function addSchoolYear(formData) {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "غير مصرح." };

  const label = formData.get("label")?.toString().trim();
  if (!label || !/^\d{4}-\d{4}$/.test(label)) {
    return { error: "الصيغة يجب أن تكون مثل 2027-2028." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("school_years").insert({ label });
  if (error) {
    if (error.code === "23505") return { error: "هذه السنة موجودة مسبقاً." };
    return { error: "تعذّرت الإضافة." };
  }

  revalidatePath("/dashboard/admin/settings");
  return { success: true };
}

export async function updateTheme(formData) {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "غير مصرح." };

  const theme = {
    bg: formData.get("bg")?.toString() || undefined,
    ink: formData.get("ink")?.toString() || undefined,
    primary: formData.get("primary")?.toString() || undefined,
    accent: formData.get("accent")?.toString() || undefined,
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .update({ theme })
    .eq("id", true);

  if (error) return { error: "تعذّر حفظ الألوان." };

  revalidatePath("/dashboard/admin/settings");
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { success: true };
}

export async function resetTheme() {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "غير مصرح." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .update({ theme: {} })
    .eq("id", true);

  if (error) return { error: "تعذّر إعادة الضبط." };

  revalidatePath("/dashboard/admin/settings");
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { success: true };
}

export async function setActiveSchoolYear(formData) {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "غير مصرح." };

  const label = formData.get("label")?.toString();
  if (!label) return { error: "بيانات ناقصة." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("school_years")
    .update({ is_active: true })
    .eq("label", label);
  if (error) return { error: "تعذّر التفعيل." };

  revalidatePath("/dashboard/admin/settings");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/family");
  revalidatePath("/dashboard/admin/ranking");
  return { success: true };
}
