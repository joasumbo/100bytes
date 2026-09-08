import { NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { run } from "@/lib/system";

export const dynamic = "force-dynamic";

const RC = "sudo rclone --config /root/.config/rclone/rclone.conf";
const BUCKET = "r2:100bytes";
const CDN = "https://cdn.100bytes.co.ao";

function safePrefix(p: string) {
  return p.replace(/\.\./g, "").replace(/^\/+/, "").replace(/[^A-Za-z0-9/_.\-]/g, "");
}

export async function GET(req: Request) {
  const prefix = safePrefix(new URL(req.url).searchParams.get("prefix") || "");
  const path = prefix ? `${BUCKET}/${prefix}` : BUCKET;
  const raw = await run(`${RC} lsjson "${path}" --max-depth 1 2>/dev/null`);
  let items: { name: string; size: number; isDir: boolean; modTime: string; key: string; url: string }[] = [];
  try {
    const arr = JSON.parse(raw) as { Name: string; Size: number; IsDir: boolean; ModTime: string; Path: string }[];
    items = arr.map((o) => {
      const key = prefix ? `${prefix}/${o.Path}` : o.Path;
      return { name: o.Name, size: o.Size, isDir: o.IsDir, modTime: o.ModTime, key, url: `${CDN}/${key}` };
    });
    items.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
  } catch { items = []; }
  return NextResponse.json({ prefix, items, cdn: CDN });
}

export async function DELETE(req: Request) {
  const key = safePrefix(new URL(req.url).searchParams.get("key") || "");
  if (!key) return NextResponse.json({ error: "key em falta" }, { status: 400 });
  const out = await run(`${RC} deletefile "${BUCKET}/${key}" 2>&1`);
  return NextResponse.json({ ok: !out.trim() || /deleted/i.test(out), output: out.trim() });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const prefix = safePrefix(String(form.get("prefix") || ""));
  if (!file) return NextResponse.json({ error: "ficheiro em falta" }, { status: 400 });
  const name = safePrefix(file.name);
  const tmp = `/tmp/upload_${Date.now()}_${name}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(tmp, buf);
  const dest = prefix ? `${BUCKET}/${prefix}/${name}` : `${BUCKET}/${name}`;
  const out = await run(`${RC} copyto "${tmp}" "${dest}" 2>&1`);
  await unlink(tmp).catch(() => {});
  return NextResponse.json({ ok: !out.trim(), output: out.trim(), key: prefix ? `${prefix}/${name}` : name });
}
