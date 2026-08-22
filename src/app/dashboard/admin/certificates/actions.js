"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { defaultCertificateElements } from "@/lib/certificateVariables";

async function requireSuperAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") return null;
  return profile;
}

export async function createTemplate() {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "غير مصرح." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certificate_templates")
    .insert({
      name: "قالب جديد",
      created_by: profile.id,
      elements: defaultCertificateElements(),
    })
    .select("id")
    .single();

  if (error || !data) return { error: "تعذّر إنشاء القالب." };

  revalidatePath("/dashboard/admin/certificates");
  redirect(`/dashboard/admin/certificates/${data.id}`);
}

export async function deleteTemplate(templateId) {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "غير مصرح." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("certificate_templates")
    .delete()
    .eq("id", templateId);

  if (error) return { error: "تعذّر الحذف." };
  revalidatePath("/dashboard/admin/certificates");
  return { success: true };
}

export async function saveTemplate(templateId, patch) {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "غير مصرح." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("certificate_templates")
    .update(patch)
    .eq("id", templateId);

  if (error) return { error: "تعذّر الحفظ." };
  revalidatePath(`/dashboard/admin/certificates/${templateId}`);
  revalidatePath("/dashboard/admin/certificates");
  return { success: true };
}

export async function uploadBackgroundImage(templateId, formData) {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "غير مصرح." };

  const file = formData.get("background");
  if (!file || typeof file === "string" || file.size === 0) {
    return { error: "الرجاء اختيار صورة." };
  }

  const supabase = await createClient();
  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
  const path = `certificates/${templateId}-bg-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("site-assets")
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (uploadError) return { error: "تعذّر رفع الصورة." };

  const { error } = await supabase
    .from("certificate_templates")
    .update({ background_image_path: path })
    .eq("id", templateId);
  if (error) return { error: "تعذّر الحفظ." };

  revalidatePath(`/dashboard/admin/certificates/${templateId}`);
  return { success: true, path };
}

export async function uploadElementImage(templateId, formData) {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "غير مصرح." };

  const file = formData.get("image");
  if (!file || typeof file === "string" || file.size === 0) {
    return { error: "الرجاء اختيار صورة." };
  }

  const supabase = await createClient();
  const ext = (file.name?.split(".").pop() || "png").toLowerCase();
  const path = `certificates/${templateId}-el-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("site-assets")
    .upload(path, file, { upsert: true, contentType: file.type || "image/png" });
  if (uploadError) return { error: "تعذّر رفع الصورة." };

  return { success: true, path };
}
