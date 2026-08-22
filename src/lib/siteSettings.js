// القيم الافتراضية لألوان الموقع (تُستعمل إن لم يُخصّص المشرف العام شيئاً،
// أو قبل تنفيذ migration_003). يجب أن تُطابق القيم الافتراضية في globals.css
export const DEFAULT_THEME = {
  bg: "#eae3d3",
  ink: "#1c1814",
  primary: "#a97a2c",
  accent: "#e2775f",
};

// يقرأ إعدادات الموقع (اسم الجمعية + رابط الشعار العام). آمن الاستدعاء حتى
// لو لم يُنفَّذ migration_002 بعد (يرجع القيم الافتراضية بدل الفشل).
export async function getSiteSettings(supabase) {
  const { data } = await supabase
    .from("site_settings")
    .select("association_name, logo_path")
    .eq("id", true)
    .maybeSingle();

  let logoUrl = null;
  if (data?.logo_path) {
    const { data: pub } = supabase.storage
      .from("site-assets")
      .getPublicUrl(data.logo_path);
    logoUrl = pub?.publicUrl || null;
  }

  return {
    associationName: data?.association_name || "جمعية لبيك الخيرية",
    logoUrl,
  };
}

// يقرأ تخصيص ألوان الموقع ويدمجه مع القيم الافتراضية. آمن الاستدعاء حتى لو
// لم يُنفَّذ migration_003 بعد (عمود theme غير موجود بعد).
export async function getSiteTheme(supabase) {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("theme")
      .eq("id", true)
      .maybeSingle();
    return { ...DEFAULT_THEME, ...(data?.theme || {}) };
  } catch {
    return DEFAULT_THEME;
  }
}
