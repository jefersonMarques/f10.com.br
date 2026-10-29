export type LegacyGroup = {
  groupId: string;
  groupName: string;
  grantedUnitCount: number;
};

export function parseLegacyF10Groups(value: unknown): LegacyGroup[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: LegacyGroup[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const raw = item as Record<string, unknown>;
    const id = String(raw.grupo_id ?? "").trim();
    if (!/^[1-9]\d{0,12}$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    result.push({
      groupId: id,
      groupName: typeof raw.grupo === "string" ? raw.grupo.trim().slice(0, 120) : "Grupo " + id,
      grantedUnitCount: Array.isArray(raw.unidades) ? raw.unidades.length : 0,
    });
  }
  return result;
}

export const F10_CUSTOMER_ROLES = [
  { value: "responsavel", label: "Responsável" },
  { value: "gestor", label: "Gestor" },
  { value: "financeiro", label: "Financeiro" },
  { value: "comercial", label: "Comercial" },
  { value: "operacional", label: "Operacional" },
  { value: "contato", label: "Contato" },
] as const;

export function isF10CustomerRole(value: unknown): value is typeof F10_CUSTOMER_ROLES[number]["value"] {
  return typeof value === "string" && F10_CUSTOMER_ROLES.some((role) => role.value === value);
}
