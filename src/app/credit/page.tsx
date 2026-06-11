"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import AppHeader from "@/components/AppHeader";
import { SparkleIcon, CheckIcon } from "@/components/Icons";

interface Credit {
  score: number;
  band: { label: string; color: "success" | "accent" | "warning" | "danger" };
  factors: {
    paymentHistory: number;
    creditUtilization: number;
    creditAgeYears: number;
    accounts: number;
    inquiries: number;
  };
  tips: { id: string; text: string; severity: "good" | "warn" | "info" }[];
  activity: { expenseCount: number; yourSpend30: number };
}

const SCORE_MIN = 300;
const SCORE_MAX = 900;

const BAND_COLOR: Record<Credit["band"]["color"], string> = {
  success: "var(--success)",
  accent: "var(--accent)",
  warning: "var(--warning)",
  danger: "var(--danger)",
};

const SEVERITY: Record<
  "good" | "warn" | "info",
  { bg: string; ring: string; text: string; icon: string }
> = {
  good: { bg: "bg-success-soft", ring: "ring-success/30", text: "text-success", icon: "✓" },
  warn: { bg: "bg-warning-soft", ring: "ring-warning/30", text: "text-warning", icon: "!" },
  info: { bg: "bg-primary-soft", ring: "ring-primary/30", text: "text-primary", icon: "i" },
};

export default function CreditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<Credit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/credit");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted">Loading…</div>
      </div>
    );
  }
  if (!data) return null;

  const pct = (data.score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
  const size = 220;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  const color = BAND_COLOR[data.band.color];

  return (
    <div className="min-h-screen safe-bottom">
      <AppHeader title="Credit" subtitle="Your financial vitals" />

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Score ring */}
        <section className="rounded-3xl border border-border p-6 bg-card relative overflow-hidden">
          <div
            className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-40"
            style={{ backgroundColor: color }}
          />
          <div className="relative flex flex-col items-center">
            <p className="text-xs uppercase tracking-widest text-muted-strong">CIBIL Score</p>
            <div className="relative my-2" style={{ width: size, height: size }}>
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor={color} />
                  </linearGradient>
                </defs>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth={stroke}
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke="url(#scoreGrad)"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circ - dash}`}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{ transition: "stroke-dasharray 1s cubic-bezier(0.16, 1, 0.3, 1)" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-semibold tabular-nums leading-none">
                  {data.score}
                </span>
                <span className="text-xs text-muted mt-1">of {SCORE_MAX}</span>
                <span
                  className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border"
                  style={{
                    color,
                    borderColor: color + "55",
                    backgroundColor: color + "1a",
                  }}
                >
                  {data.band.label}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted text-center mt-2 max-w-xs">
              Stable seed-based mock for demo. Wire to a bureau API to go live.
            </p>
          </div>
        </section>

        {/* Factors */}
        <section className="space-y-3">
          <Factor
            label="Payment history"
            value={`${data.factors.paymentHistory}%`}
            pct={data.factors.paymentHistory}
            tone={data.factors.paymentHistory >= 90 ? "success" : data.factors.paymentHistory >= 75 ? "warning" : "danger"}
            note="On-time bill & EMI payments"
          />
          <Factor
            label="Credit utilization"
            value={`${data.factors.creditUtilization}%`}
            pct={Math.min(data.factors.creditUtilization, 100)}
            tone={data.factors.creditUtilization < 30 ? "success" : data.factors.creditUtilization < 50 ? "warning" : "danger"}
            note="Lower is better — keep below 30%"
          />
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Credit age" value={`${data.factors.creditAgeYears}y`} />
            <MiniStat label="Accounts" value={`${data.factors.accounts}`} />
            <MiniStat label="Inquiries" value={`${data.factors.inquiries}`} />
          </div>
        </section>

        {/* AI Tips */}
        <section className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-gradient-brand flex items-center justify-center text-white shadow-lg shadow-primary/30">
              <SparkleIcon size={14} />
            </div>
            <h2 className="text-sm font-semibold">AI tips for you</h2>
          </div>
          <div className="space-y-2">
            {data.tips.map((t) => {
              const s = SEVERITY[t.severity];
              return (
                <div
                  key={t.id}
                  className={`flex items-start gap-3 p-3 rounded-xl ring-1 ${s.bg} ${s.ring}`}
                >
                  <span
                    className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${s.text}`}
                  >
                    {t.severity === "good" ? <CheckIcon size={14} /> : s.icon}
                  </span>
                  <p className="text-sm text-muted-strong leading-snug">{t.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        <p className="text-[11px] text-muted text-center">
          Demo CIBIL view — values are illustrative and won't affect your real bureau record.
        </p>
      </main>
    </div>
  );
}

function Factor({
  label,
  value,
  pct,
  tone,
  note,
}: {
  label: string;
  value: string;
  pct: number;
  tone: "success" | "warning" | "danger";
  note: string;
}) {
  const toneClass =
    tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-danger";
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{value}</p>
      </div>
      <p className="text-xs text-muted mb-3">{note}</p>
      <div className="h-2 rounded-full bg-background-elevated overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${toneClass}`}
          style={{ width: `${Math.max(pct, 4)}%` }}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 text-center">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-semibold mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}
