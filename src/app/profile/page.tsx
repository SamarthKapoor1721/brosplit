"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import AppHeader from "@/components/AppHeader";
import { useToast } from "@/components/Toast";
import { isValidUpiId } from "@/lib/upi";
import { CreditIcon, TrashIcon } from "@/components/Icons";

interface Profile {
  id: string;
  name: string | null;
  email: string;
  upiId: string | null;
  upiDisplayName: string | null;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [upiId, setUpiId] = useState("");
  const [upiDisplayName, setUpiDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data: Profile = await res.json();
        setProfile(data);
        setUpiId(data.upiId || "");
        setUpiDisplayName(data.upiDisplayName || data.name || "");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");

    const trimmed = upiId.trim();
    if (trimmed && !isValidUpiId(trimmed)) {
      setFieldError("That doesn't look like a UPI ID. Try something like alice@ybl");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upiId: trimmed,
          upiDisplayName: upiDisplayName.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFieldError(data.error || "Couldn't save");
        return;
      }
      setProfile(data);
      showToast("Payment settings saved");
    } catch {
      showToast("Network error — try again", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeUpi = async () => {
    if (!confirm("Remove your UPI ID? Friends won't be able to pay you in one tap.")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upiId: "", upiDisplayName: null }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setUpiId("");
        setUpiDisplayName(data.name || "");
        showToast("UPI ID removed");
      }
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted">Loading…</div>
      </div>
    );
  }
  if (!profile) return null;

  const hasUpi = !!profile.upiId;

  return (
    <div className="min-h-screen safe-bottom">
      <AppHeader title="Profile" subtitle="Account & payment settings" back={{ href: "/dashboard" }} />

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Identity card */}
        <section className="rounded-3xl border border-border p-5 bg-card flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary/30">
            {(profile.name || profile.email)[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-lg truncate">{profile.name || "—"}</p>
            <p className="text-muted text-sm truncate">{profile.email}</p>
          </div>
        </section>

        {/* Payment settings */}
        <section className="rounded-3xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
              <CreditIcon size={20} />
            </span>
            <div>
              <h2 className="font-semibold">Payment settings</h2>
              <p className="text-xs text-muted">
                {hasUpi
                  ? "Friends can pay you in one tap."
                  : "No UPI ID configured — add one so friends can pay you instantly."}
              </p>
            </div>
          </div>

          {hasUpi && (
            <div className="px-5 pt-4">
              <div className="rounded-2xl bg-success-soft border border-success/20 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-success font-semibold">Active UPI ID</p>
                  <p className="font-mono text-sm mt-0.5 truncate">{profile.upiId}</p>
                  {profile.upiDisplayName && (
                    <p className="text-xs text-muted mt-0.5">shows as &ldquo;{profile.upiDisplayName}&rdquo;</p>
                  )}
                </div>
                <button
                  onClick={removeUpi}
                  disabled={saving}
                  className="shrink-0 w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-muted hover:text-danger transition-colors"
                  title="Remove UPI ID"
                  aria-label="Remove UPI ID"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            </div>
          )}

          <form onSubmit={save} className="p-5 space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-strong font-semibold mb-2">
                UPI ID
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => {
                  setUpiId(e.target.value);
                  setFieldError("");
                }}
                className={`w-full px-4 py-3 rounded-xl bg-background-elevated border font-mono text-sm focus:outline-none focus:ring-2 transition-all ${
                  fieldError
                    ? "border-danger/60 focus:border-danger focus:ring-danger/25"
                    : "border-border focus:border-primary/60 focus:ring-primary/25"
                }`}
                placeholder="yourname@ybl"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              {fieldError ? (
                <p className="text-danger text-xs mt-1.5">{fieldError}</p>
              ) : (
                <p className="text-muted text-xs mt-1.5">
                  e.g. alice@ybl, name@oksbi, 98xxxxxx@paytm
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-strong font-semibold mb-2">
                Display name
              </label>
              <input
                type="text"
                value={upiDisplayName}
                onChange={(e) => setUpiDisplayName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background-elevated border border-border focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25 transition-all"
                placeholder="Name shown in UPI apps"
                maxLength={100}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-gradient-brand text-white font-medium shadow-lg shadow-primary/30 disabled:opacity-50"
            >
              {saving ? "Saving…" : hasUpi ? "Update payment settings" : "Save payment settings"}
            </button>
          </form>
        </section>

        <p className="text-[11px] text-muted text-center px-6">
          Your UPI ID is only shown to people in your groups when they owe you money.
          BroSplit never moves money itself — payments happen in your UPI app.
        </p>
      </main>
      {toast}
    </div>
  );
}
