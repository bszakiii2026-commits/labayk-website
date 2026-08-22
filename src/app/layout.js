import { Tajawal } from "next/font/google";
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

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className="font-sans min-h-screen">{children}</body>
    </html>
  );
}
