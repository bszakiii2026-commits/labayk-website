"use client";

import { useState } from "react";
import CertificateRender from "./CertificateRender";

// شريط أدوات صفحة طباعة الشهادة: يعرض عنصر اختيار القالب (يُمرَّر عبر
// children من TemplatePicker/ManualTemplatePicker)، وزر "معاينة قبل
// الطباعة" يفتح نافذة عائمة (modal) تُظهر الشهادة تماماً كما ستُطبع —
// بدون أي عناصر أخرى من الصفحة حولها — قبل فتح نافذة الطباعة الفعلية،
// وزر طباعة/حفظ PDF مباشر.
export default function CertificatePrintBar({ template, backgroundImageUrl, data, children }) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <>
      <div className="card flex flex-wrap items-center justify-between gap-3">
        {children}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="btn-secondary"
          >
            👁 معاينة قبل الطباعة
          </button>
          <button type="button" onClick={() => window.print()} className="btn-primary">
            🖨 طباعة / حفظ PDF
          </button>
        </div>
      </div>

      {showPreview && (
        <div
          className="print:hidden fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 sm:p-8"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 max-w-[95vw] max-h-[95vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-bold text-brand-900">
                معاينة الطباعة — هذا هو الشكل النهائي بالضبط
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => window.print()} className="btn-primary text-sm">
                  🖨 طباعة الآن
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="icon-btn text-brand-700 hover:bg-brand-50"
                  aria-label="إغلاق المعاينة"
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{ width: "min(90vw, 900px)" }}>
              <CertificateRender
                template={template}
                backgroundImageUrl={backgroundImageUrl}
                data={data}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
