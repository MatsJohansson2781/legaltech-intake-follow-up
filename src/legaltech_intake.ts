import { z } from "zod";
import { InfraiClient } from "./infrai_client.ts";

export const intakeSchema = z.object({
  matterId: z.string().min(1),
  clientName: z.string().min(1),
  signedDocumentUrl: z.string().url(),
  deadline: z.string().date()
});

export type MatterIntake = z.infer<typeof intakeSchema>;
export type SourceListing = { title: string; url: string; source: string };

export function deadlineStatus(deadline: string, today = new Date("2026-01-01")): "follow-up" | "on-track" {
  return new Date(`${deadline}T00:00:00Z`).getTime() <= today.getTime() + 7 * 86400000 ? "follow-up" : "on-track";
}

export async function runIntake(input: unknown, client = new InfraiClient(process.env.INFRAI_API_KEY ?? "")) {
  const matter = intakeSchema.parse(input);
  const search = await client.request<{ results?: Array<{ title?: string; url?: string }> }>("/v1/web/search", {
    query: "legal technology matter intake signed document delivery",
    max_results: 5,
    include_domains: ["law.com", "legaltechhub.com"],
    exclude_domains: []
  });
  const listings: SourceListing[] = [];
  for (const result of search.results ?? []) {
    if (!result.url || !result.title) continue;
    await client.request("/v1/web/scrape", { url: result.url, format: "markdown" });
    listings.push({ title: result.title, url: result.url, source: new URL(result.url).hostname });
  }
  await client.request("/v1/queue/publish", {
    queue: "legaltech-deadline-follow-up",
    payload: { matterId: matter.matterId, signedDocumentUrl: matter.signedDocumentUrl, deadline: matter.deadline }
  });
  return { matter, signedDelivery: "queued", deadline: deadlineStatus(matter.deadline), listings };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = { matterId: "matter-104", clientName: "Aster Media", signedDocumentUrl: "https://files.example.test/signed/104", deadline: "2026-01-05" };
  console.log(JSON.stringify({ input, next: deadlineStatus(input.deadline) }, null, 2));
}
