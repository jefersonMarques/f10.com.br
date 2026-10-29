// Contratos são listados pela API em ordem crescente de contrato_id.
// O cursor lastId usa o último contrato_id recebido, NÃO numero_contrato.
const MAX_CONTRACTS = 50_000;
const MAX_PAGES = 1_000;

function readContractId(value: unknown): number {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("F10_CONTRACT_RECORD_INVALID");
  }
  const record = value as Record<string, unknown>;
  const raw = record.contrato_id;
  if (typeof raw !== "number" && typeof raw !== "string") {
    throw new Error("F10_CONTRACT_ID_INVALID");
  }
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("F10_CONTRACT_ID_INVALID");
  return id;
}

/**
 * Lê até a página vazia, evitando truncar a consulta se a API devolver
 * menos de 100 itens em uma página. Falhas interrompem toda a importação.
 * Sobreposição idêntica entre páginas é tolerada, mas nunca um cursor parado.
 */
export async function collectF10ContractPages(
  fetchPage: (lastId: number | null) => Promise<unknown>,
): Promise<unknown[]> {
  const byId = new Map<number, unknown>();
  let cursor: number | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const payload = await fetchPage(cursor);
    if (!Array.isArray(payload)) throw new Error("F10_CONTRACTS_INVALID");
    if (payload.length === 0) {
      if (byId.size === 0) throw new Error("F10_CONTRACTS_EMPTY");
      return [...byId.values()];
    }

    let lastId = cursor;
    for (const record of payload) {
      const id = readContractId(record);
      if (lastId !== null && id < lastId && id > (cursor ?? 0)) {
        throw new Error("F10_API_PAGINATION_ORDER");
      }
      const previous = byId.get(id);
      if (previous !== undefined) {
        if (JSON.stringify(previous) !== JSON.stringify(record)) {
          throw new Error("F10_CONTRACT_ID_CONFLICT");
        }
      } else {
        byId.set(id, record);
        if (byId.size > MAX_CONTRACTS) throw new Error("F10_CONTRACTS_TOO_LARGE");
      }
      lastId = id;
    }

    if (lastId === null || (cursor !== null && lastId <= cursor)) {
      throw new Error("F10_API_PAGINATION_STALLED");
    }
    cursor = lastId;
  }
  throw new Error("F10_API_PAGINATION_LIMIT");
}
