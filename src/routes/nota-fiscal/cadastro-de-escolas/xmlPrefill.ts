import { writable } from "svelte/store";
import type { FormData, SpecialRegime, IssRequirement, YesNo } from "./formStore";

export type XmlDocumentKind = "nfe" | "nfse" | "unknown";

export type XmlPrefillResult = {
  kind: XmlDocumentKind;
  kindLabel: string;
  data: Partial<FormData>;
  detectedFields: string[];
  ibgeCode: string;
};

export const invoiceXmlFileStore = writable<File | null>(null);

type XmlRoot = Document | Element;

const fieldLabels: Partial<Record<keyof FormData, string>> = {
  noteKind: "tipo de nota",
  cnpj: "CNPJ",
  municipalRegistration: "inscrição municipal",
  stateRegistration: "inscrição estadual",
  legalName: "razão social",
  fantasyName: "nome fantasia",
  cnaeMain: "CNAE",
  cep: "CEP",
  street: "logradouro",
  number: "número",
  complement: "complemento",
  neighborhood: "bairro",
  city: "cidade",
  state: "UF",
  phone: "telefone",
  email: "e-mail",
  isSimples: "Simples Nacional",
  serviceListItem: "item da lista de serviço",
  taxationCode: "código de tributação",
  specialRegime: "regime especial",
  issRequirement: "exigibilidade do ISS",
  issWithholding: "retenção do ISS",
  aliquotIss: "alíquota ISS",
  serviceDescription: "descrição do serviço",
  commerceLastInvoiceNumber: "número da última NF-e",
  commerceSeries: "série da NF-e",
  commerceOperationNature: "natureza da operação",
  commerceNcmCode: "NCM",
  commerceCfopCode: "CFOP",
  commerceIcmsAliquot: "alíquota ICMS",
  commerceCstIcms: "CST ICMS",
  commerceCsosn: "CSOSN",
  commerceIpiAliquot: "alíquota IPI",
  commerceCstIpi: "CST IPI",
  commercePisAliquot: "alíquota PIS",
  commerceCstPis: "CST PIS",
  commerceCofinsAliquot: "alíquota COFINS",
  commerceCstCofins: "CST COFINS",
  commerceItemDescription: "descrição do item",
  commerceGtin: "GTIN",
  commerceFiscalBenefitCode: "benefício fiscal",
};

const ibgeUfMap: Record<string, string> = {
  "11": "RO",
  "12": "AC",
  "13": "AM",
  "14": "RR",
  "15": "PA",
  "16": "AP",
  "17": "TO",
  "21": "MA",
  "22": "PI",
  "23": "CE",
  "24": "RN",
  "25": "PB",
  "26": "PE",
  "27": "AL",
  "28": "SE",
  "29": "BA",
  "31": "MG",
  "32": "ES",
  "33": "RJ",
  "35": "SP",
  "41": "PR",
  "42": "SC",
  "43": "RS",
  "50": "MS",
  "51": "MT",
  "52": "GO",
  "53": "DF",
};

function descendants(root: XmlRoot): Element[] {
  return Array.from(root.getElementsByTagName("*"));
}

function firstElement(root: XmlRoot | null, names: string[]): Element | null {
  if (!root) return null;
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  return descendants(root).find((element) => wanted.has(element.localName.toLowerCase())) ?? null;
}

function firstText(root: XmlRoot | null, names: string[]): string {
  const element = firstElement(root, names);
  return element?.textContent?.trim() ?? "";
}

