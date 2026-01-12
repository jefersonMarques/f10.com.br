// Tipos compartilhados do cadastro CELCOIN (escolas)
// Comentários em PT-BR; nomes em inglês conforme padrão do projeto.

export type SchoolRegistrationFormData = {
  // Etapa 1 — Unidade
  cnpj: string;
  unitLegalName: string;
  unitFantasyName: string;
  cnaeMain: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  unitPhone: string;

  // Etapa 2 — Responsável
  managerName: string;
  managerCpf: string;
  managerRg: string;
  managerWhatsapp: string;
  managerEmail: string;

  // Etapa 2 — Divulgação (opcional)
  marketingSite: string;
  marketingInstagram: string;
  marketingFacebook: string;
};

export type SchoolRegistrationFormErrors = Partial<
  Record<keyof SchoolRegistrationFormData, string>
>;

export type Step3DocType = "rg_cnh" | "cnpj" | "contrato";
export type DocType = Step3DocType | "selfie";

export type UploadedFile = {
  id: string;
  file: File;
  createdAt: number;
  docType: DocType;
};

export type DocFilesMap = {
  rg_cnh: UploadedFile[]; // múltiplos
  cnpj: UploadedFile[]; // múltiplos
  contrato: UploadedFile[]; // múltiplos
  selfie: UploadedFile | null; // único
};

export type DocTypeErrorsMap = Record<DocType, string>;
export type DocTypeAttentionMap = Record<DocType, boolean>;

export type PendingSelfie = { file: File; previewUrl: string } | null;

export type ContractState = {
  title: string;
  // pdfUrl agora é opcional (pode ser null/undefined)
  pdfUrl?: string | null;

  accepted: boolean;
  acceptedAt: string | null;
  error: string;

  // ouro para auditoria/legal
  contractVersion: string;
  termsVersion: string;
  snapshotText?: string; // texto exibido (ou HTML)
  snapshotHash?: string; // hash do snapshot
};

