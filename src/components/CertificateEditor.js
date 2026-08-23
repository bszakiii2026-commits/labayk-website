"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CERTIFICATE_PLACEHOLDERS,
  CERTIFICATE_FONTS,
  SAMPLE_CERTIFICATE_DATA,
  fillCertificateTextWithFormats,
  splitTextByFormats,
  shiftFormatsOnTextChange,
  resolveCertificateFontFamily,
  resolveCertificateAssetUrl,
} from "@/lib/certificateVariables";
import {
  saveTemplate,
  uploadBackgroundImage,
  uploadElementImage,
} from "@/app/dashboard/admin/certificates/actions";

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function uid() {
  return "el_" + Math.random().toString(36).slice(2, 10);
}

// أبعاد صفحة A4 الحقيقية بالسنتيمتر — تُستعمل لرسم المسطرة (ruler) أعلى
// وعلى يسار اللوحة، حتى يعرف المصمم القياس الحقيقي لما يضعه قبل الطباعة.
const PAGE_DIMENSIONS_CM = {
  landscape: { w: 29.7, h: 21 },
  portrait: { w: 21, h: 29.7 },
};

const RULER_SIZE = 22; // px
const SNAP_THRESHOLD = 1.4; // % من عرض/ارتفاع اللوحة — مسافة الالتقاط للمحاذاة الذكية
const NUDGE_STEP = 0.5; // % لكل ضغطة سهم
const NUDGE_STEP_FAST = 2; // % مع Shift

