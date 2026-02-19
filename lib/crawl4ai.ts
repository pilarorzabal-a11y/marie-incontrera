const CRAWL4AI_URL = process.env.CRAWL4AI_URL!;
const CRAWL4AI_TOKEN = process.env.CRAWL4AI_TOKEN!;

export interface CrawlResult {
  success: boolean;
  result?: {
    tables?: Array<{ headers: string[]; rows: string[][] }>;
    links?: { internal: Array<{ href: string; text: string }> };
    cleaned_html?: string;
  };
  error?: string;
}

export async function crawlUrl(url: string): Promise<CrawlResult> {
  const response = await fetch(`${CRAWL4AI_URL}/crawl`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CRAWL4AI_TOKEN}`,
    },
    body: JSON.stringify({ urls: [url] }),
  });

  if (!response.ok) {
    throw new Error(`Crawl4AI error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // v0.5.x: { success, results: [...] }
  if (Array.isArray(data.results)) {
    const r = data.results[0];
    if (!r) return { success: false, error: "No results returned" };
    return {
      success: r.success ?? true,
      result: {
        tables: r.tables,
        links: r.links,
        cleaned_html: r.cleaned_html,
      },
    };
  }

  // Legacy async task
  if (data.task_id) {
    return await pollTask(data.task_id);
  }

  return { success: false, error: "Unexpected response format" };
}

async function pollTask(
  taskId: string,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<CrawlResult> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const response = await fetch(`${CRAWL4AI_URL}/task/${taskId}`, {
      headers: { Authorization: `Bearer ${CRAWL4AI_TOKEN}` },
    });

    if (!response.ok) continue;

    const data = await response.json();
    if (data.status === "completed") return { success: true, result: data.result };
    if (data.status === "failed") return { success: false, error: data.error };
  }

  return { success: false, error: "Timeout waiting for crawl task" };
}
