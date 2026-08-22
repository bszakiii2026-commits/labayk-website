"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function Icon({ name }) {
  const common = {
    width: 21,
    height: 21,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" />
        </svg>
      );
    case "family":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M4 20c0-3 2.5-5 5-5s5 2 5 5" />
          <circle cx="17" cy="9.3" r="2.3" />
          <path d="M15 20c.2-2.2 1.8-3.8 3.5-4" />
        </svg>
      );
    case "invite":
      return (
        <svg {...common}>
          <circle cx="10" cy="9" r="3.2" />
          <path d="M4 20c0-3.2 2.7-5.5 6-5.5s6 2.3 6 5.5" />
          <path d="M18 8v5M15.5 10.5h5" />
        </svg>
      );
    case "ranking":
      return (
        <svg {...common}>
          <path d="M5 20V12M11 20V6M17 20V14" />
        </svg>
      );
    case "certificates":
      return (
        <svg {...common}>
          <circle cx="12" cy="9" r="5" />
          <path d="M9 13.5 7.5 20l4.5-2.5 4.5 2.5-1.5-6.5" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
          <circle cx="15" cy="7" r="2.2" />
          <circle cx="7" cy="17" r="2.2" />
        </svg>
      );
    default:
      return null;
  }
}

// قائمة تنقّل تفاعلية تُبرز الصفحة الحالية. variant="desktop" تعرضها عمودياً
// في الشريط الجانبي، و variant="mobile" تعرضها أفقياً في شريط سفلي للهاتف.
export default function SidebarNav({ items, variant = "desktop" }) {
  const pathname = usePathname();

  return (
    <nav
      className={
        variant === "desktop"
          ? "flex flex-col items-center gap-2"
          : "flex items-center justify-around w-full"
      }
    >
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={
              "icon-btn " +
              (active
                ? "text-white"
                : "text-brand-800 hover:bg-brand-50")
            }
            style={active ? { backgroundColor: "var(--brand-900)" } : undefined}
          >
            <Icon name={item.icon} />
            {variant === "mobile" && <span className="sr-only">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
