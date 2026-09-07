import { readFile } from "fs/promises";
import { promisify } from "util";
import { exec as execCb } from "child_process";

const exec = promisify(execCb);

export type Snapshot = {
  cpu: number; // %
  memUsed: number; // MB
  memTotal: number; // MB
  memPct: number;
  diskUsed: number; // GB
  diskTotal: number; // GB
  diskPct: number;
  netRx: number; // KB/s
  netTx: number; // KB/s
  load1: number;
  load5: number;
  load15: number;
  cores: number;
  uptime: number; // s
  ts: number;
};

async function cpuTimes() {
  const stat = await readFile("/proc/stat", "utf8");
  const line = stat.split("\n")[0]; // "cpu  ..."
  const p = line.trim().split(/\s+/).slice(1).map(Number);
  const idle = p[3] + (p[4] || 0);
  const total = p.reduce((a, b) => a + b, 0);
  return { idle, total };
}

async function netTotals() {
  const dev = await readFile("/proc/net/dev", "utf8");
  let rx = 0,
    tx = 0;
  for (const line of dev.split("\n")) {
    if (!line.includes(":")) continue;
    const [iface, rest] = line.split(":");
    if (iface.trim() === "lo") continue;
    const cols = rest.trim().split(/\s+/).map(Number);
    if (cols.length >= 9) {
      rx += cols[0];
      tx += cols[8];
    }
  }
  return { rx, tx };
}

// Estado partilhado entre chamadas p/ calcular deltas (por processo)
let prev: { cpu: { idle: number; total: number }; net: { rx: number; tx: number }; t: number } | null =
  null;

export async function snapshot(): Promise<Snapshot> {
  const [cpu1, net1, meminfo, loadavg, uptimeRaw, dfOut] = await Promise.all([
    cpuTimes(),
    netTotals(),
    readFile("/proc/meminfo", "utf8"),
    readFile("/proc/loadavg", "utf8"),
    readFile("/proc/uptime", "utf8"),
    exec("df -B1 --output=used,size / | tail -1").then((r) => r.stdout).catch(() => "0 0"),
  ]);

  // CPU % via delta contra a amostra anterior
  let cpuPct = 0;
  let netRx = 0;
  let netTx = 0;
  const now = Date.now();
  if (prev) {
    const dIdle = cpu1.idle - prev.cpu.idle;
    const dTotal = cpu1.total - prev.cpu.total;
    cpuPct = dTotal > 0 ? Math.max(0, Math.min(100, (1 - dIdle / dTotal) * 100)) : 0;
    const dt = (now - prev.t) / 1000 || 1;
    netRx = Math.max(0, (net1.rx - prev.net.rx) / 1024 / dt);
    netTx = Math.max(0, (net1.tx - prev.net.tx) / 1024 / dt);
  }
  prev = { cpu: cpu1, net: net1, t: now };

  // Memória
  const mem: Record<string, number> = {};
  for (const l of meminfo.split("\n")) {
    const m = l.match(/^(\w+):\s+(\d+)/);
    if (m) mem[m[1]] = Number(m[2]); // kB
  }
  const memTotal = (mem.MemTotal || 0) / 1024;
  const memAvail = (mem.MemAvailable || 0) / 1024;
  const memUsed = memTotal - memAvail;

  // Disco
  const [dUsed, dSize] = dfOut.trim().split(/\s+/).map(Number);
  const diskUsed = (dUsed || 0) / 1e9;
  const diskTotal = (dSize || 1) / 1e9;

  const la = loadavg.trim().split(/\s+/).map(Number);
  const uptime = Number(uptimeRaw.trim().split(/\s+/)[0]);
  const cores = (await cpuCount()) || 1;

  return {
    cpu: round(cpuPct),
    memUsed: round(memUsed),
    memTotal: round(memTotal),
    memPct: round((memUsed / memTotal) * 100),
    diskUsed: round(diskUsed),
    diskTotal: round(diskTotal),
    diskPct: round((diskUsed / diskTotal) * 100),
    netRx: round(netRx),
    netTx: round(netTx),
    load1: la[0] || 0,
    load5: la[1] || 0,
    load15: la[2] || 0,
    cores,
    uptime,
    ts: now,
  };
}

let _cores = 0;
async function cpuCount() {
  if (_cores) return _cores;
  const stat = await readFile("/proc/stat", "utf8");
  _cores = (stat.match(/^cpu\d+/gm) || []).length;
  return _cores;
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

export async function run(cmd: string): Promise<string> {
  try {
    const { stdout } = await exec(cmd, { maxBuffer: 1024 * 1024 * 8 });
    return stdout;
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return err.stdout || err.stderr || err.message || "";
  }
}
