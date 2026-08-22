import { Tajawal } from "next/font/google";
import { getSiteTheme } from "@/lib/siteSettings";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata = {
  title: "جمعية لبيك الخيرية",
  description: "منصة عائلة جمعية لبيك لمتابعة النتائج الدراسية وتكريم المتفوقين",
};

export default async function RootLayout({ children }) {
  const theme = await getSiteTheme();

  // تخصيص ألوان الموقع الرئيسية (إن عدّلها المشرف العام من صفحة الإعدادات)
  // عبر متغيرات CSS، فوق القيم الافتراضية المضمّنة في globals.css.
  const themeCss = `:root{--page-bg:${theme.bg};--brand-900:${theme.ink};--brand-600:${theme.primary};--gold-500:${theme.accent};}`;

  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className="font-sans min-h-screen">
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
        {children}
      </body>
    </html>
  );
}
