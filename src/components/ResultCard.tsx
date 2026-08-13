import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Result } from "@/lib/analysis";

const PALETTE = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const axisProps = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  color: "var(--color-popover-foreground)",
  fontSize: 12,
};

function formatNumber(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function ResultCard({ result }: { result: Result }) {
  const { kind, points = [], task } = result;

  if (kind === "kpi") {
    return (
      <div className="panel p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{task.label}</p>
        <p className="mt-3 font-display text-4xl text-primary">
          {formatNumber(result.value ?? 0)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{result.unit}</p>
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-base">{task.label}</h3>
        {result.note ? <span className="text-xs text-muted-foreground">{result.note}</span> : null}
      </div>

      {kind === "table" && result.table ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                {result.table.columns.map((c) => (
                  <th key={c} className="pb-2 pr-4 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.table.rows.map((row, i) => (
                <tr key={i} className="border-t border-border/60">
                  {row.map((cell, j) => (
                    <td key={j} className="py-2 pr-4">
                      {typeof cell === "number" ? formatNumber(cell) : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {kind === "line" ? (
              <LineChart data={points}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} tickFormatter={formatNumber} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            ) : kind === "pie" ? (
              <PieChart>
                <Tooltip contentStyle={tooltipStyle} />
                <Pie data={points} dataKey="value" nameKey="label" outerRadius={95} label>
                  {points.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
              </PieChart>
            ) : kind === "scatter" ? (
              <ScatterChart>
                <CartesianGrid stroke="var(--color-border)" />
                <XAxis dataKey="x" type="number" name={task.x ?? "x"} {...axisProps} />
                <YAxis dataKey="y" type="number" name={task.y ?? "y"} {...axisProps} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={result.scatter ?? []} fill="var(--color-chart-2)" />
              </ScatterChart>
            ) : (
              <BarChart data={points}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" {...axisProps} interval={0} angle={-18} height={54} dy={12} />
                <YAxis {...axisProps} tickFormatter={formatNumber} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {points.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
