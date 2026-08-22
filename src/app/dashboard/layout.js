import Link from "next/link";
import { getCurrentProfile } from "@/lib/profile";
import SignOutButton from "@/components/SignOutButton";

export default async function DashboardLayout({ children }) {
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "super_admin";

  return (
    <div className="min-h-screen">
      <header className="bg-brand-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-sm">
              لبيك
            </span>
            <span>منصة عائلة لبيك</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard/family" className="hover:text-gold-400">
              عائلتي
            </Link>
            <Link href="/dashboard/invite" className="hover:text-gold-400">
              دعوة مشرف فرعي
            </Link>
            {isAdmin && (
              <Link href="/dashboard/admin/ranking" className="hover:text-gold-400">
                لوحة المشرف العام
              </Link>
            )}
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
