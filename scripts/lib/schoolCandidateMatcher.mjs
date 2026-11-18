export function normalizedSchoolName(value) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function schoolNameCandidates(commercialUnits, schoolName) {
  const normalized = normalizedSchoolName(schoolName);
  if (!normalized) return [];
  return commercialUnits.filter((unit) => {
    return [unit.name, unit.apelido, unit.organizationName]
      .some((name) => normalizedSchoolName(name) === normalized);
  });
}

export function classifySchoolCandidates(candidates) {
  const organizations = new Set(candidates.map((item) => item.organizationId));
  if (organizations.size === 0) return "unmatched";
  if (organizations.size === 1) return "unique_name_candidate";
  return "ambiguous_name_candidate";
}
