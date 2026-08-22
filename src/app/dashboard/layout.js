import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getSiteSettings } from "@/lib/siteSettings";
import SignOutButton from "@/components/SignOutButton";
import SidebarNav from "@/components/SidebarNav";

const LOGOUT_ICON = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
    <path d="M13 16l4-4-4-4" />
    <path d="M17 12H8" />
  </svg>
);

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "super_admin";
  const { associationName, logoUrl } = await getSiteSettings(supabase);

  const navItems = [
    { href: "/dashboard", icon: "home", label: "الرئيسية" },
    { href: "/dashboard/family", icon: "family", label: "عائلتي" },
    { href: "/dashboard/invite", icon: "invite", label: "دعوة مشرف" },
    ...(isAdmin
      ? [
          { href: "/dashboard/admin/ranking", icon: "ranking", label: "الترتيب" },
          { href: "/dashboard/admin/certificates", icon: "certificates", label: "الشهادات" },
          { href: "/dashboard/admin/settings", icon: "settings", label: "الإعدادات" },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen flex">
      {/* ---- شريط جانبي (الشاشات المتوسطة فما فوق) ---- */}
      <aside className="hidden sm:flex flex-col items-center gap-4 w-24 py-6 shrink-0 sticky top-0 h-screen">
        <Link
          href="/dashboard"
          title={associationName}
          className="w-11 h-11 rounded-full overflow-hidden bg-white border border-black/5 flex items-center justify-center shadow-sm shrink-0"
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={associationName} className="w-full h-full object-contain" />
          ) : (
            <span className="text-xs font-bold text-brand-900">لبيك</span>
          )}
        </Link>

        <SidebarNav items={navItems} variant="desktop" />

        <div className="mt-auto">
          <SignOutButton className="icon-btn text-brand-800 hover:bg-brand-50">
            {LOGOUT_ICON}
          </SignOutButton>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* ---- شريط علوي (الهاتف فقط) ---- */}
        <header className="sm:hidden flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-brand-900 min-w-0">
            <span className="w-8 h-8 rounded-full overflow-hidden bg-white border border-black/5 flex items-center justify-center shrink-0">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={associationName} className="w-full h-full object-contain" />
              ) : (
                <span className="text-[10px] font-bold">لبيك</span>
              )}
            </span>
            <span className="text-sm truncate">{associationName}</span>
          </Link>
          <SignOutButton className="shrink-0 text-brand-700 hover:text-brand-900">
            {LOGOUT_ICON}
          </SignOutButton>
        </header>

        <main className="max-w-5xl w-full mx-auto px-4 py-6 pb-28 sm:pb-10 grow">{children}</main>

        {/* ---- شريط تنقّل سفلي (الهاتف فقط) ---- */}
        <nav className="sm:hidden fixed bottom-3 inset-x-3 bg-white/95 backdrop-blur rounded-full shadow-lg border border-black/5 py-1.5 px-2 z-40">
          <SidebarNav items={navItems} variant="mobile" />
        </nav>
      </div>
    </div>
  );
}
