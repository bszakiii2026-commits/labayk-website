// المتغيرات الديناميكية المتاحة داخل نصوص قوالب شهادات التكريم، وطريقة
// تعويضها ببيانات حقيقية (أو بيانات تجريبية أثناء التصميم).
export const CERTIFICATE_PLACEHOLDERS = [
  { key: "{{name}}", label: "اسم الطالب" },
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
    .replaceAll("{{average}}", data.average ?? "")
    .replaceAll("{{rank}}", data.rank ?? "")
    .replaceAll("{{grade_level}}", data.grade_level ?? "")
    .replaceAll("{{school_year}}", data.school_year ?? "")
    .replaceAll("{{association_name}}", data.association_name ?? "");
}

export const SAMPLE_CERTIFICATE_DATA = {
  name: "أحمد بن علي (مثال)",
  average: "17.25",
  rank: "1",
  grade_level: "السنة الخامسة ابتدائي",
  school_year: "2025-2026",
  association_name: "جمعية لبيك الخيرية",
};

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
