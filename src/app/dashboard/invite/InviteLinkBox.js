"use client";

import { useEffect, useState } from "react";

export default function InviteLinkBox({ inviterId }) {
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLink(`${window.location.origin}/signup?invite=${inviterId}`);
  }, [inviterId]);

  return (
    <div className="card space-y-3">
      <label className="label">رابط الدعوة</label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input readOnly value={link} className="input" dir="ltr" />
        <button
          type="button"
          className="btn-primary shrink-0"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "تم النسخ ✓" : "نسخ الرابط"}
        </button>
      </div>
    </div>
  );
}
