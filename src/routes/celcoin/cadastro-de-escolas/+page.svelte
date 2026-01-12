<script lang="ts">
  import { browser } from "$app/environment";
  import { onDestroy, tick } from "svelte";
  import {
    Upload,
    FileText,
    Camera,
    CheckCircle2,
    XCircle,
    Trash2,
    X,
  } from "lucide-svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import { getF10TermsText } from "$lib/legal/f10Terms";

  // ==============================
  // Tipos
  // ==============================
  type FormData = {
    // Etapa 1 â€” Unidade
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

    // Etapa 2 â€” ResponsÃ¡vel
    managerName: string;
    managerCpf: string;
    managerRg: string;
    managerWhatsapp: string;
    managerEmail: string;

    // Etapa 2 â€” DivulgaÃ§Ã£o (opcional)
    marketingSite: string;
    marketingInstagram: string;
    marketingFacebook: string;
  };

  type FormErrors = Partial<Record<keyof FormData, string>>;

  type Step3DocType = "rg_cnh" | "cnpj" | "contrato";
  type DocType = Step3DocType | "selfie";

  type UploadedFile = {
    id: string;
    file: File;
    createdAt: number;
    docType: DocType;
  };

  type DocFilesMap = {
    rg_cnh: UploadedFile[]; // mÃºltiplos
    cnpj: UploadedFile[]; // mÃºltiplos
    contrato: UploadedFile[]; // mÃºltiplos
    selfie: UploadedFile | null; // Ãºnico
  };

  type ContractState = {
    title: string;
    accepted: boolean;
    acceptedAt: string | null;
    error: string;
    contractVersion: string;
  };

  let contract: ContractState = {
    title: "Contrato de AdesÃ£o",
    accepted: false,
    acceptedAt: null,
    error: "",
    contractVersion: "v2025_10_06",
  };

  function setContractAccepted(checked: boolean) {
    contract = {
      ...contract,
      accepted: checked,
      acceptedAt: checked ? new Date().toISOString() : null,
      error: "",
    };
  }

  function validateContractStep5(): boolean {
    if (!contract.accepted) {
      contract = {
        ...contract,
        error: "VocÃª precisa aceitar o contrato para continuar.",
      };
      return false;
    }
    contract = { ...contract, error: "" };
    return true;
  }

  function isStep3DocType(docType: DocType): docType is Step3DocType {
    return docType !== "selfie";
  }

  // ==============================
  // Estado
  // ==============================
  type WizardStep = 1 | 2 | 3 | 4 | 5;
  type CepStatus = "unknown" | "valid" | "invalid";
  type WizardCtx = {
    currentStep: WizardStep;
    formData: FormData;
    errors: FormErrors;
    isSubmitting: boolean;
    isCnpjLoading: boolean;
    isCepLoading: boolean;
    cepStatus: CepStatus;
    cnaeMainDescription: string;

    maxFilesPerDocType: number;
    docFiles: DocFilesMap;
    docErrorsByType: Record<DocType, string>;
    docAttentionByType: Record<DocType, boolean>;
    docMessage: string;
    step3DocTypes: Step3DocType[];

    successVideoUrl: string;
    supportLink: string;
    whatsappLink: string;

    setField: <K extends keyof FormData>(
      key: K,
      value: string,
      options?: { isAuto?: boolean; source?: "cnpj" | "cep" },
    ) => void;

    formatCnpj: (value: string) => string;
    formatCpf: (value: string) => string;
    formatCep: (value: string) => string;
    formatBrPhone: (value: string) => string;
    formatCnae: (value: string) => string;
    formatRg: (value: string) => string;
    formatAddressNumber: (value: string) => string;
    onlyDigits: (value: string) => string;

    scheduleCnpjLookup: () => void;
    scheduleCepLookup: () => void;
    lookupCnpjSilently: (cnpjDigits: string) => Promise<void>;
    lookupCepSilently: (cepDigits: string) => Promise<void>;

    openFilePicker: (docType: DocType) => void;
    removeDocFileById: (docType: Step3DocType, id: string) => void;
    clearDocFiles: (docType: Step3DocType) => void;
    removeDocFile: (docType: DocType) => void;
    formatBytes: (bytes: number) => string;
    docTitle: (docType: DocType) => string;
    docHint: (docType: DocType) => string;
    docCardBorderClass: (docType: DocType) => string;
    setDocMessage: (msg: string) => void;

    openCameraOverlay: () => Promise<void>;
    submitMessage: string;
  };

  let currentStep: WizardStep = 1;
  let wizard: WizardCtx;

  let formData: FormData = {
    cnpj: "",
    unitLegalName: "",
    unitFantasyName: "",
    cnaeMain: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    unitPhone: "",

    managerName: "",
    managerCpf: "",
    managerRg: "",
    managerWhatsapp: "",
    managerEmail: "",

    marketingSite: "",
    marketingInstagram: "",
    marketingFacebook: "",
  };

  let errors: FormErrors = {};
  let isSubmitting = false;

  // Loading silencioso (sem texto)
  let isCnpjLoading = false;
  let isCepLoading = false;

  // Controle para nÃ£o repetir chamadas
  let lastCnpjLookup = "";
  let lastCepLookup = "";

  let cnpjDebounceId: ReturnType<typeof setTimeout> | null = null;
  let cepDebounceId: ReturnType<typeof setTimeout> | null = null;

  // Flags de autofill (para nÃ£o sobrescrever o que o usuÃ¡rio editou)
  const cnpjAutoFilledKeys = new Set<keyof FormData>();
  const cepAutoFilledKeys = new Set<keyof FormData>();

  // CEP status (validado via ViaCEP)
  let cepStatus: CepStatus = "unknown";

  // Dica/descriÃ§Ã£o do CNAE (sem misturar com o valor numÃ©rico)
  let cnaeMainDescription = "";

  // ==============================
  // Documentos
  // - Passo 3: mÃºltiplos arquivos por tipo
  // - Passo 4: selfie Ãºnica
  // ==============================
  const maxFileSizeBytes = 2 * 1024 * 1024; // 2MB por arquivo
  const maxFilesPerDocType = 6; // proteÃ§Ã£o contra exageros (ajuste se quiser)

  const step3DocTypes: Step3DocType[] = ["rg_cnh", "cnpj", "contrato"];

  // Tipos aceitos para docs (exceto selfie)
  const acceptedDocMime = new Set([
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
  ]);

  // Tipos aceitos para selfie
  const acceptedSelfieMime = new Set(["image/jpeg", "image/jpg", "image/png"]);

  let docFiles: DocFilesMap = {
    rg_cnh: [],
    cnpj: [],
    contrato: [],
    selfie: null,
  };

  // Erros por documento (borda vermelha no card que precisa atenÃ§Ã£o)
  let docErrorsByType: Record<DocType, string> = {
    rg_cnh: "",
    cnpj: "",
    contrato: "",
    selfie: "",
  };

  // â€œatenÃ§Ã£oâ€ por documento (ex.: faltando obrigatÃ³rio / upload invÃ¡lido)
  let docAttentionByType: Record<DocType, boolean> = {
    rg_cnh: false,
    cnpj: false,
    contrato: false,
    selfie: false,
  };

  let docMessage = ""; // mensagem discreta geral
  let activeDocType: DocType | null = null;
  let fileInputRef: HTMLInputElement | null = null;

  function createId(): string {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function setDocMessage(msg: string) {
    docMessage = msg;
    if (!msg) return;
    setTimeout(() => {
      docMessage = "";
    }, 2500);
  }

  function setDocTypeError(docType: DocType, message: string) {
    docErrorsByType = { ...docErrorsByType, [docType]: message };
    docAttentionByType = { ...docAttentionByType, [docType]: !!message };
  }

  function clearDocTypeError(docType: DocType) {
    docErrorsByType = { ...docErrorsByType, [docType]: "" };
    docAttentionByType = { ...docAttentionByType, [docType]: false };
  }

  function markDocAttention(docType: DocType, message: string) {
    docErrorsByType = { ...docErrorsByType, [docType]: message };
    docAttentionByType = { ...docAttentionByType, [docType]: true };
  }

  function clearAllDocAttentions() {
    docErrorsByType = { rg_cnh: "", cnpj: "", contrato: "", selfie: "" };
    docAttentionByType = {
      rg_cnh: false,
      cnpj: false,
      contrato: false,
      selfie: false,
    };
  }

  function openFilePicker(docType: DocType) {
    if (docType === "selfie") {
      const msg = "Selfie deve ser capturada pela camera.";
      setDocTypeError("selfie", msg);
      setDocMessage(msg);
      return;
    }
    activeDocType = docType;
    if (!fileInputRef) return;
    fileInputRef.value = ""; // permite re-upload do mesmo arquivo
    fileInputRef.accept = getAcceptByDocType(docType);
    fileInputRef.multiple = docType !== "selfie";
    fileInputRef.click();
  }

  function getAcceptByDocType(docType: DocType): string {
    if (docType === "selfie") return "image/png,image/jpeg";
    return "application/pdf,image/png,image/jpeg";
  }

  function validateFileForDoc(
    docType: DocType,
    file: File,
  ): { ok: boolean; reason?: string } {
    if (file.size > maxFileSizeBytes)
      return { ok: false, reason: "Arquivo acima de 2MB." };

    if (docType === "selfie") {
      if (!acceptedSelfieMime.has(file.type))
        return { ok: false, reason: "Formato invÃ¡lido (use JPG/PNG)." };
      return { ok: true };
    }

    if (!acceptedDocMime.has(file.type))
      return { ok: false, reason: "Formato invÃ¡lido (use PDF/JPG/PNG)." };
    return { ok: true };
  }

  function hasDoc(docType: DocType): boolean {
    if (docType === "selfie") return !!docFiles.selfie;
    return docFiles[docType].length > 0;
  }

  function addDocFile(docType: Step3DocType, file: File) {
    // evita duplicar (heurÃ­stica simples: nome+size)
    const exists = docFiles[docType].some(
      (f) => f.file.name === file.name && f.file.size === file.size,
    );
    if (exists) return;

    const uploaded: UploadedFile = {
      id: createId(),
      file,
      createdAt: Date.now(),
      docType,
    };

    docFiles = { ...docFiles, [docType]: [...docFiles[docType], uploaded] };
    clearDocTypeError(docType);
  }

  function setSelfieFile(file: File) {
    const uploaded: UploadedFile = {
      id: createId(),
      file,
      createdAt: Date.now(),
      docType: "selfie",
    };

    docFiles = { ...docFiles, selfie: uploaded };
    clearDocTypeError("selfie");
  }

  function removeDocFileById(docType: Step3DocType, id: string) {
    docFiles = {
      ...docFiles,
      [docType]: docFiles[docType].filter((f) => f.id !== id),
    };
    clearDocTypeError(docType);
  }

  function clearDocFiles(docType: Step3DocType) {
    docFiles = { ...docFiles, [docType]: [] };
    // remove o destaque agora; validaÃ§Ã£o vai recolocar quando tentar avanÃ§ar
    clearDocTypeError(docType);
  }

  function removeDocFile(docType: DocType) {
    if (docType === "selfie") {
      docFiles = { ...docFiles, selfie: null };
      clearDocTypeError("selfie");
      return;
    }
    clearDocFiles(docType);
  }

  function handleDocFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const docType = activeDocType;

    if (!files.length || !docType) return;

    // Selfie: 1 arquivo
    if (docType === "selfie") {
      const file = files[0];
      const validation = validateFileForDoc(docType, file);

      if (!validation.ok) {
        const msg = validation.reason ?? "Arquivo invÃ¡lido (tipo/tamanho).";
        setDocTypeError(docType, msg);
        setDocMessage(msg);
        return;
      }

      setSelfieFile(file);
      setDocMessage("");
      return;
    }

    // Passo 3: mÃºltiplos
    const currentCount = docFiles[docType].length;
    const remaining = Math.max(0, maxFilesPerDocType - currentCount);

    if (remaining <= 0) {
      const msg = `Limite de ${maxFilesPerDocType} arquivos para ${docTitle(docType)}.`;
      setDocTypeError(docType, msg);
      setDocMessage(msg);
      return;
    }

    const toProcess = files.slice(0, remaining);

    let addedCount = 0;
    let firstRejected: string | null = null;

    for (const file of toProcess) {
      const validation = validateFileForDoc(docType, file);
      if (!validation.ok) {
        if (!firstRejected)
          firstRejected =
            validation.reason ?? "Arquivo invÃ¡lido (tipo/tamanho).";
        continue;
      }

      addDocFile(docType, file);
      addedCount++;
    }

    if (firstRejected) {
      setDocMessage(firstRejected);
      if (addedCount === 0) setDocTypeError(docType, firstRejected);
      else clearDocTypeError(docType);
      return;
    }

    setDocMessage("");
    clearDocTypeError(docType);
  }

  function validateDocsStep3(): { ok: boolean; message?: string } {
    // Etapa 3: RG/CNH, CNPJ, Contrato (agora: pelo menos 1 arquivo em cada)
    let anyMissing = false;

    for (const dt of step3DocTypes) {
      if (!hasDoc(dt)) {
        anyMissing = true;
        markDocAttention(dt, "ObrigatÃ³rio.");
      } else {
        clearDocTypeError(dt);
      }
    }

    if (anyMissing)
      return { ok: false, message: "Envie todos os documentos obrigatÃ³rios." };
    return { ok: true };
  }

  function validateSelfieStep4(): { ok: boolean; message?: string } {
    if (!hasDoc("selfie")) {
      markDocAttention("selfie", "ObrigatÃ³rio.");
      return { ok: false, message: "Envie a selfie com documento." };
    }
    clearDocTypeError("selfie");
    return { ok: true };
  }

  // ==============================
  // CÃ¢mera (Selfie) - tela cheia + preview + confirmar/cancelar
  // ==============================
  let cameraOverlayOpen = false; // controla tela cheia da cÃ¢mera
  let cameraActive = false;
  let cameraStream: MediaStream | null = null;
  let videoEl: HTMLVideoElement | null = null;
  let canvasEl: HTMLCanvasElement | null = null;

  // Preview antes de confirmar (permite "cancelar" a foto sem salvar)
  let pendingSelfie: { file: File; previewUrl: string } | null = null;

  function clearPendingSelfie() {
    if (pendingSelfie?.previewUrl)
      URL.revokeObjectURL(pendingSelfie.previewUrl);
    pendingSelfie = null;
  }

  async function startCamera() {
    try {
      clearPendingSelfie();
      stopCamera();

      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoEl) {
        videoEl.srcObject = cameraStream;
        await videoEl.play();
      }

      cameraActive = true;
      clearDocTypeError("selfie");
    } catch {
      cameraActive = false;
      setDocTypeError("selfie", "NÃ£o foi possÃ­vel acessar a cÃ¢mera.");
      setDocMessage("NÃ£o foi possÃ­vel acessar a cÃ¢mera.");
    }
  }

  function stopCamera() {
    if (!cameraStream) return;
    for (const track of cameraStream.getTracks()) track.stop();
    cameraStream = null;
    cameraActive = false;
  }

  async function openCameraOverlay() {
    await scrollPageToTop();
    cameraOverlayOpen = true;
    await tick(); // garante videoEl renderizado e bindado
    await startCamera();
  }

  function closeCameraOverlay() {
    cameraOverlayOpen = false;
    clearPendingSelfie();
    stopCamera();
  }

  async function retakeSelfie() {
    clearPendingSelfie();
    await startCamera();
  }

  function confirmSelfie() {
    if (!pendingSelfie) return;
    setSelfieFile(pendingSelfie.file);
    setDocMessage("");
    closeCameraOverlay();
  }

  // Captura com compressÃ£o adaptativa para caber em 2MB
  async function captureSelfie() {
    if (!videoEl || !canvasEl) return;

    const vW = videoEl.videoWidth || 1280;
    const vH = videoEl.videoHeight || 720;

    // reduz dimensÃ£o se necessÃ¡rio (evita arquivos grandes)
    const maxW = 1280;
    const scale = Math.min(1, maxW / vW);
    const w = Math.max(1, Math.round(vW * scale));
    const h = Math.max(1, Math.round(vH * scale));

    canvasEl.width = w;
    canvasEl.height = h;

    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoEl, 0, 0, w, h);

    const qualities = [0.92, 0.86, 0.8, 0.72];
    let blob: Blob | null = null;

    for (const q of qualities) {
      blob = await new Promise((resolve) =>
        canvasEl!.toBlob((b) => resolve(b), "image/jpeg", q),
      );
      if (blob && blob.size <= maxFileSizeBytes) break;
    }

    if (!blob) {
      setDocTypeError("selfie", "Falha ao capturar a foto.");
      setDocMessage("Falha ao capturar a foto.");
      return;
    }

    if (blob.size > maxFileSizeBytes) {
      setDocTypeError(
        "selfie",
        "Selfie muito pesada. Aproxime e tente novamente.",
      );
      setDocMessage("Selfie muito pesada. Aproxime e tente novamente.");
      return;
    }

    const file = new File([blob], `selfie_${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    const validation = validateFileForDoc("selfie", file);
    if (!validation.ok) {
      setDocTypeError("selfie", validation.reason ?? "Arquivo invÃ¡lido.");
      setDocMessage(validation.reason ?? "Arquivo invÃ¡lido.");
      return;
    }

    // NÃƒO salva direto â€” abre preview e pede confirmaÃ§Ã£o
    const previewUrl = URL.createObjectURL(file);
    pendingSelfie = { file, previewUrl };

    // desliga a cÃ¢mera para economizar e â€œcongelarâ€ a experiÃªncia
    stopCamera();
  }

  // Para evitar cÃ¢mera ligada quando sair do passo 4
  $: if (currentStep !== 4) {
    closeCameraOverlay();
  }

  onDestroy(() => {
    stopCamera();
    clearPendingSelfie();
  });

  // ==============================
  // Sucesso final (sem modal)
  // ==============================
  let isSuccess = false;
  let submitMessage = "";

  const successVideoUrl = "https://www.youtube.com/embed/XWWe9c7QDgo";
  const supportLink = "https://f10.movidesk.com/kb";
  const whatsappLink =
    "https://wa.me/554130274747?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20cadastro.";

  // ==============================
  // Contrato (preview do texto) via Blob URL
  // ==============================
  type TermsPayload = { version: string; text: string };
  type ContractClientMeta = {
    userAgent: string;
    platform: string;
    language: string;
    timeZone: string;
    screen: string;
    viewport: string;
    referrer: string;
  };

  let termsPayload: TermsPayload = { version: "unknown", text: "" };
  let contractPreviewUrl: string | null = null;
  let hasAutoDownloadedContract = false;

  function escapeHtml(s: string) {
    return s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function buildContractHtml(title: string, payload: TermsPayload) {
    const safeTitle = escapeHtml(title || "Contrato");
    const safeVersion = escapeHtml(payload.version || "unknown");
    const htmlText = payload.text || "";

    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; padding:24px; color:#111;}    h1{font-size:20px; margin:0 0 12px;}    .muted{color:#555; font-size:12px; margin-bottom:16px;}    pre{white-space:pre-wrap; line-height:1.45; font-size:13px; color:#222;}    @media print { body{padding:0} }  </style></head><body>
  <h1>${safeTitle}</h1>
  <div class="muted">VersÃ£o termos: ${safeVersion}</div>
  <div class="prose">${htmlText}</div>
</body>
</html>`;
  }

  function sanitizeFilenamePart(value: string): string {
    return value.replace(/[^\w.\-]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function buildContractFilename(): string {
    const cnpjDigits = onlyDigits(formData.cnpj);
    const cnpjPart = cnpjDigits ? `_${cnpjDigits}` : "";
    const dateStamp = new Date().toISOString().slice(0, 10);
    const baseName = `contrato_f10${cnpjPart}_${dateStamp}`;
    return `${sanitizeFilenamePart(baseName)}.html`;
  }

  function getContractClientMeta(): ContractClientMeta {
    if (!browser) {
      return {
        userAgent: "",
        platform: "",
        language: "",
        timeZone: "",
        screen: "",
        viewport: "",
        referrer: "",
      };
    }

    const screenSize = window.screen
      ? `${window.screen.width}x${window.screen.height}`
      : "";
    const viewportSize = `${window.innerWidth}x${window.innerHeight}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";

    return {
      userAgent: navigator.userAgent || "",
      platform: navigator.platform || "",
      language: navigator.language || "",
      timeZone,
      screen: screenSize,
      viewport: viewportSize,
      referrer: document.referrer || "",
    };
  }

  function downloadContractCopy() {
    if (!browser) return;

    const html = buildContractHtml(contract.title, termsPayload);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = buildContractFilename();
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function refreshContractPreviewUrl() {
    // IMPORTANTE: no SSR nÃ£o existe URL.createObjectURL
    if (!browser) return;

    // Revoga URL antiga (evita vazamento de memÃ³ria)
    if (contractPreviewUrl) URL.revokeObjectURL(contractPreviewUrl);

    const html = buildContractHtml(contract.title, termsPayload);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    contractPreviewUrl = URL.createObjectURL(blob);
  }

  function openContractPreviewInNewTab() {
    if (!browser) return;

    // Garante que existe uma URL antes de abrir
    if (!contractPreviewUrl) refreshContractPreviewUrl();

    if (!contractPreviewUrl) {
      setDocMessage("Contrato indisponÃ­vel para visualizaÃ§Ã£o no momento.");
      return;
    }

    window.open(contractPreviewUrl, "_blank", "noopener,noreferrer");
  }

  // Recalcula termos + preview sempre que os dados mudarem
  $: {
    const legalName = safeTrim(formData.unitLegalName);
    const cnpjDigits = onlyDigits(formData.cnpj);

    termsPayload = getF10TermsText({
      clientLegalName: legalName || undefined,
      clientCnpj: cnpjDigits || undefined,
      contractorName: legalName || undefined,
    }) as TermsPayload;

    if (!termsPayload?.text) {
      termsPayload = {
        version: termsPayload?.version ?? "unknown",
        text:
          "Contrato indisponÃ­vel para visualizaÃ§Ã£o no momento. " +
          "Preencha RazÃ£o Social e CNPJ para gerar o texto, ou tente recarregar a pÃ¡gina.",
      };
    }

    // Gera/atualiza a URL de preview HTML sempre no browser
    if (browser) refreshContractPreviewUrl();
  }

  onDestroy(() => {
    if (browser && contractPreviewUrl) URL.revokeObjectURL(contractPreviewUrl);
  });

  // ==============================
  // Helpers base
  // ==============================
  function onlyDigits(value: string): string {
    return value.replace(/\D+/g, "");
  }

  function limitDigits(value: string, maxDigits: number): string {
    return onlyDigits(value).slice(0, maxDigits);
  }

  function safeTrim(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
  }

  function clearError(key: keyof FormData) {
    if (!errors[key]) return;
    const { [key]: _ignored, ...rest } = errors;
    errors = rest;
  }

  function addError(
    nextErrors: FormErrors,
    key: keyof FormData,
    message: string,
  ): FormErrors {
    if (nextErrors[key]) return nextErrors;
    return { ...nextErrors, [key]: message };
  }

  /**
   * Atualiza campo, limpando erro e removendo flag de autofill se o usuÃ¡rio alterou manualmente.
   */
  function setField<K extends keyof FormData>(
    key: K,
    value: string,
    options?: { isAuto?: boolean; source?: "cnpj" | "cep" },
  ) {
    formData = { ...formData, [key]: value };
    clearError(key);

    // Se foi o usuÃ¡rio que mexeu, remove flags de autofill
    if (!options?.isAuto) {
      cnpjAutoFilledKeys.delete(key);
      cepAutoFilledKeys.delete(key);
      if (key === "cep") cepStatus = "unknown";
      if (key === "cnaeMain") cnaeMainDescription = "";
    }

    // Se foi autofill, marca origem
    if (options?.isAuto && options?.source === "cnpj")
      cnpjAutoFilledKeys.add(key);
    if (options?.isAuto && options?.source === "cep")
      cepAutoFilledKeys.add(key);
  }

  /**
   * Autofill sÃ³ pode sobrescrever se:
   * - campo estÃ¡ vazio, OU
   * - campo foi preenchido automaticamente antes (mesma origem).
   */
  function canAutoOverwrite(
    key: keyof FormData,
    source: "cnpj" | "cep",
  ): boolean {
    const current = safeTrim(formData[key]);
    if (!current) return true;
    if (source === "cnpj") return cnpjAutoFilledKeys.has(key);
    return cepAutoFilledKeys.has(key);
  }

  // ==============================
  // MÃ¡scaras / FormataÃ§Ã£o (com limite de dÃ­gitos)
  // ==============================
  function formatCpf(value: string): string {
    const d = limitDigits(value, 11);
    const p1 = d.slice(0, 3);
    const p2 = d.slice(3, 6);
    const p3 = d.slice(6, 9);
    const p4 = d.slice(9, 11);

    let out = p1;
    if (p2) out += `.${p2}`;
    if (p3) out += `.${p3}`;
    if (p4) out += `-${p4}`;
    return out;
  }

  function formatCnpj(value: string): string {
    const d = limitDigits(value, 14);
    const p1 = d.slice(0, 2);
    const p2 = d.slice(2, 5);
    const p3 = d.slice(5, 8);
    const p4 = d.slice(8, 12);
    const p5 = d.slice(12, 14);

    let out = p1;
    if (p2) out += `.${p2}`;
    if (p3) out += `.${p3}`;
    if (p4) out += `/${p4}`;
    if (p5) out += `-${p5}`;
    return out;
  }

  function formatCep(value: string): string {
    const d = limitDigits(value, 8);
    const p1 = d.slice(0, 5);
    const p2 = d.slice(5, 8);
    return p2 ? `${p1}-${p2}` : p1;
  }

  function formatBrPhone(value: string): string {
    const d = limitDigits(value, 11);
    const ddd = d.slice(0, 2);
    const rest = d.slice(2);

    if (!ddd) return d;

    if (rest.length >= 9) {
      const p1 = rest.slice(0, 5);
      const p2 = rest.slice(5, 9);
      return `(${ddd}) ${p1}${p2 ? `-${p2}` : ""}`.trim();
    }

    const p1 = rest.slice(0, 4);
    const p2 = rest.slice(4, 8);
    return `(${ddd}) ${p1}${p2 ? `-${p2}` : ""}`.trim();
  }

  // CNAE: apenas nÃºmeros (7 dÃ­gitos)
  function formatCnae(value: string): string {
    return limitDigits(value, 7);
  }

  // RG: apenas nÃºmeros (limite conservador)
  function formatRg(value: string): string {
    return limitDigits(value, 14);
  }

  // NÃºmero do endereÃ§o: apenas nÃºmeros (limite conservador)
  function formatAddressNumber(value: string): string {
    return limitDigits(value, 10);
  }

  // ==============================
  // ValidaÃ§Ãµes reais
  // ==============================
  function isEmailValid(email: string): boolean {
    const v = safeTrim(email);
    if (!v) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function isCpfValid(value: string): boolean {
    const cpf = onlyDigits(value);
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    const calcCheck = (base: string, factor: number) => {
      let sum = 0;
      for (let i = 0; i < base.length; i++)
        sum += Number(base[i]) * (factor - i);
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };

    const base9 = cpf.slice(0, 9);
    const d1 = calcCheck(base9, 10);
    const base10 = cpf.slice(0, 10);
    const d2 = calcCheck(base10, 11);
    return cpf === `${base9}${d1}${d2}`;
  }

  function isCnpjValid(value: string): boolean {
    const cnpj = onlyDigits(value);
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    const calcDigit = (base: string, weights: number[]) => {
      let sum = 0;
      for (let i = 0; i < base.length; i++) sum += Number(base[i]) * weights[i];
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };

    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    const base12 = cnpj.slice(0, 12);
    const d1 = calcDigit(base12, w1);
    const base13 = cnpj.slice(0, 13);
    const d2 = calcDigit(base13, w2);
    return cnpj === `${base12}${d1}${d2}`;
  }

  function isBrazilPhoneValid(value: string): boolean {
    const d = onlyDigits(value);
    if (d.length !== 10 && d.length !== 11) return false;
    if (/^(\d)\1+$/.test(d)) return false;
    const ddd = Number(d.slice(0, 2));
    if (ddd < 11 || ddd > 99) return false;
    return true;
  }

  function isUrlValid(value: string): boolean {
    const v = safeTrim(value);
    if (!v) return true; // opcional
    try {
      const withProtocol =
        v.startsWith("http://") || v.startsWith("https://")
          ? v
          : `https://${v}`;
      const url = new URL(withProtocol);
      return !!url.hostname && url.hostname.includes(".");
    } catch {
      return false;
    }
  }

  // ==============================
  // ValidaÃ§Ãµes por etapa
  // ==============================
  async function validateStep1(): Promise<boolean> {
    let nextErrors: FormErrors = {};

    if (!isCnpjValid(formData.cnpj))
      nextErrors = addError(nextErrors, "cnpj", "CNPJ invÃ¡lido.");

    if (!safeTrim(formData.unitLegalName))
      nextErrors = addError(
        nextErrors,
        "unitLegalName",
        "Informe a razÃ£o social.",
      );

    if (!safeTrim(formData.unitFantasyName))
      nextErrors = addError(
        nextErrors,
        "unitFantasyName",
        "Informe o nome fantasia.",
      );

    // CNAE: obrigatÃ³rio e apenas nÃºmeros (7 dÃ­gitos)
    const cnaeDigits = onlyDigits(formData.cnaeMain);
    if (cnaeDigits.length !== 7)
      nextErrors = addError(
        nextErrors,
        "cnaeMain",
        "CNAE invÃ¡lido (7 dÃ­gitos).",
      );

    const cepDigits = onlyDigits(formData.cep);
    if (cepDigits.length !== 8) {
      nextErrors = addError(nextErrors, "cep", "CEP invÃ¡lido.");
    } else {
      if (cepStatus !== "valid") {
        await lookupCepSilently(cepDigits);
      }
      if (cepStatus !== "valid")
        nextErrors = addError(nextErrors, "cep", "CEP invÃ¡lido.");
    }

    if (!safeTrim(formData.street))
      nextErrors = addError(nextErrors, "street", "Informe o logradouro.");

    if (!safeTrim(formData.number))
      nextErrors = addError(nextErrors, "number", "Informe o nÃºmero.");

    if (!safeTrim(formData.neighborhood))
      nextErrors = addError(nextErrors, "neighborhood", "Informe o bairro.");

    if (!safeTrim(formData.city))
      nextErrors = addError(nextErrors, "city", "Informe a cidade.");

    if (safeTrim(formData.state).length !== 2)
      nextErrors = addError(nextErrors, "state", "Informe a UF.");

    if (!isBrazilPhoneValid(formData.unitPhone))
      nextErrors = addError(nextErrors, "unitPhone", "Telefone invÃ¡lido.");

    errors = nextErrors;
    return Object.keys(nextErrors).length === 0;
  }

  function validateStep2(): boolean {
    let nextErrors: FormErrors = {};

    if (!safeTrim(formData.managerName))
      nextErrors = addError(
        nextErrors,
        "managerName",
        "Informe o responsÃ¡vel.",
      );

    if (!isCpfValid(formData.managerCpf))
      nextErrors = addError(nextErrors, "managerCpf", "CPF invÃ¡lido.");

    if (!safeTrim(formData.managerRg))
      nextErrors = addError(nextErrors, "managerRg", "Informe o RG.");

    if (!isBrazilPhoneValid(formData.managerWhatsapp))
      nextErrors = addError(
        nextErrors,
        "managerWhatsapp",
        "WhatsApp invÃ¡lido.",
      );

    if (!isEmailValid(formData.managerEmail))
      nextErrors = addError(nextErrors, "managerEmail", "E-mail invÃ¡lido.");

    if (!isUrlValid(formData.marketingSite))
      nextErrors = addError(nextErrors, "marketingSite", "Site invÃ¡lido.");

    errors = nextErrors;
    return Object.keys(nextErrors).length === 0;
  }

  // ==============================
  // Lookup CNPJ (silencioso)
  // ==============================
  function scheduleCnpjLookup() {
    const digits = onlyDigits(formData.cnpj);
    if (digits.length !== 14) return;
    if (!isCnpjValid(digits)) return;
    if (digits === lastCnpjLookup) return;

    if (cnpjDebounceId) clearTimeout(cnpjDebounceId);
    cnpjDebounceId = setTimeout(() => {
      void lookupCnpjSilently(digits);
    }, 450);
  }

  async function lookupCnpjSilently(cnpjDigits: string) {
    if (cnpjDigits === lastCnpjLookup) return;
    lastCnpjLookup = cnpjDigits;

    isCnpjLoading = true;
    try {
      const res = await fetch(`/api/cnpj/${encodeURIComponent(cnpjDigits)}`, {
        headers: { Accept: "application/json" },
      });

      if (res.status === 404) return;
      if (!res.ok) return;

      const data = await res.json();

      if (data?.razao_social && canAutoOverwrite("unitLegalName", "cnpj")) {
        setField("unitLegalName", String(data.razao_social), {
          isAuto: true,
          source: "cnpj",
        });
      }

      const fantasy = data?.estabelecimento?.nome_fantasia
        ? String(data.estabelecimento.nome_fantasia)
        : "";
      if (fantasy && canAutoOverwrite("unitFantasyName", "cnpj")) {
        setField("unitFantasyName", fantasy, { isAuto: true, source: "cnpj" });
      }

      // CNAE: salvar somente nÃºmeros (id). DescriÃ§Ã£o vai em cnaeMainDescription.
      const cnaeIdRaw = data?.estabelecimento?.atividade_principal?.id
        ? String(data.estabelecimento.atividade_principal.id)
        : "";
      const cnaeId = formatCnae(cnaeIdRaw);

      const cnaeDesc = data?.estabelecimento?.atividade_principal?.descricao
        ? String(data.estabelecimento.atividade_principal.descricao)
        : "";

      if (cnaeId && canAutoOverwrite("cnaeMain", "cnpj")) {
        setField("cnaeMain", cnaeId, { isAuto: true, source: "cnpj" });
        cnaeMainDescription = cnaeDesc || "";
      }

      const ddd = data?.estabelecimento?.ddd1
        ? String(data.estabelecimento.ddd1)
        : "";
      const tel = data?.estabelecimento?.telefone1
        ? String(data.estabelecimento.telefone1)
        : "";
      if ((ddd || tel) && canAutoOverwrite("unitPhone", "cnpj")) {
        setField("unitPhone", formatBrPhone(`${ddd}${tel}`), {
          isAuto: true,
          source: "cnpj",
        });
      }

      const cepFromCnpj = data?.estabelecimento?.cep
        ? String(data.estabelecimento.cep)
        : "";
      if (cepFromCnpj && canAutoOverwrite("cep", "cnpj")) {
        setField("cep", formatCep(cepFromCnpj), {
          isAuto: true,
          source: "cnpj",
        });
      }

      const tipoLog = data?.estabelecimento?.tipo_logradouro
        ? String(data.estabelecimento.tipo_logradouro)
        : "";
      const log = data?.estabelecimento?.logradouro
        ? String(data.estabelecimento.logradouro)
        : "";
      const street = [tipoLog, log].filter(Boolean).join(" ").trim();
      if (street && canAutoOverwrite("street", "cnpj")) {
        setField("street", street, { isAuto: true, source: "cnpj" });
      }

      if (data?.estabelecimento?.numero && canAutoOverwrite("number", "cnpj")) {
        setField(
          "number",
          formatAddressNumber(String(data.estabelecimento.numero)),
          {
            isAuto: true,
            source: "cnpj",
          },
        );
      }

      if (
        data?.estabelecimento?.complemento &&
        canAutoOverwrite("complement", "cnpj")
      ) {
        setField("complement", String(data.estabelecimento.complemento), {
          isAuto: true,
          source: "cnpj",
        });
      }

      if (
        data?.estabelecimento?.bairro &&
        canAutoOverwrite("neighborhood", "cnpj")
      ) {
        setField("neighborhood", String(data.estabelecimento.bairro), {
          isAuto: true,
          source: "cnpj",
        });
      }

      const cityName = data?.estabelecimento?.cidade?.nome
        ? String(data.estabelecimento.cidade.nome)
        : "";
      if (cityName && canAutoOverwrite("city", "cnpj")) {
        setField("city", cityName, { isAuto: true, source: "cnpj" });
      }

      const uf = data?.estabelecimento?.estado?.sigla
        ? String(data.estabelecimento.estado.sigla)
        : "";
      if (uf && canAutoOverwrite("state", "cnpj")) {
        setField("state", uf, { isAuto: true, source: "cnpj" });
      }

      const cepDigits = onlyDigits(formData.cep);
      if (cepDigits.length === 8) {
        void lookupCepSilently(cepDigits);
      }
    } catch {
      // silÃªncio
    } finally {
      isCnpjLoading = false;
    }
  }

  // ==============================
  // Lookup CEP (silencioso)
  // ==============================
  function scheduleCepLookup() {
    const digits = onlyDigits(formData.cep);
    if (digits.length !== 8) return;
    if (digits === lastCepLookup) return;

    if (cepDebounceId) clearTimeout(cepDebounceId);
    cepDebounceId = setTimeout(() => {
      void lookupCepSilently(digits);
    }, 450);
  }

  async function lookupCepSilently(cepDigits: string) {
    if (cepDigits === lastCepLookup) return;
    lastCepLookup = cepDigits;

    isCepLoading = true;
    try {
      const res = await fetch(
        `/api/viacep?cep=${encodeURIComponent(cepDigits)}`,
        {
          headers: { Accept: "application/json" },
        },
      );

      if (res.status === 404) {
        cepStatus = "invalid";
        return;
      }

      if (!res.ok) {
        if (cepStatus !== "valid") cepStatus = "unknown";
        return;
      }

      const data = await res.json();
      if (!data || data.erro) {
        cepStatus = "invalid";
        return;
      }

      cepStatus = "valid";

      if (data.logradouro && canAutoOverwrite("street", "cep"))
        setField("street", String(data.logradouro), {
          isAuto: true,
          source: "cep",
        });
      if (data.bairro && canAutoOverwrite("neighborhood", "cep"))
        setField("neighborhood", String(data.bairro), {
          isAuto: true,
          source: "cep",
        });
      if (data.localidade && canAutoOverwrite("city", "cep"))
        setField("city", String(data.localidade), {
          isAuto: true,
          source: "cep",
        });
      if (data.uf && canAutoOverwrite("state", "cep"))
        setField("state", String(data.uf).toUpperCase(), {
          isAuto: true,
          source: "cep",
        });

      if (data.complemento && canAutoOverwrite("complement", "cep")) {
        setField("complement", String(data.complemento), {
          isAuto: true,
          source: "cep",
        });
      }
    } catch {
      if (cepStatus !== "valid") cepStatus = "unknown";
    } finally {
      isCepLoading = false;
    }
  }

  // ==============================
  // NavegaÃ§Ã£o do Wizard
  // ==============================
  async function scrollPageToTop() {
    if (!browser) return;
    await tick();
    window.scrollTo({ top: 0, left: 0 });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  async function goNext() {
    submitMessage = "";
    setDocMessage("");

    if (currentStep === 1) {
      const ok = await validateStep1();
      if (!ok) return;
      currentStep = 2;
      await scrollPageToTop();
      return;
    }

    if (currentStep === 2) {
      if (!validateStep2()) return;
      currentStep = 3;
      await scrollPageToTop();
      return;
    }

    if (currentStep === 3) {
      const docs = validateDocsStep3();
      if (!docs.ok) {
        setDocMessage(docs.message ?? "Revise os documentos.");
        return;
      }
      currentStep = 4;
      await scrollPageToTop();
      return;
    }

    if (currentStep === 4) {
      const selfie = validateSelfieStep4();
      if (!selfie.ok) {
        setDocMessage(selfie.message ?? "Revise a selfie.");
        return;
      }

      currentStep = 5;
      await scrollPageToTop();
      return;
    }
  }

  async function goBack() {
    submitMessage = "";
    setDocMessage("");
    if (currentStep === 2) currentStep = 1;
    else if (currentStep === 3) currentStep = 2;
    else if (currentStep === 4) currentStep = 3;
    else if (currentStep === 5) currentStep = 4;

    await scrollPageToTop();
  }

  // ==============================
  // Envio final
  // ==============================
  async function handleFinalSubmit() {
    submitMessage = "";
    setDocMessage("");
    errors = {};
    clearAllDocAttentions();

    const ok1 = await validateStep1();
    if (!ok1) {
      currentStep = 1;
      await scrollPageToTop();
      return;
    }

    if (!validateStep2()) {
      currentStep = 2;
      await scrollPageToTop();
      return;
    }

    const docs = validateDocsStep3();
    if (!docs.ok) {
      currentStep = 3;
      setDocMessage(docs.message ?? "Revise os documentos.");
      await scrollPageToTop();
      return;
    }

    const selfie = validateSelfieStep4();
    if (!selfie.ok) {
      setDocMessage(selfie.message ?? "Revise a selfie.");
      return;
    }

    if (!validateContractStep5()) {
      currentStep = 5;
      await scrollPageToTop();
      return;
    }

    isSubmitting = true;

    try {
      // 1) Monta multipart com payload + arquivos
      // 1) Monta multipart com payload + arquivos
      const fd = new FormData();

      const contractSnapshotText = termsPayload.text;
      const contractAcceptedAt = contract.acceptedAt;
      const contractSnapshotHtml = buildContractHtml(contract.title, termsPayload);
      const contractSnapshotFileName = buildContractFilename();
      const contractClientMeta = getContractClientMeta();

      fd.append(
        "payload",
        JSON.stringify({
          ...formData,
          submittedAt: new Date().toISOString(),

          contract: {
            title: contract.title,
            contractVersion: contract.contractVersion,
            termsVersion: termsPayload.version,
            accepted: contract.accepted,
            acceptedAt: contractAcceptedAt,
            snapshotText: contractSnapshotText,
            snapshotHtml: contractSnapshotHtml,
            snapshotFileName: contractSnapshotFileName,
            signedAtClient: contractAcceptedAt,
            signedClientMeta: contractClientMeta,
          },
        }),
      );

      // Passo 3 (mÃºltiplos)
      for (const uf of docFiles.rg_cnh) fd.append("doc_rg_cnh", uf.file);
      for (const uf of docFiles.cnpj) fd.append("doc_cnpj", uf.file);
      for (const uf of docFiles.contrato) fd.append("doc_contrato", uf.file);

      // Passo 4 (Ãºnico)
      fd.append("doc_selfie", docFiles.selfie!.file);

      // 2) Envia para o endpoint que dispara o e-mail via Brevo
      const res = await fetch("/api/registration/submit", {
        method: "POST",
        body: fd,
      });

      // 3) Trata erros
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          data?.message ||
          "NÃ£o foi possÃ­vel enviar. Verifique os dados e tente novamente.";
        submitMessage = msg;
        setDocMessage(msg);
        return;
      }

      // 4) Sucesso
      isSuccess = true;
      submitMessage = "";
      setDocMessage("");
      await scrollPageToTop();
      if (!hasAutoDownloadedContract) {
        hasAutoDownloadedContract = true;
        downloadContractCopy();
      }
    } catch {
      submitMessage = "NÃ£o foi possÃ­vel enviar. Tente novamente.";
      setDocMessage("NÃ£o foi possÃ­vel enviar. Tente novamente.");
    } finally {
      isSubmitting = false;
    }
  }

  // ==============================
  // UI helpers docs
  // ==============================
  function formatBytes(bytes: number): string {
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(0)}kb`;
    return `${(kb / 1024).toFixed(1)}mb`;
  }

  function docTitle(docType: DocType): string {
    if (docType === "rg_cnh") return "RG ou CNH";
    if (docType === "cnpj") return "CNPJ";
    if (docType === "contrato") return "Contrato Social";
    return "Selfie com documento";
  }

  function docHint(docType: DocType): string {
    if (docType === "rg_cnh")
      return "CNH: inclua a foto do QR Code. PDF ou imagem.";
    if (docType === "cnpj") return "Arquivo PDF ou imagem.";
    if (docType === "contrato") return "Arquivo PDF ou imagem.";
    return "Foto nÃ­tida segurando o documento.";
  }

  function docCardBorderClass(docType: DocType): string {
    const needsAttention =
      docAttentionByType[docType] || !!docErrorsByType[docType];
    return needsAttention ? "border-red-400" : "border-black/10";
  }

  let prevBodyOverflow = "";
  let prevHtmlOverflow = "";

  function lockScroll() {
    if (!browser) return;
    prevBodyOverflow = document.body.style.overflow;
    prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }

  function unlockScroll() {
    if (!browser) return;
    document.body.style.overflow = prevBodyOverflow;
    document.documentElement.style.overflow = prevHtmlOverflow;
  }

  // trava/destrava automaticamente
  $: if (browser) {
    if (cameraOverlayOpen) lockScroll();
    else unlockScroll();
  }
</script>

<section
  class="min-h-screen pb-12 bg-white/50 flex flex-1 flex-col"
  style="--primary:#ea6d0b; --page-bg:#FFF7EF; --surface:#FFFFFF; --muted:#000000a6; --outline:#0000001a;"
>
  <Breadcrumb
    baseUrl="https://f10.com.br"
    items={[
      { label: "HOME", href: "/" },
      { label: "CELCOIN", href: "/celcoin" },
      { label: "CADASTRO" },
    ]}
  />

  <!-- input Ãºnico (controlado por activeDocType) -->
  <input
    bind:this={fileInputRef}
    type="file"
    class="hidden"
    on:change={handleDocFileChange}
    multiple={!!activeDocType && activeDocType !== "selfie"}
    accept={activeDocType
      ? getAcceptByDocType(activeDocType)
      : "application/pdf,image/png,image/jpeg"}
  />

  <div class="container flex-1 flex flex-col justify-center">
    <header class="mb-6">
      <h1
        class="text-[16px] sm:text-[16px] leading-tight font-semibold text-[var(--secondary)]"
      >
        Criar conta - CELCOIN F10
      </h1>

      <!-- Stepper (4 etapas) -->
      <div class="mt-4 flex items-center gap-2">
        <div
          class={`h-2 flex-1 rounded-full ${isSuccess || currentStep >= 1 ? "bg-[var(--primary)]" : "bg-black/10"}`}
        ></div>
        <div
          class={`h-2 flex-1 rounded-full ${isSuccess || currentStep >= 2 ? "bg-[var(--primary)]" : "bg-black/10"}`}
        ></div>
        <div
          class={`h-2 flex-1 rounded-full ${isSuccess || currentStep >= 3 ? "bg-[var(--primary)]" : "bg-black/10"}`}
        ></div>
        <div
          class={`h-2 flex-1 rounded-full ${isSuccess || currentStep >= 4 ? "bg-[var(--primary)]" : "bg-black/10"}`}
        ></div>
        <div
          class={`h-2 flex-1 rounded-full ${isSuccess || currentStep >= 5 ? "bg-[var(--primary)]" : "bg-black/10"}`}
        ></div>
      </div>

      <div class="mt-2 text-[13px] text-black/60">
        {#if isSuccess}
          Sucesso
        {:else}
          {#if currentStep === 1}Dados da unidade{/if}
          {#if currentStep === 2}Dados do responsÃ¡vel{/if}
          {#if currentStep === 3}Documentos{/if}
          {#if currentStep === 4}Selfie com documento{/if}
          {#if currentStep === 5}Contrato e aceite{/if}
        {/if}
      </div>
    </header>

    <div
      class="rounded-[22px] bg-[var(--surface)] border border-[var(--outline)] shadow-sm p-5 sm:p-8 space-y-8"
    >
      {#if isSuccess}
        <!-- =======================
             Sucesso (final) - sem modal
             ======================= -->
        <div class="text-center">
          <div
            class="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center"
          >
            <CheckCircle2 size={28} class="text-emerald-300" />
          </div>

          <h2 class="mt-4 text-[20px] font-semibold text-black/85">
            Tudo certo!
          </h2>
          <p class="mt-2 text-[13px] text-black/60">
            Recebemos seus dados. Assista ao vÃ­deo abaixo para as prÃ³ximas
            orientaÃ§Ãµes.
          </p>

          <div
            class="mt-5 rounded-2xl overflow-hidden border border-black/10 bg-black"
          >
            <div class="relative w-full" style="padding-top: 56.25%;">
              <iframe
                class="absolute inset-0 h-full w-full"
                src={successVideoUrl}
                title="VÃ­deo"
                frameborder="0"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
            </div>
          </div>

          <div class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href={supportLink}
              target="_blank"
              rel="noopener"
              class="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold border border-black/15 bg-white hover:bg-black/[0.03]"
            >
              Suporte
            </a>

            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold border border-black/15 bg-white hover:bg-black/[0.03]"
              on:click={downloadContractCopy}
            >
              Baixar contrato
            </button>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener"
              class="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold text-white bg-[var(--primary)] hover:brightness-110"
            >
              WhatsApp
            </a>
          </div>
        </div>
      {:else}
        <!-- =======================
             Etapa 1 â€” Unidade
             ======================= -->
        {#if currentStep === 1}
          <!-- (Etapa 1 igual ao seu cÃ³digo original â€” mantida) -->
          <div>
            <h2 class="text-[18px] font-semibold text-[var(--primary)]">
              Dados da unidade
            </h2>

            <div class="mt-6 space-y-5">
              <div>
                <label
                  for="cnpj"
                  class="block text-[13px] font-medium text-black/70"
                  >CNPJ</label
                >

                <div class="mt-2 relative">
                  <input
                    id="cnpj"
                    class={`w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                      errors.cnpj
                        ? "border-red-400"
                        : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                    }`}
                    value={formData.cnpj}
                    inputmode="numeric"
                    type="tel"
                    pattern="\d*"
                    maxlength="18"
                    autocomplete="off"
                    placeholder="00.000.000/0000-00"
                    on:input={(e) => {
                      const masked = formatCnpj(
                        (e.currentTarget as HTMLInputElement).value,
                      );
                      setField("cnpj", masked);
                      scheduleCnpjLookup();
                    }}
                    on:blur={() => {
                      const digits = onlyDigits(formData.cnpj);
                      if (digits.length === 14 && isCnpjValid(digits))
                        void lookupCnpjSilently(digits);
                    }}
                  />

                  {#if isCnpjLoading}
                    <div class="absolute right-3 top-1/2 -translate-y-1/2">
                      <span
                        class="inline-block h-4 w-4 rounded-full border-2 border-black/10 border-t-[var(--primary)] animate-spin"
                      ></span>
                    </div>
                  {/if}
                </div>

                {#if errors.cnpj}<p class="mt-2 text-[12px] text-red-600">
                    {errors.cnpj}
                  </p>{/if}
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label
                    for="unitLegalName"
                    class="block text-[13px] font-medium text-black/70"
                    >RazÃ£o Social</label
                  >
                  <input
                    id="unitLegalName"
                    class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                      errors.unitLegalName
                        ? "border-red-400"
                        : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                    }`}
                    value={formData.unitLegalName}
                    placeholder="Ex: Escola Exemplo LTDA"
                    autocomplete="organization"
                    on:input={(e) =>
                      setField(
                        "unitLegalName",
                        (e.currentTarget as HTMLInputElement).value,
                      )}
                  />
                  {#if errors.unitLegalName}<p
                      class="mt-2 text-[12px] text-red-600"
                    >
                      {errors.unitLegalName}
                    </p>{/if}
                </div>

                <div>
                  <label
                    for="unitFantasyName"
                    class="block text-[13px] font-medium text-black/70"
                    >Nome Fantasia</label
                  >
                  <input
                    id="unitFantasyName"
                    class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                      errors.unitFantasyName
                        ? "border-red-400"
                        : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                    }`}
                    value={formData.unitFantasyName}
                    placeholder="Ex: Escola Exemplo"
                    autocomplete="organization"
                    on:input={(e) =>
                      setField(
                        "unitFantasyName",
                        (e.currentTarget as HTMLInputElement).value,
                      )}
                  />
                  {#if errors.unitFantasyName}<p
                      class="mt-2 text-[12px] text-red-600"
                    >
                      {errors.unitFantasyName}
                    </p>{/if}
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label
                    for="cnaeMain"
                    class="block text-[13px] font-medium text-black/70"
                    >CNAE principal</label
                  >
                  <input
                    id="cnaeMain"
                    class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                      errors.cnaeMain
                        ? "border-red-400"
                        : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                    }`}
                    value={formData.cnaeMain}
                    inputmode="numeric"
                    type="tel"
                    pattern="\d*"
                    maxlength="7"
                    autocomplete="off"
                    placeholder="0000000"
                    on:input={(e) => {
                      const v = formatCnae(
                        (e.currentTarget as HTMLInputElement).value,
                      );
                      setField("cnaeMain", v);
                    }}
                  />
                  {#if cnaeMainDescription}
                    <p class="mt-2 text-[12px] text-black/55">
                      {cnaeMainDescription}
                    </p>
                  {/if}
                  {#if errors.cnaeMain}<p class="mt-2 text-[12px] text-red-600">
                      {errors.cnaeMain}
                    </p>{/if}
                </div>

                <div>
                  <label
                    for="unitPhone"
                    class="block text-[13px] font-medium text-black/70"
                    >Telefone Comercial</label
                  >
                  <input
                    id="unitPhone"
                    class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                      errors.unitPhone
                        ? "border-red-400"
                        : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                    }`}
                    value={formData.unitPhone}
                    inputmode="tel"
                    type="tel"
                    maxlength="15"
                    autocomplete="tel"
                    placeholder="(00) 00000-0000"
                    on:input={(e) =>
                      setField(
                        "unitPhone",
                        formatBrPhone(
                          (e.currentTarget as HTMLInputElement).value,
                        ),
                      )}
                  />
                  {#if errors.unitPhone}<p
                      class="mt-2 text-[12px] text-red-600"
                    >
                      {errors.unitPhone}
                    </p>{/if}
                </div>
              </div>

              <div
                class="rounded-2xl bg-[var(--page-bg)] border border-black/5 p-4"
              >
                <div
                  class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end"
                >
                  <div>
                    <label
                      for="cep"
                      class="block text-[13px] font-medium text-black/70"
                      >CEP</label
                    >
                    <div class="mt-2 relative">
                      <input
                        id="cep"
                        class={`w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                          errors.cep
                            ? "border-red-400"
                            : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        }`}
                        value={formData.cep}
                        inputmode="numeric"
                        type="tel"
                        pattern="\d*"
                        maxlength="9"
                        autocomplete="postal-code"
                        placeholder="00000-000"
                        on:input={(e) => {
                          setField(
                            "cep",
                            formatCep(
                              (e.currentTarget as HTMLInputElement).value,
                            ),
                          );
                          scheduleCepLookup();
                        }}
                        on:blur={() => {
                          const d = onlyDigits(formData.cep);
                          if (d.length === 8) void lookupCepSilently(d);
                        }}
                      />

                      {#if isCepLoading}
                        <div class="absolute right-3 top-1/2 -translate-y-1/2">
                          <span
                            class="inline-block h-4 w-4 rounded-full border-2 border-black/10 border-t-[var(--primary)] animate-spin"
                          ></span>
                        </div>
                      {/if}
                    </div>
                    {#if errors.cep}<p class="mt-2 text-[12px] text-red-600">
                        {errors.cep}
                      </p>{/if}
                  </div>

                  <div class="hidden md:block text-[12px] text-black/0">.</div>
                </div>

                <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label
                      for="street"
                      class="block text-[13px] font-medium text-black/70"
                      >Logradouro</label
                    >
                    <input
                      id="street"
                      class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                        errors.street
                          ? "border-red-400"
                          : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                      }`}
                      value={formData.street}
                      placeholder="Ex: Rua das Flores"
                      autocomplete="street-address"
                      on:input={(e) =>
                        setField(
                          "street",
                          (e.currentTarget as HTMLInputElement).value,
                        )}
                    />
                    {#if errors.street}<p class="mt-2 text-[12px] text-red-600">
                        {errors.street}
                      </p>{/if}
                  </div>

                  <div class="grid grid-cols-2 gap-5">
                    <div>
                      <label
                        for="number"
                        class="block text-[13px] font-medium text-black/70"
                        >NÃºmero</label
                      >
                      <input
                        id="number"
                        class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                          errors.number
                            ? "border-red-400"
                            : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        }`}
                        value={formData.number}
                        inputmode="numeric"
                        type="tel"
                        pattern="\d*"
                        maxlength="10"
                        autocomplete="off"
                        placeholder="123"
                        on:input={(e) =>
                          setField(
                            "number",
                            formatAddressNumber(
                              (e.currentTarget as HTMLInputElement).value,
                            ),
                          )}
                      />
                      {#if errors.number}<p
                          class="mt-2 text-[12px] text-red-600"
                        >
                          {errors.number}
                        </p>{/if}
                    </div>

                    <div>
                      <label
                        for="state"
                        class="block text-[13px] font-medium text-black/70"
                        >UF</label
                      >
                      <input
                        id="state"
                        class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none uppercase ${
                          errors.state
                            ? "border-red-400"
                            : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        }`}
                        value={formData.state}
                        maxlength="2"
                        autocomplete="address-level1"
                        placeholder="PR"
                        on:input={(e) =>
                          setField(
                            "state",
                            (e.currentTarget as HTMLInputElement).value
                              .toUpperCase()
                              .slice(0, 2),
                          )}
                      />
                      {#if errors.state}<p
                          class="mt-2 text-[12px] text-red-600"
                        >
                          {errors.state}
                        </p>{/if}
                    </div>
                  </div>
                </div>

                <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label
                      for="neighborhood"
                      class="block text-[13px] font-medium text-black/70"
                      >Bairro</label
                    >
                    <input
                      id="neighborhood"
                      class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                        errors.neighborhood
                          ? "border-red-400"
                          : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                      }`}
                      value={formData.neighborhood}
                      placeholder="Ex: Centro"
                      autocomplete="address-level3"
                      on:input={(e) =>
                        setField(
                          "neighborhood",
                          (e.currentTarget as HTMLInputElement).value,
                        )}
                    />
                    {#if errors.neighborhood}<p
                        class="mt-2 text-[12px] text-red-600"
                      >
                        {errors.neighborhood}
                      </p>{/if}
                  </div>

                  <div>
                    <label
                      for="city"
                      class="block text-[13px] font-medium text-black/70"
                      >Cidade</label
                    >
                    <input
                      id="city"
                      class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                        errors.city
                          ? "border-red-400"
                          : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                      }`}
                      value={formData.city}
                      placeholder="Ex: Curitiba"
                      autocomplete="address-level2"
                      on:input={(e) =>
                        setField(
                          "city",
                          (e.currentTarget as HTMLInputElement).value,
                        )}
                    />
                    {#if errors.city}<p class="mt-2 text-[12px] text-red-600">
                        {errors.city}
                      </p>{/if}
                  </div>
                </div>

                <div class="mt-4">
                  <label
                    for="complement"
                    class="block text-[13px] font-medium text-black/70"
                    >Complemento</label
                  >
                  <input
                    id="complement"
                    class="mt-2 w-full rounded-xl border border-black/15 px-4 py-3 text-[15px] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                    value={formData.complement}
                    placeholder="Ex: Apto 12, Bloco B (opcional)"
                    autocomplete="address-line2"
                    on:input={(e) =>
                      setField(
                        "complement",
                        (e.currentTarget as HTMLInputElement).value,
                      )}
                  />
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- =======================
             Etapa 2 â€” ResponsÃ¡vel + DivulgaÃ§Ã£o
             ======================= -->
        {#if currentStep === 2}
          <!-- (Etapa 2 igual ao seu cÃ³digo original â€” mantida) -->
          <div>
            <h2 class="text-[18px] font-semibold text-[var(--primary)]">
              Dados do responsÃ¡vel
            </h2>

            <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label
                  for="managerName"
                  class="block text-[13px] font-medium text-black/70"
                  >ResponsÃ¡vel</label
                >
                <input
                  id="managerName"
                  class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                    errors.managerName
                      ? "border-red-400"
                      : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  }`}
                  value={formData.managerName}
                  placeholder="Ex: Maria da Silva"
                  autocomplete="name"
                  on:input={(e) =>
                    setField(
                      "managerName",
                      (e.currentTarget as HTMLInputElement).value,
                    )}
                />
                {#if errors.managerName}<p
                    class="mt-2 text-[12px] text-red-600"
                  >
                    {errors.managerName}
                  </p>{/if}
              </div>

              <div>
                <label
                  for="managerCpf"
                  class="block text-[13px] font-medium text-black/70">CPF</label
                >
                <input
                  id="managerCpf"
                  class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                    errors.managerCpf
                      ? "border-red-400"
                      : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  }`}
                  value={formData.managerCpf}
                  inputmode="numeric"
                  type="tel"
                  pattern="\d*"
                  maxlength="14"
                  autocomplete="off"
                  placeholder="000.000.000-00"
                  on:input={(e) =>
                    setField(
                      "managerCpf",
                      formatCpf((e.currentTarget as HTMLInputElement).value),
                    )}
                />
                {#if errors.managerCpf}<p class="mt-2 text-[12px] text-red-600">
                    {errors.managerCpf}
                  </p>{/if}
              </div>

              <div>
                <label
                  for="managerRg"
                  class="block text-[13px] font-medium text-black/70">RG</label
                >
                <input
                  id="managerRg"
                  class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                    errors.managerRg
                      ? "border-red-400"
                      : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  }`}
                  value={formData.managerRg}
                  inputmode="numeric"
                  type="tel"
                  pattern="\d*"
                  maxlength="14"
                  autocomplete="off"
                  placeholder="000000000"
                  on:input={(e) =>
                    setField(
                      "managerRg",
                      formatRg((e.currentTarget as HTMLInputElement).value),
                    )}
                />
                {#if errors.managerRg}<p class="mt-2 text-[12px] text-red-600">
                    {errors.managerRg}
                  </p>{/if}
              </div>

              <div>
                <label
                  for="managerWhatsapp"
                  class="block text-[13px] font-medium text-black/70"
                  >Tel WhatsApp</label
                >
                <input
                  id="managerWhatsapp"
                  class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                    errors.managerWhatsapp
                      ? "border-red-400"
                      : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  }`}
                  value={formData.managerWhatsapp}
                  inputmode="tel"
                  type="tel"
                  maxlength="15"
                  autocomplete="tel"
                  placeholder="(00) 00000-0000"
                  on:input={(e) =>
                    setField(
                      "managerWhatsapp",
                      formatBrPhone(
                        (e.currentTarget as HTMLInputElement).value,
                      ),
                    )}
                />
                {#if errors.managerWhatsapp}<p
                    class="mt-2 text-[12px] text-red-600"
                  >
                    {errors.managerWhatsapp}
                  </p>{/if}
              </div>

              <div class="md:col-span-2">
                <label
                  for="managerEmail"
                  class="block text-[13px] font-medium text-black/70"
                  >E-mail</label
                >
                <input
                  id="managerEmail"
                  type="email"
                  class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                    errors.managerEmail
                      ? "border-red-400"
                      : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  }`}
                  value={formData.managerEmail}
                  inputmode="email"
                  autocomplete="email"
                  placeholder="nome@exemplo.com"
                  on:input={(e) =>
                    setField(
                      "managerEmail",
                      (e.currentTarget as HTMLInputElement).value,
                    )}
                />
                {#if errors.managerEmail}<p
                    class="mt-2 text-[12px] text-red-600"
                  >
                    {errors.managerEmail}
                  </p>{/if}
              </div>
            </div>

            <div class="mt-10">
              <h3 class="text-[16px] font-semibold text-[var(--primary)]">
                Dados de divulga&ccedil;&atilde;o
              </h3>

              <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label
                    for="marketingSite"
                    class="block text-[13px] font-medium text-black/70"
                    >Site</label
                  >
                  <input
                    id="marketingSite"
                    class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                      errors.marketingSite
                        ? "border-red-400"
                        : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                    }`}
                    value={formData.marketingSite}
                    placeholder="ex: escola.com.br"
                    autocomplete="url"
                    on:input={(e) =>
                      setField(
                        "marketingSite",
                        (e.currentTarget as HTMLInputElement).value,
                      )}
                  />
                  {#if errors.marketingSite}<p
                      class="mt-2 text-[12px] text-red-600"
                    >
                      {errors.marketingSite}
                    </p>{/if}
                </div>

                <div>
                  <label
                    for="marketingInstagram"
                    class="block text-[13px] font-medium text-black/70"
                    >Instagram</label
                  >
                  <input
                    id="marketingInstagram"
                    class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                      errors.marketingInstagram
                        ? "border-red-400"
                        : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                    }`}
                    value={formData.marketingInstagram}
                    placeholder="@suaescola ou instagram.com/suaescola"
                    autocomplete="off"
                    on:input={(e) =>
                      setField(
                        "marketingInstagram",
                        (e.currentTarget as HTMLInputElement).value,
                      )}
                  />
                  {#if errors.marketingInstagram}<p
                      class="mt-2 text-[12px] text-red-600"
                    >
                      {errors.marketingInstagram}
                    </p>{/if}
                </div>

                <div>
                  <label
                    for="marketingFacebook"
                    class="block text-[13px] font-medium text-black/70"
                    >Facebook</label
                  >
                  <input
                    id="marketingFacebook"
                    class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                      errors.marketingFacebook
                        ? "border-red-400"
                        : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                    }`}
                    value={formData.marketingFacebook}
                    placeholder="facebook.com/suaescola"
                    autocomplete="off"
                    on:input={(e) =>
                      setField(
                        "marketingFacebook",
                        (e.currentTarget as HTMLInputElement).value,
                      )}
                  />
                  {#if errors.marketingFacebook}<p
                      class="mt-2 text-[12px] text-red-600"
                    >
                      {errors.marketingFacebook}
                    </p>{/if}
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- =======================
             Etapa 3 â€” Documentos (mÃºltiplos por tipo)
             ======================= -->
        {#if currentStep === 3}
          <div>
            <h2 class="text-[18px] font-semibold text-[var(--primary)]">
              Documentos
            </h2>

            <div
              class="mt-4 rounded-2xl bg-[var(--page-bg)] border border-black/5 p-4"
            >
              <div class="flex items-start gap-3">
                <div class="mt-0.5">
                  <FileText size={18} class="text-[var(--primary)]" />
                </div>
                <div class="text-[13px] text-black/65 space-y-1">
                  <p>
                    Envie os documentos obrigatÃ³rios (vocÃª pode anexar mais de
                    um arquivo por item).
                  </p>
                  <p>Formatos aceitos: PDF, JPG, PNG (atÃ© 2MB por arquivo).</p>
                </div>
              </div>
            </div>

            <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              {#each step3DocTypes as dt (dt)}
                <div
                  class={`rounded-2xl border ${docCardBorderClass(dt)} bg-white p-5`}
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-[14px] font-semibold text-black/80">
                        {docTitle(dt)}
                      </p>
                      <p class="mt-1 text-[12px] text-black/55">
                        {docHint(dt)}
                      </p>
                    </div>

                    {#if docFiles[dt].length > 0}
                      <CheckCircle2 size={18} class="text-[var(--primary)]" />
                    {:else}
                      <XCircle
                        size={18}
                        class={docAttentionByType[dt]
                          ? "text-red-500"
                          : "text-black/25"}
                      />
                    {/if}
                  </div>

                  <div class="mt-4 space-y-2">
                    {#if docFiles[dt].length > 0}
                      {#each docFiles[dt] as uf (uf.id)}
                        <div
                          class="flex items-start justify-between gap-3 rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3"
                        >
                          <div class="min-w-0">
                            <p
                              class="text-[13px] font-semibold text-black/75 truncate"
                            >
                              {uf.file.name}
                            </p>
                            <p class="text-[12px] text-black/50">
                              {formatBytes(uf.file.size)}
                            </p>
                          </div>

                          <button
                            type="button"
                            class="inline-flex items-center justify-center rounded-xl px-3 py-2 text-[12px] font-semibold text-[var(--primary)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/10"
                            on:click={() => removeDocFileById(dt, uf.id)}
                            aria-label="Remover arquivo"
                            title="Remover"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      {/each}
                    {:else}
                      <div
                        class="rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3"
                      >
                        <p class="text-[13px] text-black/55">
                          Nenhum arquivo enviado.
                        </p>
                      </div>
                    {/if}
                  </div>

                  {#if docErrorsByType[dt]}
                    <p class="mt-3 text-[12px] text-red-600">
                      {docErrorsByType[dt]}
                    </p>
                  {/if}

                  <div class="mt-4 flex gap-3">
                    <button
                      type="button"
                      class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold text-white bg-[var(--primary)] hover:brightness-110"
                      on:click={() => openFilePicker(dt)}
                    >
                      <Upload size={16} />
                      {docFiles[dt].length > 0 ? "Adicionar" : "Enviar"}
                    </button>

                    {#if docFiles[dt].length > 0}
                      <button
                        type="button"
                        class="inline-flex items-center justify-center rounded-xl px-4 py-3 text-[13px] font-semibold text-[var(--primary)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/10"
                        on:click={() => clearDocFiles(dt)}
                        aria-label="Remover todos"
                        title="Remover todos"
                      >
                        <Trash2 size={16} />
                      </button>
                    {/if}
                  </div>

                  {#if docFiles[dt].length > 0}
                    <p class="mt-3 text-[12px] text-black/50">
                      {docFiles[dt].length} arquivo(s) anexado(s) â€” limite {maxFilesPerDocType}.
                    </p>
                  {/if}
                </div>
              {/each}
            </div>

            {#if docMessage}
              <p class="mt-4 text-[13px] text-black/70">{docMessage}</p>
            {/if}
          </div>
        {/if}

        <!-- =======================
             Etapa 4 â€” Selfie com documento
             ======================= -->
        {#if currentStep === 4}
          <div>
            <h2 class="text-[18px] font-semibold text-[var(--primary)]">
              Selfie com documento
            </h2>

            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
              <!-- Card 1: instruÃ§Ãµes + status -->
              <div
                class={`rounded-2xl border ${docCardBorderClass("selfie")} bg-white p-5`}
              >
                <div class="flex items-center justify-between gap-3">
                  <p class="text-[14px] font-semibold text-black/80">
                    Como fazer
                  </p>
                  <Camera size={18} class="text-[var(--primary)]" />
                </div>

                <div
                  class="mt-4 rounded-2xl overflow-hidden border border-black/10 bg-black/[0.02]"
                >
                  <img
                    src="/selfie_documento.webp"
                    alt="Exemplo selfie com documento"
                    class="w-full h-auto"
                  />
                </div>

                <ul class="mt-4 text-[13px] text-black/65 space-y-2">
                  <li>â€¢ Ambiente bem iluminado (evite contraluz).</li>
                  <li>
                    â€¢ Segure o documento prÃ³ximo ao rosto, sem cobrir sua face.
                  </li>
                  <li>â€¢ Texto do documento legÃ­vel, sem reflexo ou tremido.</li>
                  <li>â€¢ Olhe para a cÃ¢mera (foto nÃ­tida).</li>
                </ul>

                <div
                  class="mt-4 rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3"
                >
                  {#if docFiles.selfie}
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p
                          class="text-[13px] font-semibold text-black/75 truncate"
                        >
                          {docFiles.selfie.file.name}
                        </p>
                        <p class="text-[12px] text-black/50">
                          {formatBytes(docFiles.selfie.file.size)}
                        </p>
                      </div>

                      <div class="flex items-center gap-2">
                        <CheckCircle2 size={18} class="text-[var(--primary)]" />

                        <button
                          type="button"
                          class="inline-flex items-center justify-center rounded-xl px-3 py-2 text-[12px] font-semibold text-[var(--primary)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/10"
                          on:click={() => removeDocFile("selfie")}
                          aria-label="Remover selfie"
                          title="Remover"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  {:else}
                    <p class="text-[13px] text-black/55">
                      Nenhuma selfie enviada.
                    </p>
                  {/if}
                </div>

                {#if docErrorsByType.selfie}
                  <p class="mt-3 text-[12px] text-red-600">
                    {docErrorsByType.selfie}
                  </p>
                {/if}

                {#if docMessage}
                  <p class="mt-4 text-[13px] text-black/70">{docMessage}</p>
                {/if}
              </div>

              <!-- Card 2: acoes (camera obrigatoria) -->
              <div
                class={`rounded-2xl border ${docCardBorderClass("selfie")} bg-white p-5`}
              >
                <div class="flex items-center justify-between gap-3">
                  <p class="text-[14px] font-semibold text-black/80">
                    Enviar selfie
                  </p>
                  <Camera size={18} class="text-[var(--primary)]" />
                </div>

                <div
                  class="mt-4 rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3"
                >
                  <p class="text-[13px] text-black/65">Tire a selfie pela camera. Upload de arquivo nao e permitido.</p>
                </div>

                <!-- Camera obrigatoria -->
                <div class="mt-4">
                  <button
                    type="button"
                    class="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold text-white bg-[var(--primary)] hover:brightness-110"
                    on:click={openCameraOverlay}
                  >
                    <Camera size={16} />
                    {docFiles.selfie ? "Tirar outra" : "Abrir cÃ¢mera"}
                  </button>
                </div>

                {#if submitMessage}
                  <p class="mt-4 text-[13px] text-black/70">
                    {submitMessage}
                  </p>
                {/if}
              </div>
            </div>
          </div>
        {/if}

        <!-- =======================
     Etapa 5 â€” Contrato e aceite
     ======================= -->
        {#if currentStep === 5}
          <div>
            <h2 class="text-[18px] font-semibold text-[var(--primary)]">
              Contrato e aceite
            </h2>

            <div
              class="mt-4 rounded-2xl bg-[var(--page-bg)] border border-black/5 p-4"
            >
              <p class="text-[13px] text-black/65">
                Leia o contrato abaixo e marque o aceite para finalizar o envio.
              </p>

              <p class="mt-1 text-[12px] text-black/45">
                VersÃ£o termos: {termsPayload.version}
              </p>
            </div>

            <div class="mt-6 rounded-2xl border border-black/10 bg-white p-4 sm:p-6">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="text-[14px] font-semibold text-black/80">
                  {contract.title}
                </p>

                <button
                  type="button"
                  class="text-[12px] font-semibold underline text-[var(--primary)]"
                  on:click={openContractPreviewInNewTab}
                >
                  Abrir em nova aba
                </button>
              </div>

              <div
                class="mt-4 rounded-2xl border border-black/10 bg-[var(--page-bg)] p-3 sm:p-4"
              >
                <label
                  for="contractAccepted"
                  class="flex items-start gap-3 text-[13px] sm:text-[14px] text-black/75"
                >
                  <input
                    id="contractAccepted"
                    type="checkbox"
                    checked={contract.accepted}
                    on:change={(e) =>
                      setContractAccepted(
                        (e.currentTarget as HTMLInputElement).checked,
                      )}
                    class="mt-0.5 h-5 w-5 rounded-md border border-black/30 text-[var(--primary)] accent-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                  />
                  <span>Li e aceito o contrato de adesao.</span>
                </label>

                {#if contract.error}
                  <p class="mt-2 text-[12px] text-red-600">{contract.error}</p>
                {/if}

                {#if contract.acceptedAt}
                  <p class="mt-2 text-[12px] text-black/50">
                    Aceito em: {new Date(contract.acceptedAt).toLocaleString(
                      "pt-BR",
                    )}
                  </p>
                {/if}
              </div>

              <div
                class="mt-4 rounded-2xl border border-black/10 bg-black/[0.02] p-3 sm:p-5 max-h-[70vh] overflow-auto"
              >
                <div class="text-[13px] sm:text-[14px] leading-relaxed text-black/70 font-sans">
                  {@html termsPayload.text}
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- =======================
             AÃ§Ãµes do Wizard
             ======================= -->
        <div
          class="pt-2 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"
        >
          <div class="text-[13px] text-black/65"></div>

          <div class="flex gap-3">
            {#if currentStep > 1}
              <button
                type="button"
                class="rounded-xl px-6 py-3 text-[13px] font-semibold border border-black/15 bg-white hover:bg-black/[0.03]"
                on:click={goBack}
                disabled={isSubmitting}
              >
                Voltar
              </button>
            {/if}

            {#if currentStep < 5}
              <button
                type="button"
                class="rounded-xl px-6 py-3 text-[13px] font-semibold text-white bg-[var(--primary)] hover:brightness-110 disabled:opacity-60"
                on:click={goNext}
                disabled={isSubmitting}
              >
                Pr&oacute;ximo
              </button>
            {:else}
              <button
                type="button"
                class="rounded-xl px-6 py-3 text-[13px] font-semibold text-white bg-[var(--primary)] hover:brightness-110 disabled:opacity-60"
                on:click={handleFinalSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Enviando..." : "Enviar"}
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- =======================
       CÃ¢mera em tela cheia (sem zoom/crop)
       ======================= -->
  {#if cameraOverlayOpen}
    <div class="fixed inset-0 z-[60] bg-black overflow-hidden">
      <div class="h-[100dvh] max-h-[100dvh] w-full flex flex-col">
        <!-- Header fixo -->
        <div
          class="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/60 backdrop-blur"
        >
          <p class="text-white/90 text-[13px] font-semibold">
            {#if pendingSelfie}PrÃ©via{/if}
            {#if !pendingSelfie}CÃ¢mera{/if}
          </p>

          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold text-white/90 border border-white/15 hover:bg-white/10"
            on:click={closeCameraOverlay}
          >
            <X size={16} />
            Cancelar
          </button>
        </div>

        <!-- ConteÃºdo -->
        <div class="relative flex-1 min-h-0 overflow-hidden">
          {#if pendingSelfie}
            <img
              src={pendingSelfie.previewUrl}
              alt="PrÃ©via da selfie"
              class="absolute inset-0 w-full h-full object-contain bg-black"
            />
          {:else}
            <video
              bind:this={videoEl}
              playsinline
              class="absolute inset-0 w-full h-full object-contain bg-black"
            >
              <track kind="captions" />
            </video>

            <canvas bind:this={canvasEl} class="hidden"></canvas>

            {#if !cameraActive}
              <div class="absolute inset-0 flex items-center justify-center">
                <span
                  class="inline-block h-8 w-8 rounded-full border-2 border-white/20 border-t-[var(--primary)] animate-spin"
                ></span>
              </div>
            {/if}
          {/if}

          <!-- Barra inferior -->
          <div
            class="absolute inset-x-0 bottom-0 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] flex items-center justify-center bg-gradient-to-t from-black/70 to-transparent"
          >
            {#if pendingSelfie}
              <div class="w-full max-w-[520px] flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  class="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[14px] font-semibold text-white bg-[var(--primary)] shadow-lg shadow-black/30"
                  on:click={confirmSelfie}
                >
                  <CheckCircle2 size={18} />
                  Usar foto
                </button>

                <button
                  type="button"
                  class="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[14px] font-semibold text-white/90 border border-white/20 hover:bg-white/10"
                  on:click={retakeSelfie}
                >
                  <Camera size={18} />
                  Tirar outra
                </button>

                <button
                  type="button"
                  class="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[14px] font-semibold text-white/90 border border-white/20 hover:bg-white/10"
                  on:click={closeCameraOverlay}
                >
                  <X size={18} />
                  Cancelar
                </button>
              </div>
            {:else}
              <div class="w-full max-w-[420px] flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  class="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[14px] font-semibold text-white bg-[var(--primary)] shadow-lg shadow-black/30 disabled:opacity-60"
                  on:click={captureSelfie}
                  disabled={!cameraActive}
                >
                  <Camera size={18} />
                  Capturar
                </button>

                <button
                  type="button"
                  class="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[14px] font-semibold text-white/90 border border-white/20 hover:bg-white/10"
                  on:click={closeCameraOverlay}
                >
                  <X size={18} />
                  Cancelar
                </button>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</section>
