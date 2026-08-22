"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TRIMESTER_LABELS } from "@/lib/schoolYearLabels";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function ScanEditor({
  memberId,
  memberName,
  schoolYear,
  trimester,
  canManage,
  existingImageUrl,
  existingManualAverage,
  existingExtractedAverage,
}) {
  const router = useRouter();
  const supabase = createClient();
  const canvasRef = useRef(null);
  const originalImageRef = useRef(null);
  const dimRef = useRef(480);

  const [workingImage, setWorkingImage] = useState(null);
  const [hasImage, setHasImage] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [enhance, setEnhance] = useState(false);
  const [selection, setSelection] = useState(null); // {x,y,w,h} in display px
  const dragStart = useRef(null);

  const [manualAverage, setManualAverage] = useState(
    existingManualAverage != null ? String(existingManualAverage) : ""
  );
  const [extractedGuess, setExtractedGuess] = useState(
    existingExtractedAverage != null ? Number(existingExtractedAverage) : null
  );
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrHint, setOcrHint] = useState(
    existingExtractedAverage != null
      ? `آخر قراءة تلقائية: ${existingExtractedAverage}`
      : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    dimRef.current = Math.max(320, Math.min(900, window.innerWidth - 64));
    if (existingImageUrl) {
      loadImage(existingImageUrl).then((img) => {
        originalImageRef.current = img;
        setWorkingImage(img);
        setHasImage(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingImage, rotation, brightness, enhance]);

  function filterString() {
    const b = 100 + Number(brightness);
    return enhance
      ? `grayscale(1) contrast(1.5) brightness(${b}%)`
      : `brightness(${b}%)`;
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas || !workingImage) return;
    const ctx = canvas.getContext("2d");

    const naturalW = workingImage.naturalWidth || workingImage.width;
    const naturalH = workingImage.naturalHeight || workingImage.height;
    const scale = Math.min(dimRef.current / Math.max(naturalW, naturalH), 1);
    const drawW = naturalW * scale;
    const drawH = naturalH * scale;

    const rotated = rotation === 90 || rotation === 270;
    canvas.width = rotated ? drawH : drawW;
    canvas.height = rotated ? drawW : drawH;
    canvas.style.width = canvas.width + "px";
    canvas.style.height = canvas.height + "px";

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.filter = filterString();
    ctx.drawImage(workingImage, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    loadImage(url).then((img) => {
      originalImageRef.current = img;
      setWorkingImage(img);
      setHasImage(true);
      setRotation(0);
      setBrightness(0);
      setEnhance(false);
      setSelection(null);
      setManualAverage("");
      setOcrHint("");
      setNotice("");
    });
  }

  function resetToOriginal() {
    if (!originalImageRef.current) return;
    setWorkingImage(originalImageRef.current);
    setRotation(0);
    setBrightness(0);
    setEnhance(false);
    setSelection(null);
  }

  function canvasPointFromEvent(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function onPointerDown(e) {
    const p = canvasPointFromEvent(e);
    dragStart.current = p;
    setSelection({ x: p.x, y: p.y, w: 0, h: 0 });
  }

  function onPointerMove(e) {
    if (!dragStart.current) return;
    const p = canvasPointFromEvent(e);
    const x = Math.min(dragStart.current.x, p.x);
    const y = Math.min(dragStart.current.y, p.y);
    const w = Math.abs(p.x - dragStart.current.x);
    const h = Math.abs(p.y - dragStart.current.y);
    setSelection({ x, y, w, h });
  }

  function onPointerUp() {
    dragStart.current = null;
  }

  async function confirmCrop() {
    const canvas = canvasRef.current;
    if (!canvas || !selection || selection.w < 10 || selection.h < 10) return;

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = Math.round(selection.w);
    cropCanvas.height = Math.round(selection.h);
    const ctx = cropCanvas.getContext("2d");
    ctx.drawImage(
      canvas,
      Math.round(selection.x),
      Math.round(selection.y),
      Math.round(selection.w),
      Math.round(selection.h),
      0,
      0,
      Math.round(selection.w),
      Math.round(selection.h)
    );

    const dataUrl = cropCanvas.toDataURL("image/jpeg", 0.92);
    const img = await loadImage(dataUrl);
    setWorkingImage(img);
    setRotation(0);
    setBrightness(0);
    setEnhance(false);
    setSelection(null);
  }

  async function runOcr() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setOcrRunning(true);
    setError("");
    setOcrHint("جارٍ محاولة قراءة المعدل...");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789.,/",
      });
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      const {
        data: { text },
      } = await worker.recognize(blob);
      await worker.terminate();

      const normalized = text.replace(/,/g, ".");
      const matches = normalized.match(/\d{1,2}(\.\d{1,2})?/g) || [];
      const plausible = matches
        .map(Number)
        .filter((n) => n >= 0 && n <= 20);

      if (plausible.length > 0) {
        const guess = plausible[0];
        setExtractedGuess(guess);
        setManualAverage(String(guess));
        setOcrHint(`قراءة تلقائية تقريبية: ${guess} — تحقّق منها وعدّلها عند الحاجة`);
      } else {
        setOcrHint("تعذّرت القراءة التلقائية، الرجاء إدخال المعدل يدوياً.");
      }
    } catch (err) {
      setOcrHint("تعذّرت القراءة التلقائية، الرجاء إدخال المعدل يدوياً.");
    } finally {
      setOcrRunning(false);
    }
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage) {
      setError("الرجاء اختيار صورة الكشف أولاً.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("no-user");

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85)
      );
      const path = `${memberId}/${schoolYear}_${trimester}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("report-cards")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const parsedManual = manualAverage.trim()
        ? Number(manualAverage.replace(",", "."))
        : null;

      const { error: upsertError } = await supabase
        .from("report_cards")
        .upsert(
          {
            family_member_id: memberId,
            school_year: schoolYear,
            trimester,
            image_path: path,
            extracted_average: extractedGuess,
            manual_average: parsedManual,
            created_by: user.id,
          },
          { onConflict: "family_member_id,school_year,trimester" }
        );
      if (upsertError) throw upsertError;

      setNotice("تم الحفظ بنجاح.");
      router.refresh();
    } catch (err) {
      setError("حدث خطأ أثناء الحفظ، حاول مجدداً.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">
          {memberName} — {TRIMESTER_LABELS[trimester]}
        </h1>
        <p className="text-brand-700/80 text-sm">السنة الدراسية: {schoolYear}</p>
      </div>

      {canManage && (
        <div className="card">
          <label className="label">1) اختر صورة كشف النقاط</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileChange}
            className="block text-sm"
          />
        </div>
      )}

      {hasImage && (
        <div className="card space-y-4">
          <div>
            <p className="label mb-2">2) عدّل الصورة (قص، تدوير، تحسين)</p>
            <div className="relative inline-block touch-none select-none">
              <canvas
                ref={canvasRef}
                onMouseDown={canManage ? onPointerDown : undefined}
                onMouseMove={canManage ? onPointerMove : undefined}
                onMouseUp={canManage ? onPointerUp : undefined}
                onMouseLeave={canManage ? onPointerUp : undefined}
                onTouchStart={canManage ? onPointerDown : undefined}
                onTouchMove={canManage ? onPointerMove : undefined}
                onTouchEnd={canManage ? onPointerUp : undefined}
                className="rounded-lg border border-black/10 max-w-full"
              />
              {selection && (
                <div
                  className="absolute border-2 border-gold-500 bg-gold-400/20 pointer-events-none"
                  style={{
                    left: selection.x,
                    top: selection.y,
                    width: selection.w,
                    height: selection.h,
                  }}
                />
              )}
            </div>
          </div>

          {canManage && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 270) % 360)}
                  className="btn-secondary text-sm"
                >
                  ↺ تدوير يسار
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="btn-secondary text-sm"
                >
                  ↻ تدوير يمين
                </button>
                <button
                  type="button"
                  onClick={() => setEnhance((v) => !v)}
                  className="btn-secondary text-sm"
                >
                  {enhance ? "إلغاء تحسين المسح" : "تحسين المسح (أبيض وأسود)"}
                </button>
                <button
                  type="button"
                  onClick={confirmCrop}
                  disabled={!selection || selection.w < 10}
                  className="btn-primary text-sm"
                >
                  ✂ تأكيد القص
                </button>
                <button type="button" onClick={resetToOriginal} className="text-sm text-brand-700 underline">
                  استعادة الصورة الأصلية
                </button>
              </div>

              <div>
                <label className="label">السطوع</label>
                <input
                  type="range"
                  min={-60}
                  max={60}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <p className="text-xs text-brand-700/60">
                اسحب على الصورة لتحديد إطار القص (المستطيل الذهبي)، ثم اضغط
                &quot;تأكيد القص&quot;.
              </p>

              <div className="border-t border-black/5 pt-4">
                <p className="label mb-2">3) استخراج المعدل تلقائياً (تجريبي)</p>
                <button
                  type="button"
                  onClick={runOcr}
                  disabled={ocrRunning}
                  className="btn-secondary text-sm"
                >
                  {ocrRunning ? "جارٍ القراءة..." : "قراءة المعدل من الصورة"}
                </button>
                {ocrHint && (
                  <p className="text-xs text-brand-700/70 mt-2">{ocrHint}</p>
                )}
              </div>

              <div>
                <label className="label">4) المعدل النهائي (تأكيد أو تعديل يدوي)</label>
                <input
                  className="input max-w-[160px]"
                  value={manualAverage}
                  onChange={(e) => setManualAverage(e.target.value)}
                  placeholder="مثال: 14.75"
                  inputMode="decimal"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {notice && <p className="text-sm text-brand-700">{notice}</p>}

              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? "جارٍ الحفظ..." : "حفظ الكشف"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
