"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import AppHeader from "@/components/AppHeader";
import { ArrowDownIcon, ArrowUpIcon, SparkleIcon } from "@/components/Icons";

interface Category {
  category: string;
  emoji: string;
  label: string;
  amount: number;
  count: number;
}
interface Insights {
  totalYourSpend: number;
  categories: Category[];
  months: { key: string; label: string; amount: number }[];
  topCategory: Category | null;
  topPayee: { name: string; amount: number } | null;
  peopleYouFronted: { name: string; amount: number }[];
  thisMonth: number;
  lastMonth: number;
  monthDelta: number;
  expenseCount: number;
}

export default function InsightsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/insights");
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

  const monthMax = Math.max(...data.months.map((m) => m.amount), 1);
  const catTotal = data.categories.reduce((s, c) => s + c.amount, 0) || 1;

  return (
    <div className="min-h-screen safe-bottom">
      <AppHeader title="Insights" subtitle="Where your money's going" />

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Hero summary */}
        <section className="rounded-3xl border border-border p-6 bg-gradient-brand-soft relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="relative">
            <p className="text-xs uppercase tracking-widest text-muted-strong">This month</p>
            <p className="text-4xl font-semibold mt-2 tabular-nums">
              ₹{data.thisMonth.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {data.lastMonth > 0 && (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    data.monthDelta > 0
                      ? "bg-danger-soft text-danger"
                      : "bg-success-soft text-success"
                  }`}
                >
                  {data.monthDelta > 0 ? <ArrowUpIcon size={12} /> : <ArrowDownIcon size={12} />}
                  {Math.abs(data.monthDelta)}%
                </span>
              )}
              <span className="text-xs text-muted">
                vs last month (₹{data.lastMonth.toLocaleString("en-IN", { maximumFractionDigits: 0 })})
              </span>
            </div>
          </div>
        </section>

        {/* Smart insights */}
        {(data.topCategory || data.topPayee) && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.topCategory && (
              <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-warning-soft flex items-center justify-center text-2xl">
                  {data.topCategory.emoji}
                </div>
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider">You spend most on</p>
                  <p className="font-semibold mt-0.5">{data.topCategory.label}</p>
                  <p className="text-xs text-muted mt-0.5 tabular-nums">
                    ₹{data.topCategory.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}
            {data.topPayee && (
              <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-success-soft text-success flex items-center justify-center font-semibold">
                  {data.topPayee.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider">Owes you the most</p>
                  <p className="font-semibold mt-0.5">{data.topPayee.name}</p>
                  <p className="text-xs text-success mt-0.5 tabular-nums">
                    ₹{data.topPayee.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Monthly trend */}
        <section className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Monthly trend</h2>
            <span className="text-xs text-muted">last 6 months</span>
          </div>
          <div className="flex items-end justify-between gap-2 h-36">
            {data.months.map((m, i) => {
              const h = Math.max((m.amount / monthMax) * 100, 3);
              const last = i === data.months.length - 1;
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    className={`w-full rounded-lg transition-all ${
                      last ? "bg-gradient-brand" : "bg-primary-soft"
                    }`}
                    style={{ height: `${h}%` }}
                    title={`₹${m.amount.toFixed(0)}`}
                  />
                  <span className={`text-[10px] ${last ? "text-foreground font-semibold" : "text-muted"}`}>
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Category breakdown */}
        <section className="rounded-2xl bg-card border border-border p-4">
          <h2 className="text-sm font-semibold mb-4">Where it goes</h2>
          {data.categories.length === 0 ? (
            <p className="text-muted text-sm text-center py-6">
              No expenses yet — add a few and your breakdown will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {data.categories.map((c) => {
                const pct = (c.amount / catTotal) * 100;
                return (
                  <div key={c.category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <span className="text-base">{c.emoji}</span>
                        <span className="font-medium">{c.label}</span>
                        <span className="text-xs text-muted">· {c.count}</span>
                      </span>
                      <span className="tabular-nums text-muted-strong">
                        ₹{c.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        <span className="text-muted ml-1.5 text-xs">{pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-background-elevated overflow-hidden">
                      <div
                        className="h-full bg-gradient-brand rounded-full transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* People you fronted */}
        {data.peopleYouFronted.length > 0 && (
          <section className="rounded-2xl bg-card border border-border p-4">
            <h2 className="text-sm font-semibold mb-3">You fronted the most for</h2>
            <div className="space-y-2">
              {data.peopleYouFronted.map((p) => (
                <div key={p.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-card-hover">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-soft text-primary flex items-center justify-center text-sm font-semibold">
                      {p.name[0].toUpperCase()}
                    </div>
                    <span className="font-medium">{p.name}</span>
                  </div>
                  <span className="font-semibold tabular-nums text-success">
                    ₹{p.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AI tip */}
        <div className="rounded-2xl border border-border p-4 bg-card flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/30">
            <SparkleIcon size={16} />
          </div>
          <div className="text-sm">
            <p className="font-medium">Friendly nudge</p>
            <p className="text-muted mt-0.5">
              {data.topCategory
                ? `Most of your spend lands in ${data.topCategory.label.toLowerCase()}. Setting a soft cap can free up ₹500–1000 a month.`
                : "Once you log a few expenses, I'll start surfacing patterns to help you save."}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
