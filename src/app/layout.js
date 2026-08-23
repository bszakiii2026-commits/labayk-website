import {
  Tajawal,
  Cairo,
  Amiri,
  Aref_Ruqaa,
  Reem_Kufi,
  Marhey,
  Lemonada,
  Changa,
} from "next/font/google";
import localFont from "next/font/local";
import { getSiteTheme } from "@/lib/siteSettings";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-tajawal",
  display: "swap",
});

// مجموعة خطوط إضافية تُستعمل فقط داخل محرر شهادات التكريم — تظهر كقائمة
// اختيار للخط لكل عنصر نص (بديل عملي عن الوصول لخطوط جهاز المستخدم، وهو
// أمر لا تسمح به المتصفحات لصفحات الويب العادية؛ هذه الخطوط تُحمَّل تلقائياً
// وتعمل لأي زائر ولا تتعطل عند الطباعة، بعكس خط مثبَّت محلياً فقط).
const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"], variable: "--font-cairo", display: "swap" });
const amiri = Amiri({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-amiri", display: "swap" });
const arefRuqaa = Aref_Ruqaa({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-ruqaa", display: "swap" });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-reem-kufi", display: "swap" });
const marhey = Marhey({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-marhey", display: "swap" });
const lemonada = Lemonada({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-lemonada", display: "swap" });
const changa = Changa({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-changa", display: "swap" });

// خط "The Year of The Camel" — أرسله المشرف العام كملف خط فعلي (يدعم
// العربية)، فأُضيف هنا كخط محلي مضمَّن مع الموقع (وليس من Google Fonts).
const camel = localFont({
  src: [
    { path: "../fonts/camel/TheYearofTheCamel-Thin.otf", weight: "100", style: "normal" },
    { path: "../fonts/camel/TheYearofTheCamel-Light.otf", weight: "300", style: "normal" },
    { path: "../fonts/camel/TheYearofTheCamel-Regular.otf", weight: "400", style: "normal" },
    { path: "../fonts/camel/TheYearofTheCamel-Medium.otf", weight: "500", style: "normal" },
    { path: "../fonts/camel/TheYearofTheCamel-Bold.otf", weight: "700", style: "normal" },
    { path: "../fonts/camel/TheYearofTheCamel-ExtraBold.otf", weight: "800", style: "normal" },
  ],
  variable: "--font-camel",
  display: "swap",
});

const certificateFontVariables = [
  cairo.variable,
  amiri.variable,
  arefRuqaa.variable,
  reemKufi.variable,
  marhey.variable,
  lemonada.variable,
  changa.variable,
  camel.variable,
].join(" ");

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
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${certificateFontVariables}`}>
      <body className="font-sans min-h-screen">
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
        {children}
      </body>
    </html>
  );
}
