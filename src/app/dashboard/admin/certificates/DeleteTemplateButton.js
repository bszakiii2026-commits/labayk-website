"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTemplate } from "./actions";

export default function DeleteTemplateButton({ templateId }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-sm text-red-600"
      >
        حذف
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span>تأكيد؟</span>
      <button
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          await deleteTemplate(templateId);
          router.refresh();
        }}
        className="text-red-600 font-bold"
      >
        نعم
      </button>
      <button onClick={() => setConfirming(false)} className="text-brand-700">
        إلغاء
      </button>
    </div>
  );
}
