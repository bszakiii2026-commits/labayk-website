"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteFamilyMember } from "../actions";

export default function DeleteMemberButton({ memberId }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="text-sm text-red-600">
        حذف هذا الفرد
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span>تأكيد الحذف؟</span>
      <button
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          await deleteFamilyMember(memberId);
          router.push("/dashboard/family");
          router.refresh();
        }}
        className="text-red-600 font-bold"
      >
        نعم، احذف
      </button>
      <button onClick={() => setConfirming(false)} className="text-brand-700">
        إلغاء
      </button>
    </div>
  );
}
