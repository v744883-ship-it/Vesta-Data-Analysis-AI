import Papa from "papaparse";
import * as XLSX from "xlsx";

export type Row = Record<string, unknown>;
export type ColumnKind = "number" | "date" | "category" | "text";

export interface ColumnProfile {
  name: string;
  kind: ColumnKind;
  missing: number;
  unique: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  samples: string[];
}

export interface Dataset {
  name: string;
  rows: Row[];
  columns: ColumnProfile[];
}

export type Agg = "sum" | "avg" | "count" | "min" | "max" | "median";
export type TaskType = "kpi" | "bar" | "line" | "pie" | "table" | "scatter" | "histogram";

export interface Task {
  type: TaskType;
  label: string;
  groupBy?: string;
  metric?: string;
  agg?: Agg;
  limit?: number;
  sort?: "asc" | "desc";
  x?: string;
  y?: string;
}

export interface Plan {
  title: string;
  tasks: Task[];
}

export interface Point {
  label: string;
  value: number;
}

export interface Result {
  task: Task;
  kind: TaskType;
  value?: number;
  unit?: string;
  points?: Point[];
  scatter?: { x: number; y: number }[];
  table?: { columns: string[]; rows: (string | number)[][] };
  note?: string;
}

const DATE_RE = /^\d{4}[-/]\d{1,2}([-/]\d{1,2})?([ T].*)?$/;

function isBlank(v: unknown) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

export function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[$€£,%\s]/g, "").replace(/,/g, "");
    if (cleaned === "" || Number.isNaN(Number(cleaned))) return null;
    return Number(cleaned);
  }
  return null;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function profileColumns(rows: Row[]): ColumnProfile[] {
  const names = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  return names.map((name) => {
    const raw = rows.map((r) => r[name]);
    const present = raw.filter((v) => !isBlank(v));
    const numbers = present.map(toNumber).filter((n): n is number => n !== null);
    const uniques = new Set(present.map((v) => String(v)));
    const numericRatio = present.length ? numbers.length / present.length : 0;
    const dateLike =
      present.length > 0 &&
      present.filter((v) => v instanceof Date || DATE_RE.test(String(v))).length /
        present.length >
        0.8;

    let kind: ColumnKind = "text";
    if (dateLike) kind = "date";
    else if (numericRatio > 0.85 && numbers.length > 0) kind = "number";
    else if (uniques.size <= Math.max(30, present.length * 0.4)) kind = "category";

    const profile: ColumnProfile = {
      name,
      kind,
      missing: raw.length - present.length,
      unique: uniques.size,
      samples: Array.from(uniques).slice(0, 4).map(String),
    };

    if (kind === "number" && numbers.length) {
      profile.min = Math.min(...numbers);
      profile.max = Math.max(...numbers);
      profile.mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      profile.median = median(numbers);
    }
    return profile;
  });
}

export async function parseFile(file: File): Promise<Dataset> {
  const lower = file.name.toLowerCase();
  let rows: Row[] = [];

  if (lower.endsWith(".csv") || lower.endsWith(".tsv") || lower.endsWith(".txt")) {
    const text = await file.text();
    const parsed = Papa.parse<Row>(text, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: true,
    });
    rows = (parsed.data ?? []).filter((r) => r && Object.keys(r).length > 0);
  } else {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error("This workbook has no sheets.");
    rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets[sheetName]!, { defval: null });
  }

  if (!rows.length) throw new Error("No rows found in this file.");
  return { name: file.name, rows, columns: profileColumns(rows) };
}

function aggregate(values: number[], agg: Agg): number {
  if (agg === "count") return values.length;
  if (!values.length) return 0;
  switch (agg) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "median":
      return median(values);
  }
}

function groupPoints(rows: Row[], task: Task): Point[] {
  const { groupBy, metric, agg = metric ? "sum" : "count" } = task;
  if (!groupBy) return [];
  const buckets = new Map<string, number[]>();
  for (const row of rows) {
    const rawKey = row[groupBy];
    if (isBlank(rawKey)) continue;
    const key = rawKey instanceof Date ? rawKey.toISOString().slice(0, 10) : String(rawKey);
    const bucket = buckets.get(key) ?? [];
    if (metric) {
      const n = toNumber(row[metric]);
      if (n !== null) bucket.push(n);
    } else {
      bucket.push(1);
    }
    buckets.set(key, bucket);
  }

  let points = Array.from(buckets.entries()).map(([label, values]) => ({
    label,
    value: Number(aggregate(values, metric ? agg : "count").toFixed(4)),
  }));

  if (task.type === "line") points.sort((a, b) => a.label.localeCompare(b.label));
  else points.sort((a, b) => (task.sort === "asc" ? a.value - b.value : b.value - a.value));

  const limit = task.limit ?? (task.type === "line" ? 200 : 12);
  points = points.slice(0, limit);
  return points;
}

function histogram(rows: Row[], column: string, bins = 12): Point[] {
  const values = rows.map((r) => toNumber(r[column])).filter((n): n is number => n !== null);
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ label: String(min), value: values.length }];
  const width = (max - min) / bins;
  const counts = new Array(bins).fill(0) as number[];
  for (const v of values) {
    const idx = Math.min(bins - 1, Math.floor((v - min) / width));
    counts[idx] = (counts[idx] ?? 0) + 1;
  }
  return counts.map((count, i) => ({
    label: `${(min + i * width).toFixed(1)}–${(min + (i + 1) * width).toFixed(1)}`,
    value: count,
  }));
}

