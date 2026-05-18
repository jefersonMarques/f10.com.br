// src/routes/nota-fiscal/cadastro-de-escolas/formStore.ts
import { writable } from "svelte/store";

export type YesNo = "yes" | "no";
export type NoteKind = "service" | "commerce" | "service_and_commerce";

export const noteKindOptions: Array<{ value: NoteKind; label: string }> = [
  { value: "service", label: "Serviço (NFS-e)" },
  { value: "commerce", label: "Produto (NF-e)" },
  { value: "service_and_commerce", label: "Serviço e produto" },
];


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

export const yesNoOptions: Array<{ value: YesNo; label: string }> = [
  { value: "yes", label: "Sim" },
  { value: "no", label: "Não" },
];

export const taxationPlaceOptions: Array<{ value: TaxationPlace; label: string }> = [
  { value: "in_city", label: "Tributação no Município" },
  { value: "out_city", label: "Tributação fora do Município" },
  { value: "exempt", label: "Isenção" },
  { value: "immune", label: "Imune" },
  { value: "suspended_judicial", label: "Exigibilidade Suspensa por Decisão Judicial" },
  { value: "suspended_admin", label: "Exigibilidade Suspensa por Processo Administrativo" },
];

export const specialRegimeOptions: Array<{ value: SpecialRegime; label: string }> = [
  { value: "none", label: "Nenhum" },
  { value: "municipal_micro", label: "Microempresa Municipal" },
  { value: "estimate", label: "Estimativa" },
  { value: "professionals_society", label: "Sociedade de Profissionais" },
  { value: "cooperative", label: "Cooperativa" },
  { value: "mei", label: "Microempresário Individual (MEI)" },
  { value: "me_epp", label: "Microempresário e Empresa de Pequeno Porte (ME EPP)" },
];

export const issRequirementOptions: Array<{ value: IssRequirement; label: string }> = [
  { value: "none", label: "Nenhum" },
  { value: "payable", label: "Exigível" },
  { value: "non_incidence", label: "Não Incidência" },
  { value: "exempt", label: "Isenção" },
  { value: "export", label: "Exportação" },
  { value: "immunity", label: "Imunidade" },
  { value: "suspended_judicial", label: "Suspenso por decisão judicial" },
  { value: "suspended_admin", label: "Suspenso por processo administrativo" },
];

export const cstIcmsOptions: Array<{ value: string; label: string }> = [
  { value: "00", label: "00 - Tributada Integralmente" },
  { value: "10", label: "10 - Triutada e com cobrança do ICMS por substituição tributária" },
  { value: "20", label: "20 - Tributada com redução na base de cálculo" },
  { value: "30", label: "30 - Isenta/Não Tributada e com cobrança do ICMS por substituição tributária" },
  { value: "40", label: "40 - Isenta" },
  { value: "41", label: "41 - Não Tributada" },
  { value: "50", label: "50 - Com Suspensão" },
  { value: "51", label: "51 - Com Diferimento" },
  { value: "60", label: "60 - cobrado anteriormente por substituição tributária" },
  { value: "70", label: "70 - Com redução na base de cálculo e cobrança do ICMS por substituição tributária" },
  { value: "80", label: "80 - Responsabilidade do reconhecimento do ICMS atribuído ao tomador ou 3° por ST" },
  { value: "81", label: "81 - Devido à outra UF" },
  { value: "90", label: "90 - Outros" },
  { value: "91", label: "91 - Devido a UF de origem da prestação, quando diferente da UF do emitente" },
  { value: "SN", label: "SN - Simples Nacional" },
];

