import { fillCertificateText, resolveCertificateFontFamily } from "@/lib/certificateVariables";

// عرض شهادة جاهزة للطباعة (بدون تفاعل تعديل)، تُستعمل في صفحة الطباعة لكل
// طالب. template.elements يجب أن تحتوي resolvedSrc جاهزاً لأي عنصر صورة.
export default function CertificateRender({ template, backgroundImageUrl, data }) {
  const orientation = template.orientation || "landscape";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 ${orientation}; margin: 0; }
          html, body { margin: 0; }
          .cert-print-canvas,
          .cert-print-canvas * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .cert-print-canvas {
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            border-radius: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
      <div
        className="cert-print-canvas rounded-xl border border-black/10 mx-auto shadow-sm"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: orientation === "landscape" ? "1000px" : "720px",
          aspectRatio: orientation === "landscape" ? "1.4142" : "0.7071",
          backgroundColor: template.background_color || "#ffffff",
          backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          containerType: "inline-size",
          overflow: "hidden",
        }}
      >
        {(template.elements || []).map((el) => (
          <div
            key={el.id}
            style={{
              position: "absolute",
              left: `${el.xPct}%`,
              top: `${el.yPct}%`,
              width: `${el.wPct}%`,
              height: el.type === "image" ? `${el.hPct}%` : undefined,
              transform: "translate(-50%, -50%)",
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
                {fillCertificateText(el.text, data)}
              </p>
            ) : el.resolvedSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={el.resolvedSrc}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}
