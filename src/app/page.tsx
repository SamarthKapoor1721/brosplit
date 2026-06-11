import Link from "next/link";
import { MicIcon, SparkleIcon, ChartIcon, CreditIcon } from "@/components/Icons";

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 glass sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary/30">
              B$
            </div>
            <span className="text-base font-bold tracking-tight">
              BRO<span className="text-gradient">SPLIT</span>
            </span>
          </Link>
          <div className="flex gap-2">
            <Link
              href="/login"
              className="px-4 py-2 text-sm rounded-xl border border-border text-muted hover:text-foreground hover:border-primary/40 transition-all"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm rounded-xl bg-gradient-brand text-white font-medium shadow-lg shadow-primary/30"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5">
        <section className="py-20 sm:py-32 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-soft border border-primary/20 text-primary text-xs font-medium mb-6">
            <SparkleIcon size={14} /> Voice-powered. AI-assisted. Bro-tested.
          </div>
          <h1 className="text-5xl sm:text-7xl font-semibold tracking-tight">
            Split money
            <br />
            <span className="text-gradient">like it&apos;s 2026.</span>
          </h1>
          <p className="text-muted text-base sm:text-lg max-w-xl mx-auto mt-6">
            Just say it: <span className="text-foreground">&ldquo;Add 500 dinner with Rahul split equally.&rdquo;</span>{" "}
            BROSPLIT figures out the math, the people, the category — and shows you who&apos;s up.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              href="/register"
              className="px-7 py-3.5 rounded-2xl bg-gradient-brand text-white font-medium shadow-xl shadow-primary/30"
            >
              Get started — free
            </Link>
            <Link
              href="/login"
              className="px-7 py-3.5 rounded-2xl border border-border text-muted hover:text-foreground hover:border-primary/40 transition-all"
            >
              Log in
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-24">
          <Feature
            icon={<MicIcon size={20} />}
            title="Voice-first entry"
            body="Tap the mic. Talk. Done. Speech-to-expense in under two seconds."
            tone="primary"
          />
          <Feature
            icon={<SparkleIcon size={20} />}
            title="AI assistant"
            body="Natural language → amount, people, category, split — auto-detected."
            tone="accent"
          />
          <Feature
            icon={<ChartIcon size={20} />}
            title="Smart insights"
            body="Where your money goes, who owes you, and how this month stacks up."
            tone="warning"
          />
          <Feature
            icon={<CreditIcon size={20} />}
            title="Credit health"
            body="Your CIBIL score with friendly nudges to keep climbing."
            tone="success"
          />
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-muted text-xs">
        © 2026 BROSPLIT — built for the way you actually hang out.
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone: "primary" | "accent" | "warning" | "success";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent",
    warning: "bg-warning-soft text-warning",
    success: "bg-success-soft text-success",
  };
  return (
    <div className="rounded-2xl bg-card border border-border p-5 hover:bg-card-hover transition-all">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${tones[tone]}`}>
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-muted text-sm leading-snug">{body}</p>
    </div>
  );
}
