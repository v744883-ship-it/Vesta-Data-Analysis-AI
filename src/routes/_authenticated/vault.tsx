import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { LockKeyhole, ShieldCheck, Trash2, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResultCard } from "@/components/ResultCard";
import { supabase } from "@/integrations/supabase/client";
import {
  createVault,
  deleteReport,
  getVaultSettings,
  listReports,
  openReport,
  unlockVault,
  type ReportPayload,
  type VaultReportMeta,
} from "@/lib/vault";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({
    meta: [
      { title: "Vault — Encrypted analysis reports | Vesta" },
      {
        name: "description",
        content:
          "Your sealed analysis reports, encrypted with a password only you know and locked automatically when your session ends.",
      },
      { property: "og:title", content: "Vault — Encrypted analysis reports" },
      {
        property: "og:description",
        content: "Password-protected, end-to-end encrypted report storage inside Vesta.",
      },
    ],
  }),
  component: VaultPage,
});

function VaultPage() {
  const [hasVault, setHasVault] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [reports, setReports] = useState<VaultReportMeta[]>([]);
  const [open, setOpen] = useState<ReportPayload | null>(null);

  const lock = useCallback(() => {
    setKey(null);
    setReports([]);
    setOpen(null);
    setPassword("");
  }, []);

  useEffect(() => {
    getVaultSettings()
      .then((settings) => setHasVault(Boolean(settings)))
      .catch((error: Error) => toast.error(error.message));
  }, []);

  // The vault closes the moment the session ends, the tab is hidden for good,
  // or the page unloads — the key only ever lives in memory.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") lock();
    });
    window.addEventListener("pagehide", lock);
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("pagehide", lock);
      lock();
    };
  }, [lock]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (!hasVault) {
        if (password.length < 8) throw new Error("Use at least 8 characters.");
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
      }
      const derived = hasVault ? await unlockVault(password) : await createVault(password);
      setHasVault(true);
      setKey(derived);
      setPassword("");
      setConfirmPassword("");
      setReports(await listReports());
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function view(id: string) {
    if (!key) return;
    try {
      setOpen(await openReport(key, id));
    } catch {
      toast.error("This report could not be decrypted with the current key.");
    }
  }

  async function remove(id: string) {
    try {
      await deleteReport(id);
      setReports(await listReports());
      setOpen(null);
      toast.success("Report deleted.");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  function download(report: ReportPayload) {
    const lines = [
      report.title,
      `Dataset: ${report.datasetName} · ${report.rowCount} rows · ${report.columnCount} columns`,
      `Sealed: ${new Date(report.createdAt).toLocaleString()}`,
      report.prompt ? `Request: ${report.prompt}` : "",
      "",
      report.narrative,
      "",
      "Computed figures",
      ...report.results.map((r) =>
        r.kind === "kpi"
          ? `- ${r.task.label}: ${r.value} (${r.unit})`
          : `- ${r.task.label}: ${(r.points ?? []).map((p) => `${p.label}=${p.value}`).join(", ") || r.note || ""}`,
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/[^\w\d-]+/g, "-").slice(0, 60)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!key) {
    return (
      <main className="mx-auto flex max-w-md flex-col px-5 py-20">
        <div className="panel p-7">
          <LockKeyhole className="size-7 text-primary" />
          <h1 className="mt-4 text-2xl">
            {hasVault === false ? "Create your vault" : "Vault locked"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasVault === false
              ? "Set a vault password. Reports are encrypted in your browser with this password — we never store it and cannot recover it."
              : "Enter your vault password to decrypt your sealed reports. The vault relocks automatically when your session ends."}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vault-pass">Vault password</Label>
              <Input
                id="vault-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            {hasVault === false ? (
              <div className="space-y-2">
                <Label htmlFor="vault-confirm">Confirm password</Label>
                <Input
                  id="vault-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={busy || hasVault === null}>
              {busy ? "Working…" : hasVault === false ? "Create vault" : "Unlock vault"}
            </Button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl">Your vault</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Unlocked for this session only · {reports.length} sealed report
            {reports.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button variant="outline" onClick={lock}>
          <LockKeyhole className="size-4" /> Lock vault
        </Button>
      </div>

      {!reports.length ? (
        <p className="panel mt-8 p-8 text-center text-sm text-muted-foreground">
          Nothing sealed yet. Run an analysis in the Studio and choose “Seal in vault”.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <div key={report.id} className="panel flex flex-col justify-between gap-4 p-5">
              <div>
                <h2 className="text-base">{report.title}</h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  {report.dataset_name} · {report.row_count.toLocaleString()} rows ·{" "}
                  {report.column_count} columns
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(report.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void view(report.id)}>
                  Open
                </Button>
                <Button size="sm" variant="outline" onClick={() => void remove(report.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <section className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl">{open.title}</h2>
            <Button variant="outline" onClick={() => download(open)}>
              <Download className="size-4" /> Download report
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {open.datasetName} · sealed {new Date(open.createdAt).toLocaleString()}
          </p>

          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {open.results
              .filter((r) => r.kind === "kpi")
              .map((r, i) => (
                <ResultCard key={`k-${i}`} result={r} />
              ))}
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {open.results
              .filter((r) => r.kind !== "kpi")
              .map((r, i) => (
                <ResultCard key={`c-${i}`} result={r} />
              ))}
          </div>
          {open.narrative ? (
            <article className="panel mt-6 whitespace-pre-wrap p-6 text-sm leading-relaxed text-muted-foreground">
              {open.narrative}
            </article>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
