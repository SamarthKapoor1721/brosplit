"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { SparkleIcon } from "@/components/Icons";

interface Recent {
  id: string;
  description: string;
  amount: number;
  date: string;
  groupId: string;
  groupName: string;
  paidBy: { id: string; name: string | null; email: string };
  yourShare: number;
  youPaid: boolean;
  category: { category: string; emoji: string; label: string };
}

interface Group {
  id: string;
  name: string;
  net: number;
  members: number;
  expenses: number;
}

interface Overview {
  groups: Group[];
  recent: Recent[];
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "owed", label: "You're owed" },
  { id: "owe", label: "You owe" },
] as const;

type FilterId = typeof FILTERS[number]["id"];

export default function ExpensesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>("all");
  const [groupFilter, setGroupFilter] = useState<string | "all">("all");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/overview");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.recent.filter((r) => {
      if (groupFilter !== "all" && r.groupId !== groupFilter) return false;
      if (filter === "owed" && !r.youPaid) return false;
      if (filter === "owe" && r.youPaid) return false;
      return true;
    });
  }, [data, filter, groupFilter]);

  // Group by date label
  const sections = useMemo(() => {
    const map = new Map<string, Recent[]>();
    for (const r of filtered) {
      const d = new Date(r.date);
      const today = new Date();
      const yesterday = new Date(today.getTime() - 86400000);
      const label =
        d.toDateString() === today.toDateString()
          ? "Today"
          : d.toDateString() === yesterday.toDateString()
          ? "Yesterday"
          : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(r);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen safe-bottom">
      <AppHeader title="Expenses" subtitle="All your shared spending" />

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Group filter pills */}
        {data && data.groups.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
            <button
              onClick={() => setGroupFilter("all")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
                groupFilter === "all"
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border text-muted-strong hover:text-foreground"
              }`}
            >
              All groups
            </button>
            {data.groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setGroupFilter(g.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
                  groupFilter === g.id
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card border-border text-muted-strong hover:text-foreground"
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}

        {/* Direction filter */}
        <div className="flex gap-1 bg-card border border-border rounded-2xl p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f.id
                  ? "bg-gradient-brand text-white shadow-lg shadow-primary/30"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {sections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-medium">Nothing here</p>
            <p className="text-muted text-sm mt-1">
              No expenses match this filter. Try the AI tab to add one fast.
            </p>
            <Link
              href="/ai"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-medium shadow-lg shadow-primary/30"
            >
              <SparkleIcon size={16} /> Try AI entry
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {sections.map(([label, items]) => (
              <div key={label}>
                <p className="text-xs uppercase tracking-wider text-muted mb-2 px-1">{label}</p>
                <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
                  {items.map((r) => (
                    <Link
                      key={r.id}
                      href={`/groups/${r.groupId}`}
                      className="flex items-center justify-between p-4 hover:bg-card-hover transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-background-elevated border border-border flex items-center justify-center text-lg shrink-0">
                          {r.category.emoji}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{r.description}</p>
                          <p className="text-xs text-muted truncate">
                            {r.groupName} · {r.youPaid ? "You paid" : `${r.paidBy.name || r.paidBy.email} paid`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold tabular-nums">
                          ₹{r.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </p>
                        <p
                          className={`text-[11px] tabular-nums font-medium ${
                            r.youPaid ? "text-success" : "text-danger"
                          }`}
                        >
                          {r.youPaid
                            ? `+₹${(r.amount - r.yourShare).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
                            : `−₹${r.yourShare.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
