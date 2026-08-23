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

// -----------------------------------------------------------------------
// تنسيق جزئي لكلمة أو جملة داخل نص العنصر (تكبير/تصغير أو سماكة مستقلة عن
// باقي النص) — كل عنصر نص قد يحمل حقل formats اختيارياً: مصفوفة نطاقات
// {start, end, bold, size} بإحداثيات حرفية (character offsets) على النص
// الخام (قبل تعويض المتغيّرات مثل {{name}}). start/end من
// textarea.selectionStart/selectionEnd عند تحديد المستخدم لجزء من النص.

// يبحث عن كل مواضع المتغيّرات الديناميكية ({{name}} إلخ) داخل نص خام،
// ويُرجع مواضعها ونص التعويض الفعلي — يُستعمل لضبط إحداثيات التنسيق
// الجزئي بعد تعويض المتغيّرات (لأن طول القيمة المعوَّضة يختلف عادة عن طول
// "{{name}}" نفسها، فتتزحزح كل الإحداثيات بعدها).
function getPlaceholderMatches(text, data) {
  const keys = CERTIFICATE_PLACEHOLDERS.map((p) => p.key.slice(2, -2));
  const re = new RegExp(`\\{\\{(${keys.join("|")})\\}\\}`, "g");
  const matches = [];
  let m;
  while ((m = re.exec(text))) {
    matches.push({
      start: m.index,
      end: m.index + m[0].length,
      value: String(data?.[m[1]] ?? ""),
    });
  }
  return matches;
}

// يحوّل موضعاً حرفياً في النص الخام إلى موضعه المقابل بعد تعويض المتغيّرات.
// يُرجع null إن وقع الموضع داخل رمز متغيّر ({{...}}) نفسه (حالة نادرة —
// تحديد جزء من متغيّر فقط بدل كامله)، ليتم تجاهل ذلك التنسيق بدل عرضه
// بشكل خاطئ.
function mapRawOffsetToFilled(rawPos, matches) {
  let delta = 0;
  for (const mch of matches) {
    if (mch.end <= rawPos) {
      delta += mch.value.length - (mch.end - mch.start);
    } else if (mch.start < rawPos && rawPos < mch.end) {
      return null;
    } else {
      break;
    }
  }
  return rawPos + delta;
}

// يعوّض المتغيّرات الديناميكية في النص، ويُرجع معه نطاقات التنسيق الجزئي
// (formats) بعد تصحيح إحداثياتها لتطابق النص الجديد بعد التعويض.
export function fillCertificateTextWithFormats(text, data = {}, formats) {
  const filled = fillCertificateText(text, data);
  if (!formats || formats.length === 0) {
    return { text: filled, formats: [] };
  }
  const matches = getPlaceholderMatches(text || "", data);
  const adjusted = formats
    .map((f) => {
      const start = mapRawOffsetToFilled(f.start, matches);
      const end = mapRawOffsetToFilled(f.end, matches);
      if (start === null || end === null) return null;
      return { ...f, start, end };
    })
    .filter((f) => f && f.end > f.start);
  return { text: filled, formats: adjusted };
}

// يُجزّئ نصاً (بعد تعويض المتغيّرات عادة) إلى مقاطع {text, bold, size} بناءً
// على نطاقات التنسيق الجزئي — كل مقطع يُعرض بشكل منفصل (داخل span إن كان له
// تنسيق خاص، أو كنص عادي وإلا). size هو معامل تكبير نسبي (1 = بلا تغيير).
export function splitTextByFormats(text, formats) {
  if (!text) return [];
  if (!formats || formats.length === 0) return [{ text, bold: undefined, size: 1 }];

  const sorted = [...formats]
    .filter((f) => f.end > f.start)
    .sort((a, b) => a.start - b.start);

  const segments = [];
  let pos = 0;
  for (const f of sorted) {
    const start = Math.max(f.start, pos);
    const end = Math.min(f.end, text.length);
    if (start >= end) continue;
    if (start > pos) segments.push({ text: text.slice(pos, start), bold: undefined, size: 1 });
    segments.push({ text: text.slice(start, end), bold: f.bold, size: f.size || 1 });
    pos = end;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), bold: undefined, size: 1 });
  return segments;
}

// عند تعديل نص عنصر يحمل تنسيقاً جزئياً (formats)، تتزحزح إحداثيات
// التنسيق تبعاً لموضع التعديل — هذه الدالة تحسب أقصر تغيير بين النص القديم
// والجديد (أطول بادئة/لاحقة مشتركة) وتُزحزح/تُقلّص نطاقات التنسيق تبعاً
// لذلك، بدل مسحها بالكامل عند أي تعديل بسيط.
export function shiftFormatsOnTextChange(oldText, newText, formats) {
  if (!formats || formats.length === 0) return formats;
  if (oldText === newText) return formats;

  const maxPrefix = Math.min(oldText.length, newText.length);
  let prefix = 0;
  while (prefix < maxPrefix && oldText[prefix] === newText[prefix]) prefix++;

  const maxSuffix = Math.min(oldText.length, newText.length) - prefix;
  let suffix = 0;
  while (
    suffix < maxSuffix &&
    oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
  ) {
    suffix++;
  }

  const oldChangeStart = prefix;
  const oldChangeEnd = oldText.length - suffix;
  const newChangeEnd = newText.length - suffix;
  const delta = newChangeEnd - oldChangeEnd;

  return formats
    .map((f) => {
      const { start, end } = f;
      if (end <= oldChangeStart) return f;
      if (start >= oldChangeEnd) return { ...f, start: start + delta, end: end + delta };
      const newStart = start < oldChangeStart ? start : oldChangeStart;
      const newEnd = end > oldChangeEnd ? end + delta : oldChangeStart;
      if (newEnd <= newStart) return null;
      return { ...f, start: newStart, end: newEnd };
    })
    .filter(Boolean)
    .filter((f) => f.end > f.start);
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
