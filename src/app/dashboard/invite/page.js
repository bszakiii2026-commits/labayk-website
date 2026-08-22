import { getCurrentProfile } from "@/lib/profile";
import InviteLinkBox from "./InviteLinkBox";

export default async function InvitePage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">دعوة مشرف فرعي</h1>
        <p className="text-brand-700/80 mt-1">
          إذا كان لديك ابن أكبر يريد إدارة أبنائه بنفسه، أرسل له هذا الرابط.
          عند إنشائه لحسابه عبره، سيظهر تلقائياً كأسرة فرعية تحتك، وستستمر في
          رؤية بيانات أبنائه من لوحتك.
        </p>
      </div>
      <InviteLinkBox inviterId={profile.id} />
    </div>
  );
}
