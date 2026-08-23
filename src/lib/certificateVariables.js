// المتغيرات الديناميكية المتاحة داخل نصوص قوالب شهادات التكريم، وطريقة
// تعويضها ببيانات حقيقية (أو بيانات تجريبية أثناء التصميم).
export const CERTIFICATE_PLACEHOLDERS = [
  { key: "{{name}}", label: "اسم الطالب" },
  { key: "{{date}}", label: "التاريخ" },
  { key: "{{average}}", label: "المعدل السنوي" },
  { key: "{{rank}}", label: "الترتيب" },
  { key: "{{grade_level}}", label: "المستوى الدراسي" },
  { key: "{{school_year}}", label: "السنة الدراسية" },
  { key: "{{association_name}}", label: "اسم الجمعية" },
];

export function fillCertificateText(text, data = {}) {
  if (!text) return "";
  return text
    .replaceAll("{{name}}", data.name ?? "")
    .replaceAll("{{date}}", data.date ?? "")
    .replaceAll("{{average}}", data.average ?? "")
    .replaceAll("{{rank}}", data.rank ?? "")
    .replaceAll("{{grade_level}}", data.grade_level ?? "")
    .replaceAll("{{school_year}}", data.school_year ?? "")
    .replaceAll("{{association_name}}", data.association_name ?? "");
}

export const SAMPLE_CERTIFICATE_DATA = {
  name: "أحمد بن علي (مثال)",
  date: "2026-06-15",
  average: "17.25",
  rank: "1",
  grade_level: "السنة الخامسة ابتدائي",
  school_year: "2025-2026",
  association_name: "جمعية لبيك الخيرية",
};

// خطوط عربية إضافية متاحة لعناصر نص شهادة التكريم — بديل عملي لقراءة خطوط
// جهاز الزائر (المتصفحات لا تسمح لصفحة ويب عادية بالوصول لخطوط الجهاز
// المحلية)، فهذه الخطوط تُحمَّل تلقائياً من Google Fonts وتعمل بنفس الشكل
// لأي زائر وعند الطباعة أيضاً. القيمة المخزّنة في fontFamily لكل عنصر نص
// هي "key" من هذه القائمة (أو undefined لخط الموقع الافتراضي Tajawal).
export const CERTIFICATE_FONTS = [
  { key: undefined, label: "افتراضي (Tajawal)", cssVar: null },
  { key: "cairo", label: "Cairo — عصري", cssVar: "--font-cairo" },
  { key: "amiri", label: "Amiri — نسخ كلاسيكي", cssVar: "--font-amiri" },
  { key: "ruqaa", label: "Aref Ruqaa — ديواني/خطّي", cssVar: "--font-ruqaa" },
  { key: "reem_kufi", label: "Reem Kufi — كوفي هندسي", cssVar: "--font-reem-kufi" },
  { key: "marhey", label: "Marhey — دائري مرح", cssVar: "--font-marhey" },
  { key: "lemonada", label: "Lemonada — مستدير عصري", cssVar: "--font-lemonada" },
  { key: "changa", label: "Changa — عريض حديث", cssVar: "--font-changa" },
  { key: "camel", label: "The Year of The Camel", cssVar: "--font-camel" },
];

// يحوّل مفتاح fontFamily المخزّن في عنصر النص إلى قيمة CSS جاهزة للاستعمال
// في style={{fontFamily: ...}}. يُستعمل في كل من محرر القوالب ومعاينة/طباعة
// الشهادة النهائية حتى يتطابق الشكلان دائماً.
export function resolveCertificateFontFamily(fontFamily) {
  const font = CERTIFICATE_FONTS.find((f) => f.key === fontFamily);
  if (!font || !font.cssVar) return undefined;
  return `var(${font.cssVar}), serif`;
}

// يُستعمل لتحويل أي مسار خلفية/عنصر صورة إلى رابط قابل للعرض: إن كان مساراً
// محلياً ضمن مجلد public (يبدأ بـ "/") أو رابطاً كاملاً جاهزاً، يُستعمل كما
// هو مباشرة؛ وإلا يُعتبر مساراً داخل تخزين Supabase (site-assets) ويُحوَّل
// عبر getPublicUrl كالمعتاد. هذا يتيح شحن قوالب جاهزة بخلفيات مرفقة مع كود
// الموقع نفسه، دون الحاجة لرفعها يدوياً إلى Supabase.
export function resolveCertificateAssetUrl(supabase, path) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) {
    return path;
  }
  const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
  return data?.publicUrl || null;
}

// ملاحظة: fontSize مخزّن كوحدة "cqw" (نسبة % من عرض لوحة الشهادة) حتى يبقى
// النص متناسباً مع حجم اللوحة أياً كان حجم الشاشة أو الطباعة.
export function defaultCertificateElements() {
  return [
    {
      id: "el_title",
      type: "text",
      text: "شهادة تكريم",
      xPct: 50,
      yPct: 16,
      wPct: 80,
      fontSize: 5.2,
      fontWeight: "bold",
      color: "#22432c",
      align: "center",
    },
    {
      id: "el_assoc",
      type: "text",
      text: "{{association_name}}",
      xPct: 50,
      yPct: 28,
      wPct: 80,
      fontSize: 2.0,
      fontWeight: "normal",
      color: "#2f6a3f",
      align: "center",
    },
    {
      id: "el_body",
      type: "text",
      text: "تتقدم بأسمى عبارات التهنئة للابن(ة)\n{{name}}\nللمستوى الدراسي {{grade_level}} بمعدل سنوي {{average}}\nللسنة الدراسية {{school_year}}",
      xPct: 50,
      yPct: 55,
      wPct: 80,
      fontSize: 2.6,
      fontWeight: "normal",
      color: "#1f2a24",
      align: "center",
    },
    {
      id: "el_rank",
      type: "text",
      text: "الترتيب: {{rank}}",
      xPct: 50,
      yPct: 84,
      wPct: 60,
      fontSize: 2.0,
      fontWeight: "bold",
      color: "#a87e2c",
      align: "center",
    },
  ];
}
