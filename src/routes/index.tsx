import { createFileRoute, Link } from "@tanstack/react-router";
import { FileSpreadsheet, LineChart, LockKeyhole, ShieldCheck, Sparkles, Cpu } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vesta — Prompt-driven analysis with an encrypted vault" },
      {
        name: "description",
        content:
          "Upload a CSV or Excel file, describe the analysis you want, and Vesta computes real metrics and charts from your rows — then seals the report in a password-protected vault.",
      },
      { property: "og:title", content: "Vesta — Prompt-driven analysis with an encrypted vault" },
      {
        property: "og:description",
        content:
          "Describe the analysis you want. Vesta computes it on your real data and locks the report in your vault.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: FileSpreadsheet,
    title: "Ingest anything tabular",
    body: "CSV, TSV and Excel workbooks are parsed and profiled in your browser — column types, cardinality and missing values in one pass.",
  },
  {
    icon: Sparkles,
    title: "Prompt becomes a plan",
    body: "Your request is translated into a typed analysis plan of KPIs, group-bys, trends and distributions against the real column schema.",
  },
  {
    icon: Cpu,
    title: "Computed, not guessed",
    body: "Every figure is aggregated from your actual rows. The written report only ever cites numbers the engine computed.",
  },
  {
    icon: LineChart,
    title: "Charts chosen for you",
    body: "Bars, trends, shares, scatter and histograms are selected to match the question you asked.",
  },
  {
    icon: LockKeyhole,
    title: "The Vault",
    body: "Seal any report behind a vault password you set. Reports are AES-256 encrypted in the browser before they ever reach the server.",
  },
  {
    icon: ShieldCheck,
    title: "Closes with your session",
    body: "The vault key lives only in memory. Sign out, close the tab or end the session and the vault relocks instantly.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <span className="font-display text-xl">Vesta</span>
        <Button asChild variant="outline" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 md:pt-24">
          <p className="text-xs uppercase tracking-[0.25em] text-primary">
            Prompt-driven data analysis
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl leading-[1.05] md:text-6xl">
            <span className="text-gradient">Describe the analysis.</span>
            <br />
            Vesta computes it on your data.
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground">
            Drop in a spreadsheet, write what you want to know, and get real metrics, automatically
            chosen charts and a written report — then lock it away in a vault only your password
            opens.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Start analysing</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/vault">
                <LockKeyhole className="size-4" /> Open the vault
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="panel p-6">
                <Icon className="size-5 text-primary" />
                <h2 className="mt-4 text-lg">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="panel p-8 md:p-12">
            <h2 className="text-3xl">How the vault works</h2>
            <ol className="mt-6 grid gap-6 md:grid-cols-3">
              {[
                [
                  "You set the password",
                  "Chosen by you, never sent to the server. A salted PBKDF2 verifier is all that is stored.",
                ],
                [
                  "Reports are sealed",
                  "Findings, figures and narrative are encrypted with AES-256-GCM in your browser before upload.",
                ],
                [
                  "The session ends, it closes",
                  "Signing out, closing the tab or losing the session wipes the key — the ciphertext is all that remains.",
                ],
              ].map(([title, body], i) => (
                <li key={title}>
                  <span className="font-display text-3xl text-primary">0{i + 1}</span>
                  <h3 className="mt-2 text-lg">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 py-8 text-center text-xs text-muted-foreground">
        Vesta · analysis stays in your browser, reports stay in your vault
      </footer>
    </div>
  );
}
