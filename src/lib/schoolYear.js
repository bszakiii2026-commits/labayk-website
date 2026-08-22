// السنة الدراسية في الجزائر تبدأ في سبتمبر. قبل سبتمبر نعتبر أننا لا زلنا
// في السنة الدراسية التي بدأت في سبتمبر الماضي.
export function getCurrentSchoolYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export const TRIMESTER_LABELS = {
  1: "الفصل الأول",
  2: "الفصل الثاني",
  3: "الفصل الثالث",
};
