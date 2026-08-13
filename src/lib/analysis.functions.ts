import { createServerFn } from "@tanstack/react-start";

const MODEL = "google/gemini-3.5-flash";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callGateway(messages: { role: string; content: string }[]) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in AI response");
  return JSON.parse(candidate.slice(start, end + 1));
}

export const planAnalysis = createServerFn({ method: "POST" })
  .inputValidator((data: { prompt: string; schema: string }) => data)
  .handler(async ({ data }) => {
    const system = [
      "You are a data analyst that turns a user's request into a strict JSON analysis plan.",
      "Only reference column names that exist in the provided schema, spelled exactly.",
      "Respond with JSON only, shaped as:",
      '{"title": string, "tasks": [{"type": "kpi"|"bar"|"line"|"pie"|"table"|"scatter"|"histogram", "label": string, "groupBy"?: string, "metric"?: string, "agg"?: "sum"|"avg"|"count"|"min"|"max"|"median", "limit"?: number, "sort"?: "asc"|"desc", "x"?: string, "y"?: string}]}',
      "Rules: kpi needs metric+agg (or neither, meaning row count). bar/line/pie/table need groupBy, optionally metric+agg.",
      "line groupBy should be a date column. scatter needs numeric x and y. histogram needs a numeric metric.",
      "Return 4 to 8 tasks, starting with 2-3 KPIs. No prose.",
    ].join("\n");

    const user = `User request: ${data.prompt || "Give me a general overview of this dataset."}\n\nDataset schema:\n${data.schema}`;

    try {
      const content = await callGateway([
        { role: "system", content: system },
        { role: "user", content: user },
      ]);
      const plan = extractJson(content) as { title?: string; tasks?: unknown[] };
      if (!Array.isArray(plan.tasks) || !plan.tasks.length) throw new Error("Empty plan");
      return { ok: true as const, planJson: JSON.stringify(plan) };
    } catch (error) {
      console.error("planAnalysis failed", error);
      return { ok: false as const, error: (error as Error).message };
    }
  });

export const writeNarrative = createServerFn({ method: "POST" })
  .inputValidator((data: { prompt: string; title: string; results: string }) => data)
  .handler(async ({ data }) => {
    try {
      const content = await callGateway([
        {
          role: "system",
          content:
            "You are a senior analyst writing a short report. Use ONLY the computed figures given to you; never invent numbers. Write 3 short sections: Summary, Key findings (3-5 bullets starting with '- '), Recommended next steps (2-3 bullets). Plain text, no markdown headers beyond the section names on their own line.",
        },
        {
          role: "user",
          content: `Request: ${data.prompt || "General overview"}\nReport title: ${data.title}\nComputed results:\n${data.results}`,
        },
      ]);
      return { ok: true as const, narrative: content.trim() };
    } catch (error) {
      console.error("writeNarrative failed", error);
      return { ok: false as const, error: (error as Error).message };
    }
  });
