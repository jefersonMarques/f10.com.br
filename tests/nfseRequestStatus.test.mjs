import assert from "node:assert/strict";
import test from "node:test";
import { normalizeServiceRequestFields } from "../src/lib/server/serviceRequests/serviceRequestDefinitions.ts";

const base = {
  cnpj: "12345678000199",
  legalName: "Empresa de teste",
  city: "Curitiba",
  state: "PR",
  noteKind: "service",
};

test("NFS-e accepts both municipal request statuses", () => {
  const { data } = normalizeServiceRequestFields("nfse", {
    ...base,
    rpsBatchRequestStatus: "requested",
    webserviceEmissionRequestStatus: "not_needed",
  });
  assert.equal(data.rpsBatchRequestStatus, "requested");
  assert.equal(data.webserviceEmissionRequestStatus, "not_needed");
});

test("NFS-e rejects unknown municipal request statuses", () => {
  assert.throws(() => normalizeServiceRequestFields("nfse", {
    ...base,
    rpsBatchRequestStatus: "approved",
  }), /SERVICE_REQUEST_STATUS_INVALID:rpsBatchRequestStatus/);
});

test("existing NFS-e requests without the new fields remain supported", () => {
  assert.equal(normalizeServiceRequestFields("nfse", base).data.noteKind, "service");
});
