// src/routes/nota-fiscal/cadastro-de-escolas/steps/types.ts

export type YesNo = "yes" | "no";

export type TaxationPlace =
  | "in_city"
  | "out_city"
  | "exempt"
  | "immune"
  | "suspended_judicial"
  | "suspended_admin";

export type SpecialRegime =
  | "none"
  | "municipal_micro"
  | "estimate"
  | "professionals_society"
  | "cooperative"
  | "mei"
  | "me_epp";

export type IssRequirement =
  | "none"
  | "payable"
  | "non_incidence"
  | "exempt"
  | "export"
  | "immunity"
  | "suspended_judicial"
  | "suspended_admin";

export type FormData = {
  // Empresa / escola
  cnpj: string;
  municipalRegistration: string;
  stateRegistration: string;
  legalName: string;
  fantasyName: string;

  // Endereço
  cep: string;
  address: string;

  // CNAE
  cnaeMain: string;

  // Perguntas
  isSimples: YesNo;
  supportsCulturalProjects: YesNo;
  usesNationalNfseEnvironment: YesNo;

  // Prefeitura
  cityHallLogin: string;
  cityHallPassword: string;
  securityPhrase: string;

  // Nota
  serviceListItem: string;
  taxationCode: string;
  operationNature: string;

  // Regras fiscais
  taxationPlace: TaxationPlace;
  specialRegime: SpecialRegime;
  issRequirement: IssRequirement;

  issWithholding: YesNo;
  roundIss: YesNo;

  // Alíquotas
  aliquotPis: string;
  aliquotCofins: string;
  aliquotInss: string;
  aliquotIr: string;
  aliquotCsll: string;
  aliquotIss: string;
  ibptPercent: string;

  // Texto nota
  serviceDescription: string;

  // Certificado
  certificatePassword: string;
};

export type FormErrors = Partial<Record<keyof FormData, string>> & {
  certificateFile?: string;
};
