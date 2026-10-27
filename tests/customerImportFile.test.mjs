import assert from "node:assert/strict";
import { test } from "node:test";
import { deflateRawSync } from "node:zlib";
import { parseCustomerImportFile } from "../src/lib/server/support/customerImportFile.ts";

const HEADERS = [
  "ID", "Aluno", "Titular", "Status", "Grupo_ID", "Grupo",
  "Plano Contratado", "Aluno - Cidade", "Financeiro - Link Acesso Pagamento",
  "Telefone Aluno", "Celular Aluno", "Comercial Aluno",
  "Executivo(a) de Contas", "Motivo Cancelamento", "Data Cancelamento",
  "E-mail Aluno", "Telefone Titular", "Celular Titular",
  "Comercial Titular", "E-mail Titular",
];

function values() {
  return [
    "001", "Escola Exemplo", "Ana", "Só Leitura", "005", "Rede Central",
    "F10 Plano PREMIUM", "Curitiba", "", "", "", "", "", "",
    "", "GERAL@EXAMPLE.COM", "", "", "", "ANA@EXAMPLE.COM",
  ];
}

function zip(entries) {
  const local = [];
  const central = [];
  let offset = 0;

  for (const [name, text] of entries) {
    const nameBytes = Buffer.from(name);
    const bytes = Buffer.from(text);
    const compressed = deflateRawSync(bytes);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(bytes.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    local.push(localHeader, nameBytes, compressed);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt32LE(compressed.length, 20);
    entry.writeUInt32LE(bytes.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBytes);
    offset += localHeader.length + nameBytes.length + compressed.length;
  }

  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralBuffer, end]);
}

test("CSV preserves source IDs, commercial status and normalized email", () => {
  const text = [HEADERS.join(";"), values().join(";")].join("\n");
  const parsed = parseCustomerImportFile("Clientes F10.csv", Buffer.from(text));
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].record.sourceId, "001");
  assert.equal(parsed.rows[0].record.sourceGroupId, "005");
  assert.equal(parsed.rows[0].record.commercialStatus, "Só Leitura");
  assert.equal(parsed.rows[0].record.holderEmail, "ana@example.com");
});

test("XLSX reads the first sheet and shared strings without external dependencies", () => {
  const strings = [...HEADERS, ...values()];
  const shared = '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    strings.map((value) => "<si><t>" + value + "</t></si>").join("") + "</sst>";
  const cells = (offset) => HEADERS.map((_, index) => {
    const column = String.fromCharCode(65 + index);
    return '<c r="' + column + (offset ? 2 : 1) + '" t="s"><v>' +
      (index + (offset ? HEADERS.length : 0)) + "</v></c>";
  }).join("");
  const sheet = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    "<sheetData><row r=\"1\">" + cells(0) + "</row><row r=\"2\">" +
    cells(1) + "</row></sheetData></worksheet>";
  const bytes = zip([
    ["xl/sharedStrings.xml", shared],
    ["xl/worksheets/sheet1.xml", sheet],
  ]);

  const parsed = parseCustomerImportFile("Clientes F10.xlsx", bytes);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].record.unitName, "Escola Exemplo");
  assert.equal(parsed.rows[0].record.sourceId, "001");
});

test("Malformed inputs are rejected", () => {
  assert.throws(() => parseCustomerImportFile("invalid.txt", Buffer.from("data")));
  assert.throws(() => parseCustomerImportFile("invalid.csv", Buffer.from("a,b,c\n1,2,3")));
  assert.throws(() => parseCustomerImportFile("empty.xlsx", Buffer.from("not a zip")));
  assert.throws(() => parseCustomerImportFile("huge.csv", Buffer.alloc(5 * 1024 * 1024 + 1)));
});
