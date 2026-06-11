"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { isValidUpiId } from "@/lib/upi";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [upiId, setUpiId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedUpi = upiId.trim();
    if (trimmedUpi && !isValidUpiId(trimmedUpi)) {
      setError("That doesn't look like a UPI ID. Try something like alice@ybl");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, upiId: trimmedUpi }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      // Auto-login after register
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but could not log in. Please try logging in.");
      } else {
        router.push(redirect || "/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-11 h-11 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-bold shadow-lg shadow-primary/30">
              B$
            </div>
            <span className="text-2xl font-bold tracking-tight">
              BRO<span className="text-gradient">SPLIT</span>
            </span>
          </Link>
          <p className="text-muted mt-3 text-sm">Join the squad. Splitting is a team sport.</p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-7">
          <h2 className="text-lg font-semibold mb-5">Create account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-danger-soft border border-danger/30 text-danger text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-strong font-semibold mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background-elevated border border-border focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25 transition-all"
                placeholder="Your name"
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-strong font-semibold mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background-elevated border border-border focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25 transition-all"
                placeholder="bro@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-strong font-semibold mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background-elevated border border-border focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25 transition-all"
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-strong font-semibold mb-2">
                UPI ID <span className="text-muted normal-case tracking-normal font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background-elevated border border-border font-mono text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25 transition-all"
                placeholder="yourname@ybl"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              <p className="text-muted text-xs mt-1.5">
                Add it now so friends can pay you in one tap. You can change it later in your profile.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-brand text-white font-medium shadow-lg shadow-primary/30 disabled:opacity-50"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-muted text-sm mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted">Loading...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
