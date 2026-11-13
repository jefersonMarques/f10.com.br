import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseF10ContractHolder } from "../src/lib/server/integrations/f10/f10CustomerSyncParsing.ts";

function read(path) {
  return readFileSync(path, "utf8");
}

test("a contract holder is parsed from titular_id, not from the linked person", () => {
  const holder = parseF10ContractHolder({
    pessoa_id: 3181,
    nome: "TEX CURSOS E TREINAMENTOS LTDA",
    email: "robson@cursostex.com.br",
    cpf_cnpj: "97.531.845/0001-45",
    cidade: "Duque de Caxias",
    estado: "RJ",
    cep: "25070-350",
    logradouro: "Rua Conde de Porto Alegre",
    bairro: "Jardim Vinte e Cinco de Agosto",
    end_complemento: "485",
    celular: "(21) 99439-1273",
  }, 3181);

  assert.equal(holder.personId, 3181);
  assert.equal(holder.name, "TEX CURSOS E TREINAMENTOS LTDA");
  assert.equal(holder.document, "97.531.845/0001-45");
  assert.equal(holder.city, "Duque de Caxias");
  assert.equal(holder.whatsapp, "(21) 99439-1273");
  assert.throws(() => parseF10ContractHolder({
    pessoa_id: 3182, nome: "Robson Melo Gomes",
  }, 3181), /F10_PERSON_ID_MISMATCH/);
});

test("holder cache keeps independent IDs and does not mutate portal contacts", () => {
  const worker = read("src/lib/server/support/f10CustomerHolderRepository.ts");
  const migration = read("migrations/0113_f10_contract_holders.sql");
  const source = read("src/lib/server/support/customerImportWorker.ts");

  assert.match(migration, /PRIMARY KEY \(unit_id, holder_id\)/);
  assert.match(migration, /status IN \('pending', 'synced', 'failed'\)/);
  assert.match(worker, /c\.titular_id/);
  assert.match(worker, /getF10ContractHolder/);
  assert.match(worker, /ON CONFLICT \(unit_id, holder_id\) DO UPDATE/);
  assert.doesNotMatch(worker, /INSERT INTO customer_contacts/);
  assert.doesNotMatch(worker, /ticket_customer_contexts/);
  assert.match(source, /processF10HolderSyncOnce/);
});

test("customer list and ticket picker search the holder name instead of guessing from email", () => {
  const directory = read("src/lib/server/support/f10CustomerContractDirectoryRepository.ts");
  const picker = read("src/lib/server/support/f10TicketContractRepository.ts");
  const detail = read("src/lib/server/support/f10CustomerContractDetailsRepository.ts");

  assert.match(directory, /api_holder\.holder_id = c\.titular_id/);
  assert.match(directory, /nullif\(api_holder\.name, ''\)/);
  assert.match(directory, /coalesce\(holder_name, ''\) ILIKE/);
  assert.match(picker, /api_holder\.name, ''\) ILIKE/);
  assert.match(detail, /api_holder\.document AS "holderDocument"/);
  assert.match(detail, /api_holder\.name, ''\)/);
  assert.match(detail, /length\(regexp_replace\(coalesce\(api_holder\.document/);
});

test("refreshing holder details requires global customer-management permission", () => {
  const api = read("src/routes/api/app/customers/contracts/[contractId]/holder/+server.ts");
  const modal = read("src/lib/components/operations/F10ContractDetailsModal.svelte");

  assert.match(api, /requireAppPermission/);
  assert.match(api, /hasPermission\(permissions, "customers.manage", "all"\)/);
  assert.match(api, /refreshF10ContractHolder/);
  assert.match(modal, /Titular \/ responsável pelo contrato/);
  assert.match(modal, /Atualizar titular/);
  assert.match(modal, /holderDocument/);
});
