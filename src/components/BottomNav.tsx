"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  HomeIcon,
  ListIcon,
  SparkleIcon,
  ChartIcon,
  CreditIcon,
} from "@/components/Icons";

const tabs = [
  { href: "/dashboard", label: "Home", Icon: HomeIcon, match: ["/dashboard", "/groups"] },
  { href: "/expenses", label: "Expenses", Icon: ListIcon, match: ["/expenses"] },
  { href: "/ai", label: "AI", Icon: SparkleIcon, match: ["/ai"], primary: true },
  { href: "/insights", label: "Insights", Icon: ChartIcon, match: ["/insights"] },
  { href: "/credit", label: "Credit", Icon: CreditIcon, match: ["/credit"] },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;
  if (pathname === "/login" || pathname === "/register" || pathname === "/") return null;
  if (pathname?.startsWith("/invite/")) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pt-2 pointer-events-none">
      <div className="max-w-2xl mx-auto pointer-events-auto">
        <div
          className="glass border border-border rounded-2xl shadow-2xl shadow-black/50 px-2 py-1.5"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) * 0.5 + 6px)" }}
        >
          <ul className="flex items-stretch justify-between gap-1">
            {tabs.map(({ href, label, Icon, match, primary }) => {
              const active = match.some((m) =>
                m === "/dashboard" ? pathname === m || pathname?.startsWith("/groups") : pathname?.startsWith(m)
              );
              return (
                <li key={href} className="flex-1">
                  <Link
                    href={href}
                    className={`group flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-all relative ${
                      active
                        ? "text-foreground"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {primary ? (
                      <span
                        className={`-mt-5 mb-0.5 w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                          active
                            ? "bg-gradient-brand shadow-lg shadow-primary/40 scale-105"
                            : "bg-gradient-brand-soft border border-border"
                        }`}
                      >
                        <Icon size={22} className={active ? "text-white" : "text-primary"} />
                      </span>
                    ) : (
                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          active ? "bg-primary-soft text-primary" : ""
                        }`}
                      >
                        <Icon size={20} />
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-medium tracking-wide ${
                        active ? "text-foreground" : "text-muted"
                      }`}
                    >
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