export function runPlan(dataset: Dataset, plan: Plan): Result[] {
  const cols = new Map(dataset.columns.map((c) => [c.name, c]));
  const results: Result[] = [];

  for (const task of plan.tasks) {
    const missing = [task.groupBy, task.metric, task.x, task.y].filter(
      (c) => c && !cols.has(c),
    ) as string[];
    if (missing.length) continue;

    if (task.type === "kpi") {
      const values = task.metric
        ? dataset.rows.map((r) => toNumber(r[task.metric!])).filter((n): n is number => n !== null)
        : [];
      const agg: Agg = task.agg ?? (task.metric ? "sum" : "count");
      results.push({
        task,
        kind: "kpi",
        value: task.metric ? Number(aggregate(values, agg).toFixed(2)) : dataset.rows.length,
        unit: task.metric ? `${agg} of ${task.metric}` : "rows",
      });
      continue;
    }

    if (task.type === "scatter" && task.x && task.y) {
      const scatter = dataset.rows
        .map((r) => ({ x: toNumber(r[task.x!]), y: toNumber(r[task.y!]) }))
        .filter((p): p is { x: number; y: number } => p.x !== null && p.y !== null)
        .slice(0, 2000);
      const n = scatter.length;
      let note: string | undefined;
      if (n > 2) {
        const mx = scatter.reduce((a, p) => a + p.x, 0) / n;
        const my = scatter.reduce((a, p) => a + p.y, 0) / n;
        const cov = scatter.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0);
        const sx = Math.sqrt(scatter.reduce((a, p) => a + (p.x - mx) ** 2, 0));
        const sy = Math.sqrt(scatter.reduce((a, p) => a + (p.y - my) ** 2, 0));
        const r = sx && sy ? cov / (sx * sy) : 0;
        note = `Pearson r = ${r.toFixed(3)} across ${n} points`;
      }
      results.push({ task, kind: "scatter", scatter, note: note ?? "" });
      continue;
    }

    if (task.type === "histogram" && task.metric) {
      results.push({ task, kind: "histogram", points: histogram(dataset.rows, task.metric) });
      continue;
    }

    if (task.type === "table") {
      const points = groupPoints(dataset.rows, { ...task, limit: task.limit ?? 15 });
      results.push({
        task,
        kind: "table",
        table: {
          columns: [task.groupBy ?? "value", `${task.agg ?? "count"}${task.metric ? ` · ${task.metric}` : ""}`],
          rows: points.map((p) => [p.label, p.value]),
        },
      });
      continue;
    }

    const points = groupPoints(dataset.rows, task);
    if (points.length) results.push({ task, kind: task.type, points });
  }

  return results;
}

export function heuristicPlan(dataset: Dataset, prompt: string): Plan {
  const numeric = dataset.columns.filter((c) => c.kind === "number");
  const categorical = dataset.columns.filter((c) => c.kind === "category");
  const dates = dataset.columns.filter((c) => c.kind === "date");
  const tasks: Task[] = [{ type: "kpi", label: "Rows analysed" }];

  if (numeric[0]) {
    tasks.push({ type: "kpi", label: `Total ${numeric[0].name}`, metric: numeric[0].name, agg: "sum" });
    tasks.push({ type: "kpi", label: `Average ${numeric[0].name}`, metric: numeric[0].name, agg: "avg" });
  }
  if (categorical[0]) {
    tasks.push({
      type: "bar",
      label: numeric[0]
        ? `${numeric[0].name} by ${categorical[0].name}`
        : `Records by ${categorical[0].name}`,
      groupBy: categorical[0].name,
      ...(numeric[0] ? { metric: numeric[0].name, agg: "sum" as Agg } : {}),
      limit: 10,
    });
  }
  if (dates[0] && numeric[0]) {
    tasks.push({
      type: "line",
      label: `${numeric[0].name} over ${dates[0].name}`,
      groupBy: dates[0].name,
      metric: numeric[0].name,
      agg: "sum",
    });
  }
  if (categorical[1]) {
    tasks.push({
      type: "pie",
      label: `Share by ${categorical[1].name}`,
      groupBy: categorical[1].name,
      limit: 6,
    });
  }
  if (numeric[0] && numeric[1]) {
    tasks.push({
      type: "scatter",
      label: `${numeric[0].name} vs ${numeric[1].name}`,
      x: numeric[0].name,
      y: numeric[1].name,
    });
  }
  if (numeric[0]) {
    tasks.push({ type: "histogram", label: `Distribution of ${numeric[0].name}`, metric: numeric[0].name });
  }

  return {
    title: prompt.trim() ? prompt.trim().slice(0, 80) : `Overview of ${dataset.name}`,
    tasks,
  };
}

export function schemaForPlanner(dataset: Dataset) {
  return {
    dataset: dataset.name,
    rowCount: dataset.rows.length,
    columns: dataset.columns.map((c) => ({
      name: c.name,
      kind: c.kind,
      unique: c.unique,
      missing: c.missing,
      samples: c.samples,
    })),
  };
}

export function compactResults(results: Result[]) {
  return results.map((r) => ({
    label: r.task.label,
    kind: r.kind,
    value: r.value,
    unit: r.unit,
    note: r.note,
    points: r.points?.slice(0, 10),
    table: r.table ? { columns: r.table.columns, rows: r.table.rows.slice(0, 10) } : undefined,
  }));
}
