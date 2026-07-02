"use client";
import { fetchAPI } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import UserAvatar from "@/components/admin/UserAvatar";
import {
  ROLE_LABELS,
  ROLE_COLORS,
  ROLE_PERMISSIONS_SUMMARY,
  manageableRoles,
  canDeleteUser,
  type Role,
} from "@/lib/permissions";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  photoKey?: string | null;
  createdAt: string;
}

// ─── User Modal (Create / Edit) ───────────────────────────────────────────────
function UserModal({
  user,
  actorRole,
  onClose,
  onSave,
}: {
  user: AdminUser | null;
  actorRole: string;
  onClose: () => void;
  onSave: (u: AdminUser) => void;
}) {
  const isEdit = !!user;
  const allowedRoles = manageableRoles(actorRole);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? (allowedRoles[0] as Role));
  const [active, setActive] = useState(user?.active ?? true);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      let res: Response;
      let data: { user?: AdminUser; error?: string };
      if (isEdit) {
        const body: Record<string, unknown> = { actorRole, name, role, active };
        if (password) body.password = password;
        res = await fetchAPI(`/users/${user!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        data = await res.json();
      } else {
        res = await fetchAPI("/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actorRole, name, email, password, role, active }),
        });
        data = await res.json();
      }
      if (!res.ok) { toast.error(data.error ?? "Erro desconhecido."); setLoading(false); return; }
      toast.success(isEdit ? "Utilizador actualizado com sucesso." : "Utilizador criado com sucesso.");
      onSave(data.user!);
    } catch { toast.error("Erro de ligação. Tente novamente."); } finally { setLoading(false); }
  }

  const inputCls = "w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">{isEdit ? "Editar utilizador" : "Novo utilizador"}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{isEdit ? user!.email : "Preencha os dados abaixo"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Nome completo</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} placeholder="Nome do utilizador" />
          </div>
          {!isEdit && (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} placeholder="email@exemplo.com" />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Função</label>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputCls}>
              {allowedRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r as Role]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              {isEdit ? "Nova senha (deixe em branco para não alterar)" : "Senha"}
            </label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required={!isEdit} minLength={8} className={`${inputCls} pr-11`} placeholder={isEdit ? "••••••••" : "Mínimo 8 caracteres"} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw
                  ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                }
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Conta activa</p>
              <p className="text-xs text-gray-400">Utilizador pode fazer login</p>
            </div>
            <button type="button" onClick={() => setActive(!active)} className={`relative w-11 h-6 rounded-full transition-colors ${active ? "bg-orange-500" : "bg-gray-300"}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-2xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition font-medium">Cancelar</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-2xl text-sm text-white font-semibold transition disabled:opacity-50" style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)", boxShadow: "0 4px 14px rgba(245,124,0,0.3)" }}>
              {loading ? "A guardar..." : isEdit ? "Guardar alterações" : "Criar utilizador"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete modal ─────────────────────────────────────────────────────────────
function DeleteModal({ user, onConfirm, onClose, loading }: { user: AdminUser; onConfirm: () => void; onClose: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#EF4444" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </div>
        <h3 className="font-bold text-gray-900 text-lg mb-1">Eliminar utilizador</h3>
        <p className="text-sm text-gray-500 mb-6">Tem a certeza que quer eliminar <strong>{user.name}</strong>? Esta acção é irreversível.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-2xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition font-medium">Cancelar</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-2xl text-sm text-white bg-red-500 hover:bg-red-600 transition font-semibold disabled:opacity-50">{loading ? "A eliminar..." : "Eliminar"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UtilizadoresPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<Role | "all">("all");
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetchAPI("/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  if (!me) return null;

  const canManage = me.role === "superadmin" || me.role === "admin";
  const filtered = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  async function handleDelete() {
    if (!selected) return;
    setDeleteLoading(true);
    const res = await fetchAPI(`/users/${selected.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorRole: me!.role }),
    });
    setDeleteLoading(false);
    if (res.ok) {
      toast.success("Utilizador eliminado com sucesso.");
      setUsers((prev) => prev.filter((u) => u.id !== selected.id));
      setModal(null); setSelected(null);
    } else {
      toast.error("Não foi possível eliminar o utilizador.");
    }
  }

  const allRoles: Role[] = ["superadmin", "admin", "operador", "financeiro"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900">Utilizadores</h1>
          <p className="text-sm text-gray-400 mt-0.5">{users.length} {users.length === 1 ? "utilizador" : "utilizadores"} registados</p>
        </div>
        {canManage && manageableRoles(me!.role).length > 0 && (
          <button
            onClick={() => { setSelected(null); setModal("create"); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm text-white font-semibold transition self-start sm:self-auto"
            style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)", boxShadow: "0 4px 14px rgba(245,124,0,0.3)" }}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Novo utilizador
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar por nome ou email..." className="w-full border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
        </div>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value as Role | "all")} className="border border-gray-200 rounded-2xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
          <option value="all">Todas as funções</option>
          {allRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin" width="28" height="28" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#F57C00" strokeWidth="4" />
              <path className="opacity-75" fill="#F57C00" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2" className="mb-3"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <p className="text-sm">Nenhum utilizador encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Utilizador</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-4">Função</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-4 hidden md:table-cell">Criado em</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-4">Estado</th>
                  {canManage && <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Acções</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u) => {
                  const rColor = ROLE_COLORS[u.role] ?? { bg: "#f3f4f6", text: "#6b7280" };
                  const isMe = u.id === me!.id;
                  const isSuperadmin = u.role === "superadmin";
                  const canEdit = canManage && !isSuperadmin && manageableRoles(me!.role).includes(u.role) && !isMe;
                  const canDel = canDeleteUser(me!.role, u.role) && !isMe;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={u.name} photoKey={u.photoKey} size={40} textSizeClass="text-sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{u.name}{isMe && <span className="ml-2 text-xs text-orange-500 font-normal">(você)</span>}</p>
                            <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" style={{ background: rColor.bg, color: rColor.text }}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-400 hidden md:table-cell">{new Date(u.createdAt).toLocaleDateString("pt-AO")}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ background: u.active ? "#D1FAE5" : "#F3F4F6", color: u.active ? "#059669" : "#6B7280" }}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.active ? "bg-green-500" : "bg-gray-400"}`} />
                          {u.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {canEdit && (
                              <button onClick={() => { setSelected(u); setModal("edit"); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
                                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                Editar
                              </button>
                            )}
                            {canDel && (
                              <button onClick={() => { setSelected(u); setModal("delete"); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition">
                                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Eliminar
                              </button>
                            )}
                            {!canEdit && !canDel && <span className="text-xs text-gray-300">—</span>}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Permissions matrix */}
      <div>
        <h2 className="text-base font-bold text-gray-800 mb-4">Matriz de permissões</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(["superadmin", "admin", "operador", "financeiro"] as Role[]).map((r) => {
            const color = ROLE_COLORS[r];
            const perms = ROLE_PERMISSIONS_SUMMARY[r];
            const count = users.filter((u) => u.role === r).length;
            return (
              <div key={r} className="bg-white rounded-3xl p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold" style={{ background: color.bg, color: color.text }}>{ROLE_LABELS[r]}</span>
                  <span className="text-xs text-gray-400">{count} {count === 1 ? "user" : "users"}</span>
                </div>
                <ul className="space-y-2">
                  {perms.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-xs text-gray-600">
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth="3" className="flex-shrink-0 mt-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {(modal === "create" || modal === "edit") && (
        <UserModal
          user={modal === "edit" ? selected : null}
          actorRole={me!.role}
          onClose={() => { setModal(null); setSelected(null); }}
          onSave={(saved) => {
            if (modal === "create") setUsers((prev) => [saved, ...prev]);
            else setUsers((prev) => prev.map((u) => (u.id === saved.id ? saved : u)));
            setModal(null); setSelected(null);
          }}
        />
      )}
      {modal === "delete" && selected && (
        <DeleteModal user={selected!} loading={deleteLoading} onClose={() => { setModal(null); setSelected(null); }} onConfirm={handleDelete} />
      )}
    </div>
  );
}