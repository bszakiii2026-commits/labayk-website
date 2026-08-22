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