export const csosnOptions: Array<{ value: string; label: string }> = [
  { value: "101", label: "101 - Tributada pelo Simples Nacional com permissão de crédito" },
  { value: "102", label: "102 - Tributação pelo Simples Nacional sem permissão de crédito" },
  { value: "103", label: "103 - Isenção do ICMS no Simples Nacional para faixa de receita bruta" },
  { value: "201", label: "201 - Tributada pelo Simples Nacional com permissão de crédito e com cobrança do ICMS por substituição tributária" },
  { value: "202", label: "202 - Tributada pelo Simples Nacional sem permissão de crédito e com cobrança do ICMS por substituição tributária" },
  { value: "203", label: "203 - Isenção do ICMS no Simples Nacional para faixa de receita bruta e com cobrança do ICMS por substituição tributária" },
  { value: "300", label: "300 - Imune" },
  { value: "500", label: "500 - ICMS cobrado anteriormente por substituição tributária (substituído) ou por antecipação" },
  { value: "900", label: "900 - Outros" },
];

export const cstIpiOptions: Array<{ value: string; label: string }> = [
  { value: "00", label: "00 - Entrada com recuperação de crédito" },
  { value: "01", label: "01 - Entrada tributada om alíquota zero" },
  { value: "02", label: "02 -Entrada Isenta" },
  { value: "03", label: "03 - Entrada não-tributada" },
  { value: "04", label: "04 - Entrada imune" },
  { value: "05", label: "05 - Entrada com suspensão" },
  { value: "49", label: "49 - Outras entradas" },
  { value: "50", label: "50 - Saída tributada" },
  { value: "53", label: "53 - Saída não-tributada" },
  { value: "54", label: "54 - Saída imune" },
  { value: "55", label: "55 - Saída com suspensão" },
  { value: "99", label: "99 - Outras saídas" },
];

export const cstPisOptions: Array<{ value: string; label: string }> = [
  { value: "01", label: "01 - Operação Tributável (base de cálculo = valor da operação alíquota normal (cumulativo/não cumulativo))" },
  { value: "02", label: "02 - Operação Tributável (base de cálculo = valor da operação (alíquota diferenciada))" },
  { value: "03", label: "03 - Operação Tributável (base de cálculo = quantidade vendida x aliquota por unidade de produto))" },
  { value: "04", label: "04 - Operação Tributável (tributação monofásica (alíquota zero))" },
  { value: "05", label: "05 - Operação Tributável (Substituição Tributária)" },
  { value: "06", label: "06 - Operação Tributável (alíquota zero)" },
  { value: "07", label: "07 - Operação Isenta da Contribuição" },
  { value: "08", label: "08 - Operação Sem Incidência da Contribuição" },
  { value: "09", label: "09 - Operação com Suspensão da Contribuição" },
  { value: "49", label: "49 - Outras Operaçoes de Saída" },
  { value: "50", label: "50 - Operação com Direito a Crédito - Vinculada Exclusivamente a Receita Tributada no Mercado Interno" },
  { value: "51", label: "51 - Operação com Direito a Crédito - Vinculada Exclusivamente a Receita Não Tributada no Mercado Interno" },
  { value: "52", label: "52 - Operação com Direito a Crédito - Vinculada Exclusivamente a Receita de Exportação" },
  { value: "53", label: "53 - Operação com Direito a Crédito - Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno" },
  { value: "54", label: "54 - Operação com Direito a Crédito - Vinculada a Receitas Tributadas no Mercadi Interno e de Exportação" },
  { value: "55", label: "55 - Operação com Direito a Crédito - Vinculada a Receitas Não Tributadas no Mercado Interno e de Exportação" },
  { value: "56", label: "56 - Operação com Direito a Crédito - Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno, e de Exportação" },
  { value: "60", label: "60 - Crédito Presumido - Operação de Aquisição Vinculada Exclusivamente a Receita Tributada no Mercado Interno" },
  { value: "61", label: "61 - Crédito Presumido Operação de Aquisição Vinculada Exclusivamente a Receita Não-Tributada no Mercado Interno" },
  { value: "62", label: "62 - Crédito Presumido - Operação de Aquisição Vinculada Exclusivamente a Receita de Exportação" },
  { value: "63", label: "63 - Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno" },
  { value: "64", label: "64 - Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas no Mercado Interno e de Exportação" },
  { value: "65", label: "65 - Crédito Presumido - Operação de Aquisição Vinculada a Receitas Não-Tributadas no Mercado Interno e de Exportação" },
  { value: "66", label: "66 - Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno, e de Exportação" },
  { value: "67", label: "67 - Crédito Presumido - Outras Operações" },
  { value: "70", label: "70 - Operação de Aquisição sem Direito a Crédito" },
  { value: "71", label: "71 - Operação de Aquisição com Isenção" },
  { value: "72", label: "72 - Operação de Aquisição com Suspensão" },
  { value: "73", label: "73 - Operação de Aquisição a Aliquota Zero" },
  { value: "74", label: "74 - Operação de Aquisição; sem Indidência da Contribuição" },
  { value: "75", label: "75 - Operação de Aquisição por Substituição Tributária" },
  { value: "98", label: "98 - Outras Operações de Entrada" },
  { value: "99", label: "99 - Outras Operações" },
];

