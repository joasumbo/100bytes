export type Role = 'superadmin' | 'admin' | 'operador' | 'financeiro';

/** Roles que um determinado actor pode gerir/criar */
export function manageableRoles(actorRole: string): Role[] {
  switch (actorRole) {
    case 'superadmin':
      return ['admin', 'operador', 'financeiro'];
    case 'admin':
      return ['operador', 'financeiro'];
    default:
      return [];
  }
}

/** Verifica se actor pode eliminar target */
export function canDeleteUser(actorRole: string, targetRole: string): boolean {
  if (targetRole === 'superadmin') return false;
  return manageableRoles(actorRole).includes(targetRole as Role);
}
