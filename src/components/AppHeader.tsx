"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { LogOutIcon } from "@/components/Icons";

export default function AppHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title?: string;
  subtitle?: string;
  back?: { href: string; label?: string };
  right?: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session) return null;
  if (pathname === "/login" || pathname === "/register") return null;

  const initial = (session.user?.name || session.user?.email || "B")[0].toUpperCase();

  return (
    <header className="sticky top-0 z-30 glass border-b border-border/60">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {back ? (
            <Link
              href={back.href}
              className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors"
              aria-label={back.label || "Back"}
            >
              <span className="text-lg leading-none">←</span>
            </Link>
          ) : (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary/30">
                B$
              </div>
              <span className="text-base font-bold tracking-tight hidden sm:block">
                BRO<span className="text-gradient">SPLIT</span>
              </span>
            </Link>
          )}
          {title && (
            <div className="min-w-0">
              <h1 className="text-base font-semibold leading-tight truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs text-muted leading-tight truncate">{subtitle}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {right}
          {!back && (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="w-9 h-9 rounded-full bg-primary-soft border border-border flex items-center justify-center text-primary text-sm font-semibold hover:border-primary/50 transition-colors"
                title="Profile & payment settings"
              >
                {initial}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-muted hover:text-danger transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOutIcon size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
