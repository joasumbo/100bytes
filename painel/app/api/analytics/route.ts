import { NextResponse } from "next/server";
import { run } from "@/lib/system";

export const dynamic = "force-dynamic";

export async function GET() {
  const raw = await run("sudo tail -n 20000 /var/log/nginx/vhost.log 2>/dev/null");
  const lines = raw.split("\n").filter(Boolean);

  let total = 0;
  const status = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
  const byDomain: Record<string, number> = {};
  const byHour: Record<string, number> = {};
  const paths: Record<string, number> = {};
  const times: number[] = [];
  const slow: Record<string, { sum: number; n: number }> = {};

  for (const l of lines) {
    const [host, , ts, , st, rt, uri] = l.split("|");
    if (!host || !st) continue;
    total++;
    const code = parseInt(st, 10);
    if (code >= 500) status["5xx"]++;
    else if (code >= 400) status["4xx"]++;
    else if (code >= 300) status["3xx"]++;
    else status["2xx"]++;

    byDomain[host] = (byDomain[host] || 0) + 1;

    // bucket por hora (YYYY-MM-DD HH:00)
    const hour = ts ? ts.slice(0, 13).replace("T", " ") + ":00" : "";
    if (hour) byHour[hour] = (byHour[hour] || 0) + 1;

    const t = parseFloat(rt);
    if (!isNaN(t)) {
      times.push(t);
      const key = uri || "/";
      if (!slow[key]) slow[key] = { sum: 0, n: 0 };
      slow[key].sum += t;
      slow[key].n++;
    }
    if (uri) paths[uri] = (paths[uri] || 0) + 1;
  }

  times.sort((a, b) => a - b);
  const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const p95 = times.length ? times[Math.floor(times.length * 0.95)] : 0;

  const timeline = Object.entries(byHour)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-48)
    .map(([t, n]) => ({ t: t.slice(11), requests: n }));

  const topPaths = Object.entries(paths).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([path, n]) => ({ path, n }));
  const domains = Object.entries(byDomain).sort((a, b) => b[1] - a[1]).map(([domain, n]) => ({ domain, n }));
  const slowest = Object.entries(slow)
    .map(([path, v]) => ({ path, avg: Math.round((v.sum / v.n) * 1000), n: v.n }))
    .filter((x) => x.n >= 3)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);

  const errRate = total ? Math.round(((status["4xx"] + status["5xx"]) / total) * 1000) / 10 : 0;

  return NextResponse.json({
    total,
    status,
    errRate,
    avgMs: Math.round(avg * 1000),
    p95Ms: Math.round(p95 * 1000),
    timeline,
    topPaths,
    domains,
    slowest,
  });
}
