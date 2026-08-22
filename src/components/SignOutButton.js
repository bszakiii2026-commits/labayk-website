"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton({
  className = "text-sm hover:opacity-70 transition-opacity",
  children = "تسجيل الخروج",
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={handleSignOut} className={className} title="تسجيل الخروج">
      {children}
    </button>
  );
}
