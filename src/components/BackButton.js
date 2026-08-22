"use client";

import { useRouter } from "next/navigation";

// زر رجوع موحّد لكل الصفحات الداخلية. إن مُرّر href يذهب إليه مباشرة (مفيد
// لصفحات ثابتة الوجهة)، وإلا يستعمل تاريخ المتصفح (router.back()). مساحة
// اللمس موسّعة (py-2) خصوصاً للهاتف.
export default function BackButton({ href, label = "رجوع" }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => (href ? router.push(href) : router.back())}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline py-2 -my-2 -mx-1 px-1"
    >
      <span aria-hidden="true">←</span>
      {label}
    </button>
  );
}
