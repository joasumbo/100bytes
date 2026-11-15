"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Shield, Trash2, Plus, Eye, EyeOff, Save, RotateCw } from "lucide-react";

type Rule = { num: number; text: string };
type EnvVar = { key: string; value: string; secret: boolean };

export default function Settings() {
  const [tab, setTab] = useState<"firewall" | "env">("firewall");
  return (
    <div>
      <h1 style={{ marginBottom: 18 }}>Definições</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button className={tab === "firewall" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setTab("firewall")}>Firewall</button>
        <button className={tab === "env" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setTab("env")}>Variáveis de ambiente</button>
      </div>
      {tab === "firewall" ? <Firewall /> : <EnvEditor />}
    </div>
  );
}

function Firewall() {
  const [data, setData] = useState<{
    active: boolean;
    rules: Rule[];
    fail2ban: string;
    banned: string;
    bannedIps?: string[];
    jails?: { name: string; banned: string[] }[];
    myIp?: string | null;
  } | null>(null);
  const [port, setPort] = useState("");

  // Desbloquear um IP no fail2ban (SSH) e deixá-lo como de confiança
  async function unban(ip: string) {
    const r = await fetch("/api/firewall", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unban", ip }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) toast.success(`IP ${ip} desbloqueado em todas as jails`, { description: j.output, duration: 15000 });
    else toast.error(j.error || "Falhou");
    load();
  }

  const load = useCallback(async () => {
    const r = await fetch("/api/firewall", { cache: "no-store" });
    if (r.ok) setData(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(action: "allow" | "deny") {
    if (!port) return;
    const r = await fetch("/api/firewall", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, port, proto: "tcp" }) });
    const j = await r.json();
    j.ok ? toast.success(`${action} ${port}/tcp`) : toast.error(j.error || j.output || "falha");
    setPort(""); load();
  }
  async function del(num: number) {
    const r = await fetch(`/api/firewall?num=${num}`, { method: "DELETE" });
    const j = await r.json();
    j.ok ? toast.success("Regra removida") : toast.error(j.error || "falha");
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <div className="card" style={{ padding: 16, minWidth: 160 }}>
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>Firewall (ufw)</div>
          <span className="badge" style={{ color: data?.active ? "var(--success)" : "var(--danger)" }}>
            <span className="dot" style={{ background: data?.active ? "var(--success)" : "var(--danger)" }} />{data?.active ? "ativo" : "inativo"}
          </span>
        </div>
        <div className="card" style={{ padding: 16, minWidth: 160 }}>
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>fail2ban</div>
          <span className="badge" style={{ color: data?.fail2ban === "active" ? "var(--success)" : "var(--danger)" }}>
            <span className="dot" style={{ background: data?.fail2ban === "active" ? "var(--success)" : "var(--danger)" }} />{data?.fail2ban || "?"}
          </span>
        </div>
        <div className="card" style={{ padding: 16, minWidth: 160 }}>
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>IPs banidos (SSH)</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{data?.banned ?? "—"}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 18, maxWidth: 640 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Acesso SSH</div>
            <div className="muted" style={{ fontSize: 12.5 }}>
              O seu IP: <b>{data?.myIp || "desconhecido"}</b>
              {data?.myIp && data?.bannedIps?.includes(data.myIp) ? " · bloqueado pelo fail2ban" : ""}
            </div>
          </div>
          {data?.myIp && (
            <button className="btn btn-sm" onClick={() => unban(data.myIp!)}>Desbloquear o meu IP</button>
          )}
        </div>
        {!!data?.jails?.length && (
          <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Jails: {data.jails.map((j) => `${j.name} (${j.banned.length})`).join(" · ")}
          </div>
        )}
        {!!data?.bannedIps?.length && (
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.bannedIps.map((ip) => (
              <span key={ip} className="badge" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {ip}
                <button className="btn-ghost btn-sm" onClick={() => unban(ip)}>Desbloquear</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 18, display: "flex", gap: 10, alignItems: "center", maxWidth: 440 }}>
        <Shield size={16} className="muted" />
        <input placeholder="porta (ex.: 8080)" value={port} onChange={(e) => setPort(e.target.value.replace(/[^0-9]/g, ""))} style={{ flex: 1 }} />
        <button className="btn btn-sm" onClick={() => add("allow")}><Plus size={13} /> Permitir</button>
        <button className="btn-ghost btn-sm" onClick={() => add("deny")}>Bloquear</button>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table>
          <thead><tr><th>#</th><th>Regra</th><th></th></tr></thead>
          <tbody>
            {(data?.rules || []).map((r) => {
              const ssh = /\b22\b/.test(r.text);
              return (
                <tr key={r.num}>
                  <td className="muted">{r.num}</td>
                  <td className="mono" style={{ fontSize: 12.5 }}>{r.text}</td>
                  <td style={{ textAlign: "right" }}>
                    {!ssh && <button className="btn-ghost btn-sm" style={{ padding: 5 }} onClick={() => del(r.num)}><Trash2 size={13} /></button>}
                    {ssh && <span className="muted" style={{ fontSize: 11.5 }}>protegida</span>}
                  </td>
                </tr>
              );
            })}
            {!data?.rules?.length && <tr><td colSpan={3} className="muted" style={{ padding: 18 }}>Sem regras.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EnvEditor() {
  const [app, setApp] = useState("backend");
  const [apps, setApps] = useState<string[]>([]);
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [reveal, setReveal] = useState<Record<number, boolean>>({});
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async (a: string) => {
    const r = await fetch(`/api/env?app=${a}`, { cache: "no-store" });
    const j = await r.json();
    if (j.apps) setApps(j.apps);
    setVars(j.vars || []); setReveal({}); setDirty(false);
  }, []);
  useEffect(() => { load(app); }, [app, load]);

  function edit(i: number, value: string) { setVars((v) => v.map((x, k) => (k === i ? { ...x, value } : x))); setDirty(true); }

  async function save() {
    const r = await fetch("/api/env", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ app, vars }) });
    if ((await r.json()).ok) { toast.success("Guardado"); setDirty(false); } else toast.error("Falha ao guardar");
  }
  async function restart() {
    toast.loading("A reiniciar…", { id: "r" });
    await fetch("/api/env", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ app }) });
    toast.success("Reiniciado", { id: "r" });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        {apps.map((a) => (
          <button key={a} className={a === app ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setApp(a)}>{a}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn-ghost btn-sm" onClick={restart}><RotateCw size={13} /> Reiniciar app</button>
          <button className="btn btn-sm" onClick={save} disabled={!dirty}><Save size={13} /> Guardar</button>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table>
          <thead><tr><th style={{ width: 260 }}>Chave</th><th>Valor</th><th></th></tr></thead>
          <tbody>
            {vars.map((v, i) => (
              <tr key={i}>
                <td className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{v.key}</td>
                <td>
                  <input
                    type={v.secret && !reveal[i] ? "password" : "text"}
                    value={v.value}
                    onChange={(e) => edit(i, e.target.value)}
                    className="mono"
                    style={{ fontSize: 12.5, padding: "6px 10px" }}
                  />
                </td>
                <td style={{ textAlign: "right", width: 40 }}>
                  {v.secret && (
                    <button className="btn-ghost btn-sm" style={{ padding: 5 }} onClick={() => setReveal((r) => ({ ...r, [i]: !r[i] }))}>
                      {reveal[i] ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!vars.length && <tr><td colSpan={3} className="muted" style={{ padding: 18 }}>Sem variáveis.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>Depois de guardar, clica "Reiniciar app" para aplicar as alterações.</p>
    </div>
  );
}
