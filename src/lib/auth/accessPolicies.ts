export function canViewHelpInsights(roles: readonly string[]): boolean {
  return roles.includes("SUPER_ADMIN") || roles.includes("ADMIN");
}
