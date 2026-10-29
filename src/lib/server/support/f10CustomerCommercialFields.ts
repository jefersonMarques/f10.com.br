import type { CustomerImportRecord } from "./customerImportFile";

export function toF10CommercialRecord(record: CustomerImportRecord) {
  return {
    sourceId: record.sourceId,
    // 'Titular' representa a unidade/alcunha quando existe; 'Aluno' identifica a pessoa.
    apelido: (record.holderName || record.unitName).trim(),
    unitName: record.unitName,
    holderName: record.holderName,
    sourceGroupId: record.sourceGroupId,
    groupName: record.groupName,
    commercialStatus: record.commercialStatus,
    plan: record.plan,
    city: record.city,
    accountExecutive: record.accountExecutive,
  };
}
