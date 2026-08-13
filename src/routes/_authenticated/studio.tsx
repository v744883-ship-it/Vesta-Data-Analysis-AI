import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, Sparkles, LockKeyhole, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResultCard } from "@/components/ResultCard";
import {
  compactResults,
  heuristicPlan,
  parseFile,
  runPlan,
  schemaForPlanner,
  type Dataset,
  type Plan,
  type Result,
} from "@/lib/analysis";
import { planAnalysis, writeNarrative } from "@/lib/analysis.functions";
import { createVault, getVaultSettings, saveReport, unlockVault } from "@/lib/vault";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Analysis Studio — Vesta" },
      {
        name: "description",
        content:
          "Upload a CSV or Excel file, describe the analysis you want, and Vesta computes real metrics and charts from your rows.",
      },
      { property: "og:title", content: "Analysis Studio — Vesta" },
      {
        property: "og:description",
        content: "Prompt-driven analysis computed on your actual spreadsheet data.",
      },
    ],
  }),
  component: Studio,
});

const EXAMPLES = [
  "Show revenue by region and the monthly trend",
  "Which categories drive the most orders? Include a distribution",
  "Profile this data and flag anything unusual",
];

function Studio() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [narrative, setNarrative] = useState("");
  const [dragging, setDragging] = useState(false);

  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultExists, setVaultExists] = useState(false);
  const [vaultPassword, setVaultPassword] = useState("");
  const [vaultConfirm, setVaultConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const plan = useServerFn(planAnalysis);
  const narrate = useServerFn(writeNarrative);

  async function ingest(file: File) {
    try {
      setStatus("Reading file…");
      const parsed = await parseFile(file);
      setDataset(parsed);
      setResults([]);
      setNarrative("");
      toast.success(`${parsed.rows.length.toLocaleString()} rows · ${parsed.columns.length} columns`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setStatus(null);
    }
  }

  async function runAnalysis() {
    if (!dataset) return;
    setResults([]);
    setNarrative("");
    try {
      setStatus("Planning the analysis…");
      let chosen: Plan = heuristicPlan(dataset, prompt);
      const planned = await plan({
        data: { prompt, schema: JSON.stringify(schemaForPlanner(dataset)) },
      });
      if (planned.ok && planned.planJson) {
        const parsed = JSON.parse(planned.planJson) as Plan;
        if (parsed.tasks?.length) chosen = { title: parsed.title || chosen.title, tasks: parsed.tasks };
      }

      setStatus("Computing on your rows…");
      let computed = runPlan(dataset, chosen);
      if (!computed.length) {
        chosen = heuristicPlan(dataset, prompt);
        computed = runPlan(dataset, chosen);
      }
      setTitle(chosen.title);
      setResults(computed);

      setStatus("Writing the report…");
      const written = await narrate({
        data: {
          prompt,
          title: chosen.title,
          results: JSON.stringify(compactResults(computed)),
        },
      });
      setNarrative(written.ok ? written.narrative : "");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setStatus(null);
    }
  }

  async function openVaultDialog() {
    try {
      const settings = await getVaultSettings();
      setVaultExists(Boolean(settings));
      setVaultPassword("");
      setVaultConfirm("");
      setVaultOpen(true);
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function sealReport() {
    if (!dataset) return;
    setSaving(true);
    try {
      if (!vaultExists && vaultPassword !== vaultConfirm) {
        throw new Error("Passwords do not match.");
      }
      if (vaultPassword.length < 8) throw new Error("Use at least 8 characters.");

      const key = vaultExists ? await unlockVault(vaultPassword) : await createVault(vaultPassword);
      await saveReport(key, {
        title: title || `Analysis of ${dataset.name}`,
        prompt,
        narrative,
        datasetName: dataset.name,
        rowCount: dataset.rows.length,
        columnCount: dataset.columns.length,
        createdAt: new Date().toISOString(),
        results,
      });
      setVaultOpen(false);
      setVaultPassword("");
      setVaultConfirm("");
      toast.success("Report sealed in your vault.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="text-3xl">Analysis Studio</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Your file is parsed in this browser. Only column names and computed aggregates are used to
        plan and narrate the report — raw rows never leave your machine.
      </p>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        <div
          className={`panel flex flex-col items-center justify-center p-8 text-center transition-colors ${
            dragging ? "border-primary" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) void ingest(file);
          }}
        >
          <FileSpreadsheet className="size-8 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            Drop a CSV, TSV or Excel workbook here
          </p>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void ingest(file);
            }}
          />
          <Button variant="outline" className="mt-4" onClick={() => fileInput.current?.click()}>
            Choose file
          </Button>
          {dataset ? (
            <p className="mt-4 text-xs text-muted-foreground">
              <span className="text-foreground">{dataset.name}</span> ·{" "}
              {dataset.rows.length.toLocaleString()} rows · {dataset.columns.length} columns
            </p>
          ) : null}
        </div>

        <div className="panel p-6">
          <Label htmlFor="prompt">What should Vesta analyse?</Label>
          <Textarea
            id="prompt"
            rows={4}
            className="mt-2 resize-none"
            placeholder="e.g. Break down revenue by region, show the monthly trend and flag the weakest segment."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {example}
              </button>
            ))}
          </div>
          <Button
            className="mt-5 w-full"
            disabled={!dataset || Boolean(status)}
            onClick={() => void runAnalysis()}
          >
            {status ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {status ?? "Run analysis"}
          </Button>
        </div>
      </div>

      {dataset && !results.length && !status ? (
        <section className="panel mt-8 p-6">
          <h2 className="text-lg">Column profile</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Column</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium">Unique</th>
                  <th className="pb-2 pr-4 font-medium">Missing</th>
                  <th className="pb-2 pr-4 font-medium">Sample</th>
                </tr>
              </thead>
              <tbody>
                {dataset.columns.map((c) => (
                  <tr key={c.name} className="border-t border-border/60">
                    <td className="py-2 pr-4">{c.name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{c.kind}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{c.unique}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{c.missing}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{c.samples.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {results.length ? (
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl">{title}</h2>
            <Button onClick={() => void openVaultDialog()}>
              <LockKeyhole className="size-4" /> Seal in vault
            </Button>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {results
              .filter((r) => r.kind === "kpi")
              .map((r, i) => (
                <ResultCard key={`kpi-${i}`} result={r} />
              ))}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {results
              .filter((r) => r.kind !== "kpi")
              .map((r, i) => (
                <ResultCard key={`chart-${i}`} result={r} />
              ))}
          </div>

          {narrative ? (
            <article className="panel mt-6 whitespace-pre-wrap p-6 text-sm leading-relaxed text-muted-foreground">
              {narrative}
            </article>
          ) : null}
        </section>
      ) : null}

      <Dialog open={vaultOpen} onOpenChange={setVaultOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{vaultExists ? "Unlock your vault" : "Create your vault"}</DialogTitle>
            <DialogDescription>
              {vaultExists
                ? "Enter your vault password to encrypt and store this report."
                : "Choose a vault password. It encrypts every report and is never stored — if you lose it, sealed reports cannot be recovered."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vault-password">Vault password</Label>
              <Input
                id="vault-password"
                type="password"
                value={vaultPassword}
                onChange={(e) => setVaultPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {!vaultExists ? (
              <div className="space-y-2">
                <Label htmlFor="vault-confirm">Confirm password</Label>
                <Input
                  id="vault-confirm"
                  type="password"
                  value={vaultConfirm}
                  onChange={(e) => setVaultConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button disabled={saving} onClick={() => void sealReport()}>
              {saving ? "Encrypting…" : "Seal report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