export default function CertificateEditor({
  template,
  backgroundImageUrl,
  associationLogoUrl,
  associationName,
  schoolYear,
}) {
  const supabase = createClient();
  const canvasRef = useRef(null);
  const textareaRef = useRef(null);
  const dragRef = useRef(null);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(template.name);
  const [orientation, setOrientation] = useState(template.orientation || "landscape");
  const [backgroundColor, setBackgroundColor] = useState(template.background_color || "#ffffff");
  const [bgImageUrl, setBgImageUrl] = useState(backgroundImageUrl);
  const [elements, setElements] = useState(template.elements || []);
  const [selectedId, setSelectedId] = useState(null);
  const [status, setStatus] = useState("");
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  // خطوط محاذاة ذكية (Smart guides): تظهر أثناء السحب فقط عندما يقترب
  // العنصر من منتصف اللوحة أو من محاذاة عنصر آخر، وتختفي عند الإفلات.
  const [guides, setGuides] = useState({ x: null, y: null });

  const sampleData = useMemo(
    () => ({
      ...SAMPLE_CERTIFICATE_DATA,
      association_name: associationName,
      school_year: schoolYear,
    }),
    [associationName, schoolYear]
  );

  const pageDims = PAGE_DIMENSIONS_CM[orientation] || PAGE_DIMENSIONS_CM.landscape;
  const topTicks = useMemo(
    () => Array.from({ length: Math.floor(pageDims.w) + 1 }, (_, i) => i),
    [pageDims.w]
  );
  const leftTicks = useMemo(
    () => Array.from({ length: Math.floor(pageDims.h) + 1 }, (_, i) => i),
    [pageDims.h]
  );

  const selectedElement = elements.find((el) => el.id === selectedId) || null;

  function updateElement(id, patch) {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...patch } : el)));
  }

  function deleteSelected() {
    if (!selectedId) return;
    setElements((prev) => prev.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  }

  function moveLayer(direction) {
    if (!selectedId) return;
    setElements((prev) => {
      const idx = prev.findIndex((el) => el.id === selectedId);
      const swapWith = direction === "front" ? idx + 1 : idx - 1;
      if (swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  }

  function addTextElement() {
    const el = {
      id: uid(),
      type: "text",
      text: "نص جديد",
      xPct: 50,
      yPct: 50,
      wPct: 60,
      fontSize: 2.4,
      fontWeight: "normal",
      color: "#1f2a24",
      align: "center",
    };
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  }

  function addLogoElement() {
    const el = {
      id: uid(),
      type: "image",
      imagePath: "__LOGO__",
      xPct: 50,
      yPct: 10,
      wPct: 14,
      hPct: 12,
    };
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  }

  async function onAddImageFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingImg(true);
    try {
      const formData = new FormData();
      formData.set("image", file);
      const res = await uploadElementImage(template.id, formData);
      if (res?.path) {
        const el = {
          id: uid(),
          type: "image",
          imagePath: res.path,
          xPct: 50,
          yPct: 50,
          wPct: 25,
          hPct: 20,
        };
        setElements((prev) => [...prev, el]);
        setSelectedId(el.id);
      } else {
        setStatus(res?.error || "تعذّر رفع الصورة.");
      }
    } finally {
      setUploadingImg(false);
    }
  }

  async function onChangeBackgroundImage(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingBg(true);
    try {
      const formData = new FormData();
      formData.set("background", file);
      const res = await uploadBackgroundImage(template.id, formData);
      if (res?.path) {
        const { data: pub } = supabase.storage.from("site-assets").getPublicUrl(res.path);
        setBgImageUrl(pub?.publicUrl || null);
      } else {
        setStatus(res?.error || "تعذّر رفع الخلفية.");
      }
    } finally {
      setUploadingBg(false);
    }
  }

  function removeBackgroundImage() {
    setBgImageUrl(null);
    startTransition(async () => {
      await saveTemplate(template.id, { background_image_path: null });
    });
  }

  function handleSave() {
    setStatus("");
    startTransition(async () => {
      const res = await saveTemplate(template.id, {
        name,
        orientation,
        background_color: backgroundColor,
        elements,
      });
      setStatus(res?.error ? res.error : "تم الحفظ بنجاح ✓");
    });
  }

  // ---------- التعامل مع السحب والتحجيم داخل اللوحة ----------
  function pointerPct(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100),
    };
  }

  // يحاول التقاط (snap) قيمة الإحداثي على منتصف اللوحة (50%) أو على نفس
  // إحداثي عنصر آخر موجود مسبقاً، إن كانت المسافة أقل من عتبة الالتقاط —
  // يشبه خطوط المحاذاة الذكية في أدوات التصميم الاحترافية.
  function snapAxis(axis, value, excludeId) {
    const candidates = [50, ...elements.filter((el) => el.id !== excludeId).map((el) => (axis === "x" ? el.xPct : el.yPct))];
    let best = null;
    let bestDist = SNAP_THRESHOLD;
    for (const c of candidates) {
      const d = Math.abs(value - c);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    return best;
  }

  function onElementPointerDown(e, el) {
    e.stopPropagation();
    setSelectedId(el.id);
    const p = pointerPct(e);
    dragRef.current = { id: el.id, mode: "move", offsetX: p.x - el.xPct, offsetY: p.y - el.yPct };
    canvasRef.current.setPointerCapture(e.pointerId);
  }

  function onHandlePointerDown(e, el) {
    e.stopPropagation();
    setSelectedId(el.id);
    dragRef.current = { id: el.id, mode: "resize" };
    canvasRef.current.setPointerCapture(e.pointerId);
  }

  function onCanvasPointerMove(e) {
    const drag = dragRef.current;
    if (!drag) return;
    const p = pointerPct(e);
    const el = elements.find((x) => x.id === drag.id);
    if (!el) return;

    if (drag.mode === "move") {
      let nx = clamp(p.x - drag.offsetX, 0, 100);
      let ny = clamp(p.y - drag.offsetY, 0, 100);
      const snapX = snapAxis("x", nx, drag.id);
      const snapY = snapAxis("y", ny, drag.id);
      if (snapX !== null) nx = snapX;
      if (snapY !== null) ny = snapY;
      setGuides({ x: snapX, y: snapY });
      updateElement(drag.id, { xPct: nx, yPct: ny });
    } else if (drag.mode === "resize") {
      const patch = { wPct: clamp(Math.abs(p.x - el.xPct) * 2, 5, 100) };
      if (el.type === "image") {
        patch.hPct = clamp(Math.abs(p.y - el.yPct) * 2, 3, 100);
      }
      updateElement(drag.id, patch);
    }
  }

  function onCanvasPointerUp() {
    dragRef.current = null;
    setGuides({ x: null, y: null });
  }

  function onCanvasBackgroundClick(e) {
    if (e.target === canvasRef.current) setSelectedId(null);
  }

  // تحريك العنصر المحدَّد بأسهم لوحة المفاتيح — خطوة صغيرة عادةً، وأكبر مع
  // الضغط على Shift، لضبط دقيق لا يمكن الوصول إليه بالسحب بالفأرة أحياناً.
  function onCanvasKeyDown(e) {
    if (!selectedId) return;
    const step = e.shiftKey ? NUDGE_STEP_FAST : NUDGE_STEP;
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = -step;
    else if (e.key === "ArrowDown") dy = step;
    else return;
    e.preventDefault();
    const el = elements.find((x) => x.id === selectedId);
    if (!el) return;
    updateElement(selectedId, {
      xPct: clamp(el.xPct + dx, 0, 100),
      yPct: clamp(el.yPct + dy, 0, 100),
    });
  }

  function insertPlaceholder(key) {
    if (!selectedElement) return;
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? selectedElement.text.length;
    const end = textarea?.selectionEnd ?? selectedElement.text.length;
    const newText = selectedElement.text.slice(0, start) + key + selectedElement.text.slice(end);
    updateElement(selectedElement.id, { text: newText });
  }

  // ---------- تنسيق جزئي (سماكة/حجم) لكلمة أو جملة محدَّدة داخل النص ----------
  // يقرأ التحديد الحالي من الـ textarea (نفس آلية إدراج المتغيّر أعلاه)،
  // ويطبّق عليه تعديلاً (patchFn) يُرجع {bold, size} الجديدة لهذا النطاق، أو
  // null لإزالة أي تنسيق خاص عن النطاق المحدَّد.
  function applySelectionFormat(patchFn) {
    if (!selectedElement) return;
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? 0;
    const end = textarea?.selectionEnd ?? 0;
    if (start === end) {
      setStatus("حدد كلمة أو جملة من النص أولاً (بالسحب على النص في الصندوق) قبل تنسيقها.");
      return;
    }
    const text = selectedElement.text || "";
    // تجنّب تحديد يقطع منتصف متغيّر ديناميكي مثل {{name}} — يجب تضمينه
    // كاملاً أو تركه خارج التحديد بالكامل.
    for (const p of CERTIFICATE_PLACEHOLDERS) {
      let idx = text.indexOf(p.key);
      while (idx !== -1) {
        const pStart = idx;
        const pEnd = idx + p.key.length;
        const cutsThrough = (start > pStart && start < pEnd) || (end > pStart && end < pEnd);
        if (cutsThrough) {
          setStatus(`لا يمكن تنسيق جزء من متغيّر مثل ${p.key} فقط — حدد المتغيّر كاملاً أو تجنّبه.`);
          return;
        }
        idx = text.indexOf(p.key, idx + 1);
      }
    }

    const existing = selectedElement.formats || [];
    const nonOverlapping = existing.filter((f) => f.end <= start || f.start >= end);
    const covering = existing.find((f) => f.start <= start && f.end >= end);
    const patch = patchFn(covering);
    const isEmpty = !patch || (patch.bold === undefined && (!patch.size || patch.size === 1));
    const merged = isEmpty ? nonOverlapping : [...nonOverlapping, { start, end, ...patch }];
    updateElement(selectedElement.id, { formats: merged });
    setStatus("");
  }

  function toggleSelectionBold() {
    applySelectionFormat((covering) => ({
      bold: covering?.bold === true ? false : true,
      size: covering?.size,
    }));
  }

  function resetSelectionBold() {
    applySelectionFormat((covering) => ({ bold: undefined, size: covering?.size }));
  }

  function resizeSelection(delta) {
    applySelectionFormat((covering) => ({
      bold: covering?.bold,
      size: clamp((covering?.size || 1) + delta, 0.5, 3),
    }));
  }

  function clearSelectionFormat() {
    applySelectionFormat(() => null);
  }

  function elementImageSrc(el) {
    if (el.imagePath === "__LOGO__") return associationLogoUrl;
    return resolveCertificateAssetUrl(supabase, el.imagePath);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input max-w-xs font-bold"
          placeholder="اسم القالب"
        />
        <div className="flex items-center gap-2">
          {status && <span className="text-sm text-brand-700">{status}</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="btn-primary"
          >
            {isPending ? "جارٍ الحفظ..." : "حفظ القالب"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* -------- لوحة الشهادة -------- */}
        <div className="card space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button type="button" onClick={addTextElement} className="btn-secondary text-sm">
              + نص
            </button>
            <button type="button" onClick={addLogoElement} className="btn-secondary text-sm">
              + شعار الجمعية
            </button>
            <label className="btn-secondary text-sm cursor-pointer">
              {uploadingImg ? "جارٍ الرفع..." : "+ صورة"}
              <input type="file" accept="image/*" hidden onChange={onAddImageFile} />
            </label>

            <span className="mx-2 text-black/10">|</span>

            <label className="flex items-center gap-1.5">
              لون الخلفية
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-8 h-8 rounded border border-black/10"
              />
            </label>
            <label className="btn-secondary text-sm cursor-pointer">
              {uploadingBg ? "جارٍ الرفع..." : "صورة خلفية"}
              <input type="file" accept="image/*" hidden onChange={onChangeBackgroundImage} />
            </label>
            {bgImageUrl && (
              <button type="button" onClick={removeBackgroundImage} className="text-xs text-red-600 underline">
                إزالة صورة الخلفية
              </button>
            )}

            <span className="mx-2 text-black/10">|</span>
            <select
              value={orientation}
              onChange={(e) => setOrientation(e.target.value)}
              className="input w-auto py-1.5 px-3 text-sm"
            >
              <option value="landscape">أفقي</option>
              <option value="portrait">عمودي</option>
            </select>
          </div>

          {/* -------- اللوحة + المسطرة (ruler) بمقاس A4 الحقيقي -------- */}
          <div
            className="rounded-xl border border-black/10 overflow-hidden select-none"
            style={{
              display: "grid",
              gridTemplateColumns: `${RULER_SIZE}px 1fr`,
              gridTemplateRows: `${RULER_SIZE}px 1fr`,
            }}
          >
            {/* زاوية علوية */}
            <div className="bg-brand-50 border-b border-l border-black/10" />

            {/* مسطرة أفقية (سم) */}
            <div className="relative bg-brand-50 border-b border-black/10 overflow-hidden">
              {topTicks.map((cm) => (
                <div
                  key={cm}
                  className="absolute top-0 bottom-0 border-l border-black/20"
                  style={{ left: `${(cm / pageDims.w) * 100}%` }}
                >
                  {cm % 5 === 0 && (
                    <span className="absolute top-0.5 right-1 text-[9px] leading-none text-brand-700/70">
                      {cm}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* مسطرة عمودية (سم) */}
            <div className="relative bg-brand-50 border-l border-black/10 overflow-hidden">
              {leftTicks.map((cm) => (
                <div
                  key={cm}
                  className="absolute left-0 right-0 border-t border-black/20"
                  style={{ top: `${(cm / pageDims.h) * 100}%` }}
                >
                  {cm % 5 === 0 && (
                    <span
                      className="absolute left-0.5 top-0.5 text-[9px] leading-none text-brand-700/70"
                      style={{ writingMode: "vertical-rl" }}
                    >
                      {cm}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* لوحة الشهادة نفسها */}
            <div
              ref={canvasRef}
              tabIndex={0}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={onCanvasPointerUp}
              onPointerDown={onCanvasBackgroundClick}
              onKeyDown={onCanvasKeyDown}
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: orientation === "landscape" ? "1.4142" : "0.7071",
                backgroundColor,
                backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                containerType: "inline-size",
                overflow: "hidden",
                touchAction: "none",
                outline: "none",
              }}
            >
              {elements.map((el) => (
                <div
                  key={el.id}
                  onPointerDown={(e) => onElementPointerDown(e, el)}
                  style={{
                    position: "absolute",
                    left: `${el.xPct}%`,
                    top: `${el.yPct}%`,
                    width: `${el.wPct}%`,
                    height: el.type === "image" ? `${el.hPct}%` : undefined,
                    transform: "translate(-50%, -50%)",
                    cursor: "move",
                    outline: selectedId === el.id ? "2px dashed #c69a3c" : "none",
                    outlineOffset: 2,
                  }}
                >
                  {el.type === "text" ? (
                    <p
                      style={{
                        fontSize: `${el.fontSize}cqw`,
                        fontWeight: el.fontWeight,
                        fontFamily: resolveCertificateFontFamily(el.fontFamily),
                        color: el.color,
                        textAlign: el.align,
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.35,
                        margin: 0,
                      }}
                    >
                      {(() => {
                        const { text: filled, formats } = fillCertificateTextWithFormats(
                          el.text,
                          sampleData,
                          el.formats
                        );
                        return splitTextByFormats(filled, formats).map((seg, i) =>
                          seg.bold !== undefined || (seg.size && seg.size !== 1) ? (
                            <span
                              key={i}
                              style={{
                                fontWeight: seg.bold === true ? "bold" : seg.bold === false ? "normal" : undefined,
                                fontSize: seg.size && seg.size !== 1 ? `${seg.size}em` : undefined,
                              }}
                            >
                              {seg.text}
                            </span>
                          ) : (
                            seg.text
                          )
                        );
                      })()}
                    </p>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={elementImageSrc(el) || ""}
                      alt=""
                      draggable={false}
                      style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
                    />
                  )}

                  {selectedId === el.id && (
                    <div
                      onPointerDown={(e) => onHandlePointerDown(e, el)}
                      style={{
                        position: "absolute",
                        bottom: -6,
                        insetInlineEnd: -6,
                        width: 14,
                        height: 14,
                        borderRadius: 999,
                        background: "#c69a3c",
                        border: "2px solid white",
                        cursor: "nwse-resize",
                      }}
                    />
                  )}
                </div>
              ))}

              {/* خطوط المحاذاة الذكية أثناء السحب */}
              {guides.x !== null && (
                <div
                  style={{
                    position: "absolute",
                    left: `${guides.x}%`,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: "#e0433a",
                    pointerEvents: "none",
                    zIndex: 20,
                  }}
                />
              )}
              {guides.y !== null && (
                <div
                  style={{
                    position: "absolute",
                    top: `${guides.y}%`,
                    left: 0,
                    right: 0,
                    height: 1,
                    background: "#e0433a",
                    pointerEvents: "none",
                    zIndex: 20,
                  }}
                />
              )}
            </div>
          </div>
          <p className="text-xs text-brand-700/60">
            هذه معاينة ببيانات تجريبية، بمقاس A4 حقيقي (تُظهره المسطرة
            بالسنتيمتر). اسحب أي عنصر لتحريكه (يلتقط تلقائياً عند محاذاة
            المنتصف أو عنصر آخر)، أو استعمل أسهم لوحة المفاتيح بعد تحديده
            لضبط دقيق (مع Shift لخطوة أكبر)، واسحب النقطة الذهبية أسفل
            يمينه لتغيير حجمه.
          </p>
        </div>

        {/* -------- لوحة خصائص العنصر المحدد -------- */}
        <div className="card space-y-3 h-fit lg:sticky lg:top-4">
          <h3 className="font-bold text-brand-900">خصائص العنصر</h3>
          {!selectedElement && (
            <p className="text-sm text-brand-700/60">اختر عنصراً من اللوحة لتعديله.</p>
          )}

          {selectedElement && (
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-black/5">
              <div>
                <label className="label">الموضع الأفقي X (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={Number(selectedElement.xPct).toFixed(1)}
                  onChange={(e) => updateElement(selectedElement.id, { xPct: clamp(Number(e.target.value), 0, 100) })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">الموضع الرأسي Y (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={Number(selectedElement.yPct).toFixed(1)}
                  onChange={(e) => updateElement(selectedElement.id, { yPct: clamp(Number(e.target.value), 0, 100) })}
                  className="input"
                />
              </div>
            </div>
          )}

          {selectedElement?.type === "text" && (
            <>
              <div>
                <label className="label">النص</label>
                <textarea
                  ref={textareaRef}
                  value={selectedElement.text}
                  onChange={(e) => {
                    const newText = e.target.value;
                    const newFormats = shiftFormatsOnTextChange(
                      selectedElement.text,
                      newText,
                      selectedElement.formats
                    );
                    updateElement(selectedElement.id, { text: newText, formats: newFormats });
                  }}
                  rows={4}
                  className="input"
                />
              </div>
              <div>
                <p className="label mb-1.5">إدراج متغيّر</p>
                <div className="flex flex-wrap gap-1.5">
                  {CERTIFICATE_PLACEHOLDERS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => insertPlaceholder(p.key)}
                      className="text-xs bg-brand-50 border border-brand-200 rounded-lg px-2 py-1 hover:bg-brand-100"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="label mb-1.5">تنسيق جزء من النص (كلمة أو جملة)</p>
                <p className="text-xs text-brand-700/60 mb-1.5">
                  حدد كلمة أو جملة بالسحب داخل صندوق النص أعلاه، ثم اضغط أحد
                  الأزرار.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={toggleSelectionBold}
                    className="text-xs bg-brand-50 border border-brand-200 rounded-lg px-2 py-1 hover:bg-brand-100 font-bold"
                  >
                    غامق للتحديد
                  </button>
                  <button
                    type="button"
                    onClick={resetSelectionBold}
                    className="text-xs bg-brand-50 border border-brand-200 rounded-lg px-2 py-1 hover:bg-brand-100"
                  >
                    عادي للتحديد
                  </button>
                  <button
                    type="button"
                    onClick={() => resizeSelection(0.15)}
                    className="text-xs bg-brand-50 border border-brand-200 rounded-lg px-2 py-1 hover:bg-brand-100"
                  >
                    A+ تكبير التحديد
                  </button>
                  <button
                    type="button"
                    onClick={() => resizeSelection(-0.15)}
                    className="text-xs bg-brand-50 border border-brand-200 rounded-lg px-2 py-1 hover:bg-brand-100"
                  >
                    A- تصغير التحديد
                  </button>
                  <button
                    type="button"
                    onClick={clearSelectionFormat}
                    className="text-xs text-red-600 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50"
                  >
                    إزالة تنسيق التحديد
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">حجم الخط</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="12"
                    value={selectedElement.fontSize}
                    onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">اللون</label>
                  <input
                    type="color"
                    value={selectedElement.color}
                    onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                    className="w-full h-[42px] rounded-xl border border-black/10"
                  />
                </div>
              </div>
              <div>
                <label className="label">سمك الخط</label>
                <div className="flex gap-2">
                  {[
                    { v: "normal", l: "عادي" },
                    { v: "bold", l: "عريض" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => updateElement(selectedElement.id, { fontWeight: o.v })}
                      className={
                        selectedElement.fontWeight === o.v
                          ? "btn-primary text-sm py-1.5 px-3"
                          : "btn-secondary text-sm py-1.5 px-3"
                      }
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">الخط</label>
                <select
                  value={selectedElement.fontFamily || ""}
                  onChange={(e) =>
                    updateElement(selectedElement.id, {
                      fontFamily: e.target.value || undefined,
                    })
                  }
                  className="input"
                  style={{ fontFamily: resolveCertificateFontFamily(selectedElement.fontFamily) }}
                >
                  {CERTIFICATE_FONTS.map((f) => (
                    <option
                      key={f.label}
                      value={f.key || ""}
                      style={{ fontFamily: resolveCertificateFontFamily(f.key) }}
                    >
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">المحاذاة</label>
                <div className="flex gap-2">
                  {[
                    { v: "right", l: "يمين" },
                    { v: "center", l: "وسط" },
                    { v: "left", l: "يسار" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => updateElement(selectedElement.id, { align: o.v })}
                      className={
                        selectedElement.align === o.v
                          ? "btn-primary text-sm py-1.5 px-3"
                          : "btn-secondary text-sm py-1.5 px-3"
                      }
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">العرض ({selectedElement.wPct.toFixed(0)}%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={selectedElement.wPct}
                    onChange={(e) => updateElement(selectedElement.id, { wPct: Number(e.target.value) })}
                    className="w-full"
                  />
                  <input
                    type="number"
                    min="5"
                    max="100"
                    step="0.5"
                    value={Number(selectedElement.wPct).toFixed(1)}
                    onChange={(e) => updateElement(selectedElement.id, { wPct: clamp(Number(e.target.value), 5, 100) })}
                    className="input w-20 shrink-0"
                  />
                </div>
              </div>
            </>
          )}

          {selectedElement?.type === "image" && (
            <>
              <p className="text-sm text-brand-700/70">
                {selectedElement.imagePath === "__LOGO__"
                  ? "شعار الجمعية الحالي (يتحدّث تلقائياً من الإعدادات)."
                  : "صورة مرفوعة."}
              </p>
              <div>
                <label className="label">العرض ({selectedElement.wPct.toFixed(0)}%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={selectedElement.wPct}
                    onChange={(e) => updateElement(selectedElement.id, { wPct: Number(e.target.value) })}
                    className="w-full"
                  />
                  <input
                    type="number"
                    min="5"
                    max="100"
                    step="0.5"
                    value={Number(selectedElement.wPct).toFixed(1)}
                    onChange={(e) => updateElement(selectedElement.id, { wPct: clamp(Number(e.target.value), 5, 100) })}
                    className="input w-20 shrink-0"
                  />
                </div>
              </div>
              <div>
                <label className="label">الارتفاع ({selectedElement.hPct.toFixed(0)}%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="3"
                    max="100"
                    value={selectedElement.hPct}
                    onChange={(e) => updateElement(selectedElement.id, { hPct: Number(e.target.value) })}
                    className="w-full"
                  />
                  <input
                    type="number"
                    min="3"
                    max="100"
                    step="0.5"
                    value={Number(selectedElement.hPct).toFixed(1)}
                    onChange={(e) => updateElement(selectedElement.id, { hPct: clamp(Number(e.target.value), 3, 100) })}
                    className="input w-20 shrink-0"
                  />
                </div>
              </div>
            </>
          )}

          {selectedElement && (
            <div className="flex items-center justify-between pt-3 border-t border-black/5">
              <div className="flex gap-2">
                <button type="button" onClick={() => moveLayer("front")} className="text-xs text-brand-700 underline">
                  إلى الأمام
                </button>
                <button type="button" onClick={() => moveLayer("back")} className="text-xs text-brand-700 underline">
                  إلى الخلف
                </button>
              </div>
              <button type="button" onClick={deleteSelected} className="text-sm text-red-600">
                حذف العنصر
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
