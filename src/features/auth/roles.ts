export const teamRoles = ["administrator", "designer", "operator", "billing", "finance"] as const;
export type TeamRole = (typeof teamRoles)[number];

export const roleLabels: Record<TeamRole, string> = {
  administrator: "Administración de usuarios",
  designer: "Diseño",
  operator: "Producción",
  billing: "Facturación",
  finance: "Finanzas",
};

export const roleDescriptions: Record<TeamRole, string> = {
  administrator: "Cuenta única que administra el acceso del equipo.",
  designer: "Clientes, presupuestos y notas de pedido.",
  operator: "Producción y cierre de los trabajos.",
  billing: "Registro de la facturación de los pedidos.",
  finance: "Cobros, pagos, compras y consulta financiera.",
};

export function isTeamRole(value: unknown): value is TeamRole {
  return typeof value === "string" && teamRoles.some((role) => role === value);
}
