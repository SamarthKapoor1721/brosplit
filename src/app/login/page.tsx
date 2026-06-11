"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
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
          <p className="text-muted mt-3 text-sm">Welcome back. Let&apos;s settle up.</p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-7">
          <h2 className="text-lg font-semibold mb-5">Log in</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-danger-soft border border-danger/30 text-danger text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-brand text-white font-medium shadow-lg shadow-primary/30 disabled:opacity-50"
            >
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>

          <p className="text-center text-muted text-sm mt-6">
            New here?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
