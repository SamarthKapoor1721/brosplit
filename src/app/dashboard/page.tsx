"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { PlusIcon, MicIcon, SparkleIcon, ArrowRightIcon, UsersIcon } from "@/components/Icons";

interface Group {
  id: string;
  name: string;
  net: number;
  members: number;
  expenses: number;
}

interface Person {
  id: string;
  name: string;
  amount: number;
}

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

interface Overview {
  user: { id: string; name?: string | null; email?: string | null };
  summary: {
    youOwe: number;
    youAreOwed: number;
    net: number;
    yourSpend30: number;
    totalSpend30: number;
  };
  perPerson: Person[];
  groups: Group[];
  recent: Recent[];
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsUpi, setNeedsUpi] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const load = useCallback(async () => {
    try {
      const [overviewRes, profileRes] = await Promise.all([
        fetch("/api/overview"),
        fetch("/api/profile"),
      ]);
      if (overviewRes.ok) setOverview(await overviewRes.json());
      if (profileRes.ok) {
        const profile = await profileRes.json();
        const dismissed =
          typeof window !== "undefined" &&
          localStorage.getItem("upi-prompt-dismissed") === "1";
        setNeedsUpi(!profile.upiId && !dismissed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const dismissUpiPrompt = () => {
    setNeedsUpi(false);
    if (typeof window !== "undefined") localStorage.setItem("upi-prompt-dismissed", "1");
  };

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      if (res.ok) {
        setNewName("");
        setNewDesc("");
        setShowCreate(false);
        load();
      }
    } finally {
      setCreating(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted">Loading…</div>
      </div>
    );
  }

  const firstName = (session?.user?.name || session?.user?.email || "there").split(/[\s@]/)[0];
  const net = overview?.summary.net ?? 0;
  const youOwe = overview?.summary.youOwe ?? 0;
  const youAreOwed = overview?.summary.youAreOwed ?? 0;

  return (
    <div className="min-h-screen safe-bottom">
      <AppHeader />

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Greeting */}
        <div className="fade-up">
          <p className="text-muted text-sm">Hey {firstName} 👋</p>
          <h1 className="text-2xl font-semibold tracking-tight">Here&apos;s your money map</h1>
        </div>

        {/* Add UPI nudge */}
        {needsUpi && (
          <section className="fade-up rounded-2xl border border-primary/30 bg-primary-soft p-4 flex items-center gap-3">
            <span className="text-2xl shrink-0">💸</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Add your UPI ID</p>
              <p className="text-xs text-muted mt-0.5">
                So friends can pay you back in one tap.
              </p>
            </div>
            <Link
              href="/profile"
              className="shrink-0 px-4 py-2 rounded-xl bg-gradient-brand text-white text-sm font-medium shadow-lg shadow-primary/30"
            >
              Add
            </Link>
            <button
              onClick={dismissUpiPrompt}
              className="shrink-0 w-8 h-8 rounded-lg text-muted hover:text-foreground transition-colors text-lg leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          </section>
        )}

        {/* Balance hero */}
        <section className="float-in relative overflow-hidden rounded-3xl border border-border p-6 bg-gradient-brand-soft">
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <p className="text-xs uppercase tracking-widest text-muted-strong">
              Net balance across all groups
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span
                className={`text-5xl font-semibold tracking-tight ${
                  net > 0.01 ? "text-success" : net < -0.01 ? "text-danger" : "text-foreground"
                }`}
              >
                {net >= 0 ? "+" : "−"}₹{Math.abs(net).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-sm text-muted mt-2">
              {net > 0.01
                ? "You're up. Friends owe you more than you owe them."
                : net < -0.01
                ? "You're down. Time to settle up?"
                : "All squared up. Nice."}
            </p>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="rounded-2xl bg-background-elevated/70 border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted">You are owed</p>
                <p className="text-xl font-semibold text-success mt-1">
                  ₹{youAreOwed.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-2xl bg-background-elevated/70 border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted">You owe</p>
                <p className="text-xl font-semibold text-danger mt-1">
                  ₹{youOwe.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <section className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-2xl bg-card border border-border p-3 flex flex-col items-center gap-2 hover:bg-card-hover transition-all active:scale-[0.98]"
          >
            <span className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center text-primary">
              <UsersIcon size={20} />
            </span>
            <span className="text-xs font-medium">New Group</span>
          </button>
          <Link
            href="/ai"
            className="rounded-2xl border border-border p-3 flex flex-col items-center gap-2 bg-gradient-brand text-white shadow-lg shadow-primary/30 active:scale-[0.98] transition-all"
          >
            <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <MicIcon size={20} />
            </span>
            <span className="text-xs font-medium">Voice + AI</span>
          </Link>
          <Link
            href="/expenses"
            className="rounded-2xl bg-card border border-border p-3 flex flex-col items-center gap-2 hover:bg-card-hover transition-all active:scale-[0.98]"
          >
            <span className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center text-accent">
              <PlusIcon size={20} />
            </span>
            <span className="text-xs font-medium">Add Expense</span>
          </Link>
        </section>

        {/* Who owes whom */}
        {overview && overview.perPerson.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-muted-strong uppercase tracking-wider">
                Who&apos;s up with whom
              </h2>
            </div>
            <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
              {overview.perPerson.slice(0, 5).map((p) => {
                const positive = p.amount > 0;
                return (
                  <div key={p.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                          positive ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                        }`}
                      >
                        {p.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted">
                          {positive ? "owes you" : "you owe them"}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`font-semibold tabular-nums ${
                        positive ? "text-success" : "text-danger"
                      }`}
                    >
                      {positive ? "+" : "−"}₹{Math.abs(p.amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Groups */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-muted-strong uppercase tracking-wider">
              Your groups
            </h2>
            <button
              onClick={() => setShowCreate(true)}
              className="text-primary text-xs font-medium hover:underline"
            >
              + New
            </button>
          </div>
          {overview && overview.groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <div className="text-3xl mb-2">🫂</div>
              <p className="font-medium">Start your first group</p>
              <p className="text-muted text-sm mt-1">
                Create a group to start splitting with friends.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-brand text-white font-medium shadow-lg shadow-primary/30"
              >
                Create Group
              </button>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 snap-x">
              {overview?.groups.map((g) => {
                const positive = g.net > 0.01;
                const negative = g.net < -0.01;
                return (
                  <Link
                    key={g.id}
                    href={`/groups/${g.id}`}
                    className="snap-start min-w-[78%] rounded-2xl bg-card border border-border p-4 hover:bg-card-hover transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-brand-soft border border-border flex items-center justify-center text-lg">
                        {g.name[0].toUpperCase()}
                      </div>
                      <span className="text-[10px] uppercase tracking-wide text-muted">
                        {g.members} {g.members === 1 ? "member" : "members"}
                      </span>
                    </div>
                    <h3 className="font-semibold truncate">{g.name}</h3>
                    <p className="text-xs text-muted mt-0.5">{g.expenses} expenses</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span
                        className={`text-sm font-semibold ${
                          positive ? "text-success" : negative ? "text-danger" : "text-muted-strong"
                        }`}
                      >
                        {Math.abs(g.net) < 0.01
                          ? "Settled"
                          : (positive ? "+" : "−") +
                            "₹" +
                            Math.abs(g.net).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-muted">
                        <ArrowRightIcon size={16} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-muted-strong uppercase tracking-wider">
              Recent activity
            </h2>
            <Link href="/expenses" className="text-primary text-xs font-medium hover:underline">
              View all
            </Link>
          </div>
          {overview && overview.recent.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted text-sm">
              No expenses yet. Try the AI tab to add one with voice.
            </div>
          ) : (
            <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
              {overview?.recent.slice(0, 6).map((r) => (
                <Link
                  key={r.id}
                  href={`/groups/${r.groupId}`}
                  className="flex items-center justify-between p-4 hover:bg-card-hover transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-background-elevated border border-border flex items-center justify-center text-lg shrink-0">
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
                      className={`text-[11px] tabular-nums ${
                        r.youPaid ? "text-success" : "text-danger"
                      }`}
                    >
                      {r.youPaid ? "you lent " : "you owe "}
                      ₹{(r.youPaid ? r.amount - r.yourShare : r.yourShare).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* AI nudge */}
        <Link
          href="/ai"
          className="block rounded-3xl p-5 border border-border bg-card hover:bg-card-hover transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center text-white shadow-lg shadow-primary/30 shrink-0">
              <SparkleIcon size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Ask the AI bro</p>
              <p className="text-xs text-muted mt-0.5">
                &ldquo;Add 500 dinner with Rahul split equally&rdquo; — works just like that.
              </p>
            </div>
            <ArrowRightIcon size={18} className="text-muted" />
          </div>
        </Link>
      </main>

      {/* Create Group Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-3">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md float-in">
            <h2 className="text-lg font-semibold mb-1">New group</h2>
            <p className="text-muted text-sm mb-5">Roommates, trip, dinner crew — name it.</p>
            <form onSubmit={createGroup} className="space-y-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background-elevated border border-border focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25 transition-all"
                placeholder="Group name"
                required
                autoFocus
              />
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background-elevated border border-border focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25 transition-all"
                placeholder="Description (optional)"
              />
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 rounded-xl border border-border text-muted hover:text-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 rounded-xl bg-gradient-brand text-white font-medium shadow-lg shadow-primary/30 disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Create group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