export const cstPisCofinsOptions: Array<{ value: string; label: string }> = [
  { value: "01", label: "01 - Operação Tributável (base de cálculo =  valor da operação alíquota normal (cumulativo/não cumulativo))" },
  { value: "02", label: "02 - Operação Tributável (base de cálculo = valor da operação (alíquota diferenciada))" },
  { value: "03", label: "03 - Operação Tributável (base de cáculo = quantidade vendida x aliquota por unidade de produto)" },
  { value: "04", label: "04 - Operação Tributável (tributação monofásica (alíquota zero))" },
  { value: "05", label: "05 - Operação Tributável (Substituiçăo Tiributária)" },
  { value: "06", label: "06 - Operação Tributável (alíquota zero)" },
  { value: "07", label: "07 - Operação Isenta da Contribuição" },
  { value: "08", label: "08 - Operação Sem Incidênda da Contribuição" },
  { value: "09", label: "09 - Operação com Suspensão da Contribuição" },
  { value: "49", label: "49 - Outras Operações de Saída" },
  { value: "50", label: "50 - Operação com Direito a Crédito - Vinculada Exclusivamente a Receita Tributada no Mercado Interno" },
  { value: "51", label: "51 - Operação com Direito a Crédito - Vinculada Exclusivamente a Receita Não-Tributada no Mercado Iterno" },
  { value: "52", label: "52 - Operação com Direito a Crédito - Vinculada Exclusivamete a Receita de Exportação" },
  { value: "53", label: "53 - Operação com Direito a Crédito - Vinculada Receitas Tributadas e Não - Tributadas no Mercado Interno" },
  { value: "54", label: "54 - Operação com Direto Crédito - Vinculada a ReceitasTributadas no Mercado Interno e de Exportação" },
  { value: "55", label: "55 - Operação com Direito a Crédito - Vincilada a Receitas Não-Tributadas no Mercado interno e de Exportação" },
  { value: "56", label: "56 - Operação com Direito a Crédito - Vinculada a Receitas Tributadas e Não - Tributadas no Mercado Interno, e de Exportação" },
  { value: "60", label: "60 - Crédito Presumido - Operação de Aquisição Vinculada Exclusivamente a Receita Tributada no Mercado Interno" },
  { value: "61", label: "61 - Crédito Presumido - Operação de Aquisição Vinculada Exclusivamente a Receita Não - Tributada no Mercado Interno" },
  { value: "62", label: "62 - Crédito Presumido - Operação de Aquisição Vinculada Exclusivamente a Receita de Exportação" },
  { value: "63", label: "63 - Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno" },
  { value: "64", label: "64 - Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas no Mercado Interno e de Exportação" },
  { value: "65", label: "65 - Crédito Presumido - Operação de Aquisição Vinculada a Receitas Não - Tributadas no Mercado Interno e de Exportação" },
  { value: "66", label: "66 - Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas e Não - Tributadas no Mercado Interno, e de Exportação" },
  { value: "67", label: "67 - Crédito Presumido - Outras Operações" },
  { value: "70", label: "70 - Operação de Aquisição sem Direito a Crédito" },
  { value: "71", label: "71 - Operação de Aquisição com Isenção" },
  { value: "72", label: "72 - Operação de Aquisição com Suspensão" },
  { value: "73", label: "73 - Operação de Aquisiçãoa Alíquota Zero" },
  { value: "74", label: "74 - Operação de Aquisição; sem Incidência da Contribuição" },
  { value: "75", label: "75 - Operação de Aquisição por SubstituiçãoTributária" },
  { value: "98", label: "98 - Outras Operações de Entrada" },
  { value: "99", label: "99 - Outras Operações" },
];