function hasElement(root: XmlRoot, names: string[]): boolean {
  const rootName = root instanceof Document ? root.documentElement?.localName?.toLowerCase() : root.localName.toLowerCase();
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  return Boolean(rootName && wanted.has(rootName)) || Boolean(firstElement(root, names));
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function digits(value: string): string {
  return value.replace(/\D+/g, "");
}

function normalizedRate(value: string): string {
  if (!value) return "";
  const normalized = value.replace(",", ".").replace("%", "").trim();
  const number = Number(normalized);
  if (!Number.isFinite(number)) return normalized;
  const percent = number > 0 && number <= 1 ? number * 100 : number;
  return String(Number(percent.toFixed(4)));
}

function yesNo(value: string): YesNo | "" {
  const normalized = value.trim().toLowerCase();
  if (["1", "s", "sim", "true", "yes"].includes(normalized)) return "yes";
  if (["2", "n", "não", "nao", "false", "no"].includes(normalized)) return "no";
  return "";
}

function specialRegime(value: string): SpecialRegime | "" {
  const mapping: Record<string, SpecialRegime> = {
    "1": "municipal_micro",
    "2": "estimate",
    "3": "professionals_society",
    "4": "cooperative",
    "5": "mei",
    "6": "me_epp",
  };
  return mapping[value.trim()] ?? "";
}

function issRequirement(value: string): IssRequirement | "" {
  const mapping: Record<string, IssRequirement> = {
    "1": "payable",
    "2": "non_incidence",
    "3": "exempt",
    "4": "export",
    "5": "immunity",
    "6": "suspended_judicial",
    "7": "suspended_admin",
  };
  return mapping[value.trim()] ?? "";
}

function stateFromIbge(code: string): string {
  return ibgeUfMap[digits(code).slice(0, 2)] ?? "";
}

function setString(data: Partial<FormData>, key: keyof FormData, value: string) {
  const cleaned = clean(value);
  if (!cleaned) return;
  (data as Record<string, unknown>)[key] = cleaned;
}

function parseNfe(doc: Document): { data: Partial<FormData>; ibgeCode: string } {
  const data: Partial<FormData> = { noteKind: "commerce" };
  const emit = firstElement(doc, ["emit"]);
  const address = firstElement(emit, ["enderEmit"]);
  const ide = firstElement(doc, ["ide"]);
  const det = firstElement(doc, ["det"]);
  const prod = firstElement(det, ["prod"]);
  const imposto = firstElement(det, ["imposto"]);
  const icms = firstElement(imposto, ["ICMS"]);
  const ipi = firstElement(imposto, ["IPI"]);
  const pis = firstElement(imposto, ["PIS"]);
  const cofins = firstElement(imposto, ["COFINS"]);

  setString(data, "cnpj", firstText(emit, ["CNPJ"]));
  setString(data, "legalName", firstText(emit, ["xNome"]));
  setString(data, "fantasyName", firstText(emit, ["xFant"]));
  setString(data, "stateRegistration", firstText(emit, ["IE"]));
  setString(data, "municipalRegistration", firstText(emit, ["IM"]));
  setString(data, "cnaeMain", digits(firstText(emit, ["CNAE"])));
  setString(data, "street", firstText(address, ["xLgr"]));
  setString(data, "number", firstText(address, ["nro"]));
  setString(data, "complement", firstText(address, ["xCpl"]));
  setString(data, "neighborhood", firstText(address, ["xBairro"]));
  setString(data, "city", firstText(address, ["xMun"]));
  setString(data, "state", firstText(address, ["UF"]));
  setString(data, "cep", digits(firstText(address, ["CEP"])));
  setString(data, "phone", digits(firstText(address, ["fone"])));

  const stateRegistration = firstText(emit, ["IE"]);
  if (stateRegistration) data.hasStateRegistration = true;

  const crt = firstText(emit, ["CRT"]);
  if (["1", "2", "4"].includes(crt)) data.isSimples = "yes";
  if (crt === "3") data.isSimples = "no";

  const invoiceNumber = firstText(ide, ["nNF"]);
  setString(data, "commerceLastInvoiceNumber", invoiceNumber);
  setString(data, "commerceNumbering", invoiceNumber);
  setString(data, "commerceSeries", firstText(ide, ["serie"]));
  setString(data, "commerceOperationNature", firstText(ide, ["natOp"]));
  setString(data, "commerceNcmCode", firstText(prod, ["NCM"]));
  setString(data, "commerceCfopCode", firstText(prod, ["CFOP"]));
  setString(data, "commerceItemDescription", firstText(prod, ["xProd"]));

  const gtin = firstText(prod, ["cEAN"]);
  if (gtin && gtin.toUpperCase() !== "SEM GTIN") setString(data, "commerceGtin", gtin);
  setString(data, "commerceFiscalBenefitCode", firstText(prod, ["cBenef"]));

  const csosn = firstText(icms, ["CSOSN"]);
  const cstIcms = firstText(icms, ["CST"]);
  if (csosn) {
    setString(data, "commerceCsosn", csosn);
    data.commerceCstIcms = "SN";
  } else {
    setString(data, "commerceCstIcms", cstIcms);
  }
  setString(data, "commerceIcmsAliquot", normalizedRate(firstText(icms, ["pICMS"])));

  setString(data, "commerceCstIpi", firstText(ipi, ["CST"]));
  setString(data, "commerceIpiAliquot", normalizedRate(firstText(ipi, ["pIPI"])));
  setString(data, "commerceCstPis", firstText(pis, ["CST"]));
  setString(data, "commercePisAliquot", normalizedRate(firstText(pis, ["pPIS"])));
  setString(data, "commerceCstCofins", firstText(cofins, ["CST"]));
  setString(data, "commerceCofinsAliquot", normalizedRate(firstText(cofins, ["pCOFINS"])));

  return { data, ibgeCode: digits(firstText(address, ["cMun"])) };
}

function parseNfse(doc: Document): { data: Partial<FormData>; ibgeCode: string } {
  const data: Partial<FormData> = { noteKind: "service" };
  const emit = firstElement(doc, ["emit"]);
  const prestador = firstElement(doc, ["PrestadorServico", "Prestador", "prest"]);
  const company = emit ?? prestador;
  const address = firstElement(company, ["enderNac", "Endereco"]);
  const contact = firstElement(company, ["Contato"]);
  const service = firstElement(doc, ["Servico", "serv"]);

  setString(data, "cnpj", firstText(company, ["CNPJ", "Cnpj"]) || firstText(prestador, ["CNPJ", "Cnpj"]));
  setString(data, "legalName", firstText(company, ["xNome", "RazaoSocial"]));
  setString(data, "fantasyName", firstText(company, ["xFant", "NomeFantasia"]));
  setString(data, "municipalRegistration", firstText(company, ["IM", "InscricaoMunicipal"]) || firstText(prestador, ["IM", "InscricaoMunicipal"]));
  setString(data, "stateRegistration", firstText(company, ["IE", "InscricaoEstadual"]));

  const stateRegistration = firstText(company, ["IE", "InscricaoEstadual"]);
  if (stateRegistration) data.hasStateRegistration = true;

  setString(data, "street", firstText(address, ["xLgr", "Endereco", "Logradouro"]));
  setString(data, "number", firstText(address, ["nro", "Numero"]));
  setString(data, "complement", firstText(address, ["xCpl", "Complemento"]));
  setString(data, "neighborhood", firstText(address, ["xBairro", "Bairro"]));
  setString(data, "cep", digits(firstText(address, ["CEP", "Cep"])));
  setString(data, "phone", digits(firstText(contact ?? company, ["fone", "Telefone"])));
  setString(data, "email", firstText(contact ?? company, ["email", "Email"]));

  const ibgeCode = digits(
    firstText(address, ["cMun", "CodigoMunicipio"]) ||
      firstText(doc, ["cLocEmi", "CodigoMunicipio"]),
  );
  const city =
    firstText(address, ["xMun", "Cidade"]) ||
    firstText(doc, ["xLocEmi", "xLocPrestacao"]);
  const state = firstText(address, ["UF", "Uf"]) || stateFromIbge(ibgeCode);
  setString(data, "city", city);
  setString(data, "state", state);

  setString(
    data,
    "serviceListItem",
    firstText(service, ["ItemListaServico", "CodigoItemListaServico", "cTribNac"]),
  );
  setString(
    data,
    "taxationCode",
    firstText(service, ["CodigoTributacaoMunicipio", "CodigoTributacao", "cTribMun"]),
  );
  setString(data, "serviceDescription", firstText(service, ["Discriminacao", "xDescServ"]));

  const regime = specialRegime(firstText(doc, ["RegimeEspecialTributacao"]));
  if (regime) data.specialRegime = regime;

  const requirement = issRequirement(firstText(doc, ["ExigibilidadeISS"]));
  if (requirement) data.issRequirement = requirement;

  const simple = yesNo(firstText(doc, ["OptanteSimplesNacional"]));
  if (simple) data.isSimples = simple;

  const retainedIss = yesNo(firstText(doc, ["IssRetido"]));
  if (retainedIss) data.issWithholding = retainedIss;

  setString(data, "aliquotIss", normalizedRate(firstText(doc, ["pAliq", "Aliquota"])));

  return { data, ibgeCode };
}

function parseGeneric(doc: Document): { data: Partial<FormData>; ibgeCode: string } {
  const data: Partial<FormData> = {};
  const company = firstElement(doc, ["emit", "PrestadorServico", "Prestador", "prest"]);
  const address = firstElement(company, ["enderEmit", "enderNac", "Endereco"]);

  setString(data, "cnpj", firstText(company, ["CNPJ", "Cnpj"]));
  setString(data, "legalName", firstText(company, ["xNome", "RazaoSocial"]));
  setString(data, "fantasyName", firstText(company, ["xFant", "NomeFantasia"]));
  setString(data, "municipalRegistration", firstText(company, ["IM", "InscricaoMunicipal"]));
  setString(data, "street", firstText(address, ["xLgr", "Endereco", "Logradouro"]));
  setString(data, "number", firstText(address, ["nro", "Numero"]));
  setString(data, "neighborhood", firstText(address, ["xBairro", "Bairro"]));
  setString(data, "city", firstText(address, ["xMun", "Cidade"]));
  setString(data, "state", firstText(address, ["UF", "Uf"]));
  setString(data, "cep", digits(firstText(address, ["CEP", "Cep"])));

  const ibgeCode = digits(firstText(address, ["cMun", "CodigoMunicipio"]));
  if (!data.state && ibgeCode) data.state = stateFromIbge(ibgeCode);

  return { data, ibgeCode };
}

export function parseInvoiceXml(xmlText: string): XmlPrefillResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  if (hasElement(doc, ["parsererror"])) {
    throw new Error("O arquivo selecionado não contém um XML válido.");
  }

  let kind: XmlDocumentKind = "unknown";
  let parsed: { data: Partial<FormData>; ibgeCode: string };

  if (hasElement(doc, ["infNFe", "nfeProc"])) {
    kind = "nfe";
    parsed = parseNfe(doc);
  } else if (hasElement(doc, ["infNFSe", "CompNfse", "InfNfse", "DPS", "NFSe"])) {
    kind = "nfse";
    parsed = parseNfse(doc);
  } else {
    parsed = parseGeneric(doc);
  }

  const detectedFields = Object.keys(parsed.data)
    .filter((key) => {
      const value = (parsed.data as Record<string, unknown>)[key];
      return value !== undefined && value !== null && value !== "";
    })
    .map((key) => fieldLabels[key as keyof FormData] ?? key);

  return {
    kind,
    kindLabel: kind === "nfe" ? "NF-e" : kind === "nfse" ? "NFS-e" : "XML fiscal",
    data: parsed.data,
    detectedFields,
    ibgeCode: parsed.ibgeCode,
  };
}
