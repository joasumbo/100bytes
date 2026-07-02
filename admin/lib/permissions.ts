// ─── Roles ────────────────────────────────────────────────────────────────────
export type Role = "superadmin" | "admin" | "operador" | "financeiro";

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Superadmin",
  admin: "Administrador",
  operador: "Operador",
  financeiro: "Financeiro",
};

export const ROLE_COLORS: Record<Role, { bg: string; text: string }> = {
  superadmin: { bg: "#F3E8FF", text: "#7C3AED" },
  admin:      { bg: "#FFF3E0", text: "#F57C00" },
  operador:   { bg: "#E0F2FE", text: "#0284C7" },
  financeiro: { bg: "#D1FAE5", text: "#059669" },
};

// ─── Modules ──────────────────────────────────────────────────────────────────
export type Module =
  | "dashboard"
  | "produtos"
  | "pedidos"
  | "clientes"
  | "pagamentos"
  | "categorias"
  | "marcas"
  | "marketing"
  | "conteudo"
  | "entregas"
  | "devolucoes"
  | "relatorios"
  | "notificacoes"
  | "utilizadores"
  | "configuracoes";

// ─── Permission map ───────────────────────────────────────────────────────────
// Each module: can have "view" | "create" | "edit" | "delete"
export type Action = "view" | "create" | "edit" | "delete";

type PermissionMap = Record<Module, Action[]>;

const SUPERADMIN_PERMS: PermissionMap = {
  dashboard:     ["view"],
  produtos:      ["view", "create", "edit", "delete"],
  pedidos:       ["view", "create", "edit", "delete"],
  clientes:      ["view", "create", "edit", "delete"],
  pagamentos:    ["view", "create", "edit", "delete"],
  categorias:    ["view", "create", "edit", "delete"],
  marcas:        ["view", "create", "edit", "delete"],
  marketing:     ["view", "create", "edit", "delete"],
  conteudo:      ["view", "create", "edit", "delete"],
  entregas:      ["view", "create", "edit", "delete"],
  devolucoes:    ["view", "create", "edit", "delete"],
  relatorios:    ["view"],
  notificacoes:  ["view", "create", "edit", "delete"],
  utilizadores:  ["view", "create", "edit", "delete"],
  configuracoes: ["view", "edit"],
};

const ADMIN_PERMS: PermissionMap = {
  ...SUPERADMIN_PERMS,
  // admin cannot manage other admins (utilizadores: can view/create/edit/delete non-superadmin)
  // enforced at API level
};

const OPERADOR_PERMS: PermissionMap = {
  dashboard:     ["view"],
  produtos:      ["view"],
  pedidos:       ["view", "edit"],   // update order status only
  clientes:      ["view", "create"],
  pagamentos:    [],
  categorias:    ["view"],
  marcas:        ["view"],
  marketing:     [],
  conteudo:      [],
  entregas:      ["view", "edit"],
  devolucoes:    ["view", "edit"],
  relatorios:    [],
  notificacoes:  ["view"],
  utilizadores:  [],
  configuracoes: [],
};

const FINANCEIRO_PERMS: PermissionMap = {
  dashboard:     ["view"],
  produtos:      ["view", "create", "edit", "delete"],
  pedidos:       ["view"],
  clientes:      ["view"],
  pagamentos:    ["view", "create", "edit", "delete"],
  categorias:    ["view"],
  marcas:        ["view"],
  marketing:     [],
  conteudo:      [],
  entregas:      [],
  devolucoes:    ["view"],
  relatorios:    ["view"],
  notificacoes:  ["view"],
  utilizadores:  [],
  configuracoes: [],
};

const PERMISSIONS: Record<Role, PermissionMap> = {
  superadmin: SUPERADMIN_PERMS,
  admin:      ADMIN_PERMS,
  operador:   OPERADOR_PERMS,
  financeiro: FINANCEIRO_PERMS,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function can(role: string, module: Module, action: Action): boolean {
  const perms = PERMISSIONS[role as Role];
  if (!perms) return false;
  return perms[module]?.includes(action) ?? false;
}

export function canAccess(role: string, module: Module): boolean {
  return can(role, module, "view");
}

// Roles that the current user can manage (create/edit/delete)
export function manageableRoles(role: string): Role[] {
  if (role === "superadmin") return ["admin", "operador", "financeiro"];
  if (role === "admin")      return ["operador", "financeiro"];
  return [];
}

// Can current user delete target user?
export function canDeleteUser(actorRole: string, targetRole: string): boolean {
  if (targetRole === "superadmin") return false; // never
  if (actorRole === "superadmin") return true;
  if (actorRole === "admin" && targetRole !== "superadmin" && targetRole !== "admin") return true;
  return false;
}

// Summary of permissions per role for display
export const ROLE_PERMISSIONS_SUMMARY: Record<Role, string[]> = {
  superadmin: ["Acesso total", "Gestão de utilizadores", "Configurações", "Relatórios"],
  admin:      ["Acesso total", "Gestão de utilizadores (não-superadmin)", "Relatórios"],
  operador:   ["Encomendas (ver/actualizar status)", "Clientes (ver/criar)", "Entregas e devoluções"],
  financeiro: ["Produtos (criar/editar/eliminar/importar)", "Pagamentos e finanças", "Relatórios"],
};
