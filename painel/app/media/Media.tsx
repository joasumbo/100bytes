"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Folder, FileImage, File as FileIcon, Trash2, Upload, ChevronRight, Home } from "lucide-react";

type Item = { name: string; size: number; isDir: boolean; modTime: string; key: string; url: string };

function fmtSize(b: number) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}
const isImg = (n: string) => /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(n);

export default function Media() {
  const [prefix, setPrefix] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    const r = await fetch(`/api/media?prefix=${encodeURIComponent(p)}`, { cache: "no-store" });
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(prefix); }, [prefix, load]);

  async function del(key: string) {
    if (!confirm(`Apagar ${key}? Esta ação é irreversível.`)) return;
    const r = await fetch(`/api/media?key=${encodeURIComponent(key)}`, { method: "DELETE" });
    if ((await r.json()).ok) { toast.success("Apagado"); load(prefix); } else toast.error("Falha ao apagar");
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("prefix", prefix);
      const r = await fetch("/api/media", { method: "POST", body: fd });
      if ((await r.json()).ok) toast.success(`${f.name} carregado`); else toast.error(`Falha: ${f.name}`);
    }
    setUploading(false);
    load(prefix);
  }

  const crumbs = prefix ? prefix.split("/") : [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h1>Média</h1>
        <button className="btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload size={15} /> {uploading ? "A carregar…" : "Carregar"}
        </button>
        <input ref={fileRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} style={{ display: "none" }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 13, flexWrap: "wrap" }}>
        <button className="btn-ghost btn-sm" onClick={() => setPrefix("")}><Home size={13} /> bucket</button>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ChevronRight size={13} className="muted" />
            <button className="btn-ghost btn-sm" onClick={() => setPrefix(crumbs.slice(0, i + 1).join("/"))}>{c}</button>
          </span>
        ))}
      </div>

      {loading ? (
        <div className="muted" style={{ padding: 20 }}>A carregar…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
          {items.map((it) => (
            <div key={it.key} className="card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div
                style={{ height: 120, background: "#fafafa", display: "grid", placeItems: "center", cursor: it.isDir ? "pointer" : "default", borderBottom: "1px solid var(--border)", overflow: "hidden" }}
                onClick={() => it.isDir && setPrefix(it.key)}
              >
                {it.isDir ? <Folder size={40} className="muted" /> : isImg(it.name) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.url} alt={it.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                ) : <FileIcon size={40} className="muted" />}
              </div>
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={it.name}>{it.name}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  <span className="muted" style={{ fontSize: 11.5 }}>{it.isDir ? "pasta" : fmtSize(it.size)}</span>
                  {!it.isDir && (
                    <button className="btn-ghost btn-sm" style={{ padding: 4 }} onClick={() => del(it.key)} title="Apagar">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!items.length && <div className="muted" style={{ padding: 20 }}>Pasta vazia.</div>}
        </div>
      )}
    </div>
  );
}