export type FormData = {
  noteKind: NoteKind;
  cnpj: string;
  municipalRegistration: string;
  stateRegistration: string;
  legalName: string;
  fantasyName: string;
  cnaeMain: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  phone: string;
  email: string;
  website: string;
  hasStateRegistration: boolean;
  city: string;
  state: string;
  isSimples: YesNo;
  supportsCulturalProjects: YesNo;
  usesNationalNfseEnvironment: YesNo;
  cityHallLogin: string;
  cityHallPassword: string;
  securityPhrase: string;
  serviceListItem: string;
  taxationCode: string;
  serviceRpsBatchNumber: string;
  taxationPlace: TaxationPlace;
  specialRegime: SpecialRegime;
  issRequirement: IssRequirement;
  issWithholding: YesNo;
  commerceLastInvoiceNumber: string;
  commerceReturnCfop: string;
  roundIss: YesNo;
  aliquotPis: string;
  aliquotCofins: string;
  aliquotInss: string;
  aliquotIr: string;
  aliquotCsll: string;
  aliquotIss: string;
  ibptPercent: string;
  serviceDescription: string;
  commerceBatchNumber: string;
  commerceNumbering: string;
  commerceSeries: string;
  commerceNcmCode: string;
  commerceCfopCode: string;
  commerceOperationNature: string;
  commerceIcmsAliquot: string;
  commerceCstIcms: string;
  commerceCsosn: string;
  commerceIpiAliquot: string;
  commerceCstIpi: string;
  commercePisAliquot: string;
  commerceCstPis: string;
  commerceCofinsAliquot: string;
  commerceCstCofins: string;
  commerceItemDescription: string;
  commerceGtin: string;
  commerceFiscalBenefitCode: string;
  certificatePassword: string;
  acceptedTerms: boolean;
};

export type FormErrors = Partial<Record<keyof FormData, string>> & {
  serviceRpsBatchNumber?: string;
  certificateFile?: string;
  commerceLastInvoiceNumber?: string;
  commerceReturnCfop?: string;
};

export const formDataStore = writable<FormData>({
  noteKind: "service",
  cnpj: "",
  municipalRegistration: "",
  stateRegistration: "",
  legalName: "",
  fantasyName: "",
  cnaeMain: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  website: "",
  hasStateRegistration: false,
  isSimples: "no",
  supportsCulturalProjects: "no",
  usesNationalNfseEnvironment: "no",
  cityHallLogin: "",
  cityHallPassword: "",
  securityPhrase: "",
  serviceListItem: "",
  taxationCode: "",
  serviceRpsBatchNumber: "",
  taxationPlace: "in_city",
  specialRegime: "none",
  issRequirement: "payable",
  issWithholding: "no",
  commerceLastInvoiceNumber: "",
  commerceReturnCfop: "",
  roundIss: "no",
  aliquotPis: "",
  aliquotCofins: "",
  aliquotInss: "",
  aliquotIr: "",
  aliquotCsll: "",
  aliquotIss: "",
  ibptPercent: "",
  serviceDescription: "",
  commerceBatchNumber: "",
  commerceNumbering: "",
  commerceSeries: "",
  commerceNcmCode: "",
  commerceCfopCode: "",
  commerceOperationNature: "",
  commerceIcmsAliquot: "",
  commerceCstIcms: "",
  commerceCsosn: "",
  commerceIpiAliquot: "",
  commerceCstIpi: "",
  commercePisAliquot: "",
  commerceCstPis: "",
  commerceCofinsAliquot: "",
  commerceCstCofins: "",
  commerceItemDescription: "",
  commerceGtin: "",
  commerceFiscalBenefitCode: "",
  certificatePassword: "",
  acceptedTerms: false,
});