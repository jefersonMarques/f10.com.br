<script lang="ts">
  import { enhance } from "$app/forms";
  import { onMount } from "svelte";
  import type { SubmitFunction } from "@sveltejs/kit";
  import {
    ArrowLeft,
    Check,
    ChevronRight,
    CircleAlert,
    HelpCircle,
    LoaderCircle,
    LockKeyhole,
    Play,
    RotateCcw,
    Send,
    Sparkles,
    UserRound,
    X,
  } from "lucide-svelte";
  import { trainingMarkupToHtml } from "$lib/help/trainingMarkup";

  type TrainingPlayerStep = {
    id: string;
    title: string;
    question?: string;
    instruction: string;
    expectedResult: string;
    successMessage: string;
    primaryActionLabel: string;
    interactionMode: "presentation" | "action";
    images: Array<{ assetId: string; altText: string }>;
    videoUrl: string | null;
    captionAssetId?: string | null;
  };

  type CustomerUnit = { id: number; name: string };
  type CustomerGroup = { id: number; name: string; units: CustomerUnit[] };

  type TrainingDifficultyAuth = {
    authenticated: boolean;
    name: string;
    email: string;
    groupName: string | null;
    unitName: string | null;
    requiresUnitSelection: boolean;
    groups: CustomerGroup[];
  };

  type DifficultyStage = "login" | "unit" | "detail";
  type InteractionStage = "action" | "verify" | "recovery";
  type DocumentPictureInPictureController = {
    requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
  };

  export let mode: "preview" | "invite" | "public";
  export let trainingTitle: string;
  export let step: TrainingPlayerStep;
  export let assetBasePath: string;
  export let canGoBack = false;
  export let successMessage = "";
  export let failureReported = false;
  export let failureDetail = "";
  export let formMessage = "";
  export let successAction = "";
  export let backAction = "";
  export let failureAction = "";
  export let difficultyAuth: TrainingDifficultyAuth = {
    authenticated: false,
    name: "",
    email: "",
    groupName: null,
    unitName: null,
    requiresUnitSelection: false,
    groups: [],
  };
  export let onAdvance: (() => void) | null = null;
  export let onBack: (() => void) | null = null;
  export let onFailure: ((detail: string) => void) | null = null;

  let preparationConfirmed = false;
  let preparationBlocked = false;
  let interactionStage: InteractionStage = "action";
  let videoOpen = false;
  let difficultyOpen = false;
  let difficultyStage: DifficultyStage = mode === "preview" || difficultyAuth.authenticated
    ? "detail"
    : difficultyAuth.requiresUnitSelection
      ? "unit"
      : "login";
  let difficultyDetail = failureDetail;
  let difficultyMessage = "";
  let ticketNumber: number | null = null;
  let isSubmitting = false;
  let isAuthenticating = false;
  let isOpeningTicket = false;
  let loginEmail = difficultyAuth.email;
  let loginPassword = "";
  let authState: TrainingDifficultyAuth = { ...difficultyAuth };
  let selectedGroupId = authState.groups[0]?.id ?? 0;
  let selectedUnitId = authState.groups[0]?.units[0]?.id ?? 0;
  let trackedStepId = step.id;
  let pipSupported = false;
  let pipOpening = false;
  let pipWindow: Window | null = null;
  let successForm: HTMLFormElement | null = null;
  let backForm: HTMLFormElement | null = null;

  $: if (step.id !== trackedStepId) {
    trackedStepId = step.id;
    interactionStage = "action";
    videoOpen = false;
    difficultyOpen = false;
    difficultyDetail = "";
    difficultyMessage = "";
    ticketNumber = null;
  }

  $: currentImage = step.images[0] ?? null;
  $: selectedUnits = authState.groups.find((group) => group.id === selectedGroupId)?.units ?? [];
  $: videoAssetId = trainingVideoAssetId(step.videoUrl);
  $: videoEmbedUrl = youtubeEmbedUrl(step.videoUrl);
  $: captionUrl = step.captionAssetId
    ? `${assetBasePath}/${step.captionAssetId}`
    : "/help-training-empty.vtt";
  $: verificationQuestion = verificationQuestionForStep(step);

  $: if (pipWindow && !pipWindow.closed) {
    step.id;
    preparationConfirmed;
    preparationBlocked;
    interactionStage;
    formMessage;
    difficultyMessage;
    canGoBack;
    isSubmitting;
    renderPipGuide();
  }

  onMount(() => {
    pipSupported = Boolean(getDocumentPictureInPicture());
    return () => closePipWindow();
  });

  const enhanceNavigation: SubmitFunction = () => {
    if (isSubmitting) return () => undefined;
    isSubmitting = true;
    return async ({ update }) => {
      try {
        await update({ reset: false, invalidateAll: true });
      } finally {
        isSubmitting = false;
      }
    };
  };

  const enhanceFailure: SubmitFunction = ({ formData }) => {
    if (isSubmitting) return () => undefined;
    isSubmitting = true;
    difficultyMessage = "";
    const intent = formData.get("intent") === "ticket" ? "ticket" : "save";
    const detail = typeof formData.get("detail") === "string"
      ? String(formData.get("detail")).trim()
      : "";

    return async ({ result, update }) => {
      try {
        const data = result.type === "success" || result.type === "failure"
          ? result.data as Record<string, unknown> | undefined
          : undefined;
        if (result.type === "failure" && data?.authRequired === true) {
          authState = { ...authState, authenticated: false, requiresUnitSelection: false };
          difficultyStage = "login";
          difficultyMessage = typeof data.message === "string" ? data.message : "Entre com sua conta F10 para continuar.";
          return;
        }
        if (result.type !== "success" || data?.difficultySaved !== true) {
          difficultyMessage = typeof data?.message === "string"
            ? data.message
            : "Não foi possível registrar a dificuldade. Tente novamente.";
          return;
        }

        failureReported = true;
        failureDetail = detail;
        difficultyDetail = detail;
        if (intent === "ticket") {
          await openSupportTicket(detail);
          if (ticketNumber) difficultyOpen = false;
        } else {
          difficultyMessage = "Dificuldade salva. Obrigado por explicar o que aconteceu.";
          difficultyOpen = false;
        }
        await update({ reset: false, invalidateAll: true });
      } finally {
        isSubmitting = false;
      }
    };
  };

  function verificationQuestionForStep(currentStep: TrainingPlayerStep): string {
    const title = currentStep.title.trim().toLocaleLowerCase("pt-BR");
    const question = currentStep.question?.trim() ?? "";
    if (question && question.toLocaleLowerCase("pt-BR") !== title) return question;
    if (currentStep.expectedResult.trim()) return "O resultado esperado abaixo aconteceu no F10?";
    return "Você concluiu esta etapa no F10?";
  }

  function confirmPreparation(): void {
    preparationConfirmed = true;
    preparationBlocked = false;
    interactionStage = "action";
  }

  function startVerification(): void {
    if (!preparationConfirmed || isSubmitting) return;
    interactionStage = "verify";
  }

  function rejectVerification(): void {
    if (isSubmitting) return;
    interactionStage = "recovery";
  }

  function retryAction(): void {
    if (isSubmitting) return;
    interactionStage = "action";
  }

  function trainingVideoAssetId(value: string | null): string | null {
    if (!value?.startsWith("asset:")) return null;
    const assetId = value.slice("asset:".length);
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId)
      ? assetId
      : null;
  }

  function youtubeEmbedUrl(value: string | null): string | null {
    if (!value || value.startsWith("asset:")) return null;
    try {
      const url = new URL(value);
      let id = "";
      if (url.hostname === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? "";
      if (url.hostname.endsWith("youtube.com")) {
        if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
        else if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
          id = url.pathname.split("/")[2] ?? "";
        }
      }
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    } catch {
      return null;
    }
  }

  function getDocumentPictureInPicture(): DocumentPictureInPictureController | null {
    if (typeof window === "undefined") return null;
    const browserWindow = window as Window & {
      documentPictureInPicture?: DocumentPictureInPictureController;
    };
    return browserWindow.documentPictureInPicture ?? null;
  }

  function closePipWindow(): void {
    if (!pipWindow || pipWindow.closed) {
      pipWindow = null;
      return;
    }
    pipWindow.close();
    pipWindow = null;
  }

  async function openPipGuide(): Promise<void> {
    const controller = getDocumentPictureInPicture();
    if (!controller || pipOpening) return;
    pipOpening = true;
    try {
      closePipWindow();
      const availableHeight = typeof window !== "undefined" && Number.isFinite(window.screen?.availHeight)
        ? window.screen.availHeight
        : 760;
      pipWindow = await controller.requestWindow({
        width: 440,
        height: Math.max(640, availableHeight - 32),
      });
      pipWindow.addEventListener("pagehide", () => {
        pipWindow = null;
      }, { once: true });
      renderPipGuide();
    } catch {
      pipWindow = null;
    } finally {
      pipOpening = false;
    }
  }

  function appendPipText(
    documentRef: Document,
    parent: HTMLElement,
    tagName: "p" | "h1" | "strong" | "span",
    className: string,
    value: string,
  ): HTMLElement {
    const element = documentRef.createElement(tagName);
    element.className = className;
    element.textContent = value;
    parent.append(element);
    return element;
  }

  function appendPipMarkup(documentRef: Document, parent: HTMLElement, className: string, value: string): HTMLElement {
    const element = documentRef.createElement("div");
    element.className = className;
    element.innerHTML = trainingMarkupToHtml(value);
    parent.append(element);
    return element;
  }

  function createPipButton(
    documentRef: Document,
    label: string,
    className: string,
    handler: () => void,
    disabled = false,
  ): HTMLButtonElement {
    const button = documentRef.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.disabled = disabled;
    if (!disabled) button.addEventListener("click", handler);
    return button;
  }

  function triggerAdvance(): void {
    if (!preparationConfirmed || interactionStage !== "verify" || isSubmitting) return;
    if (mode === "preview") onAdvance?.();
    else successForm?.requestSubmit();
  }

  function triggerBack(): void {
    if (isSubmitting) return;
    if (interactionStage !== "action") {
      interactionStage = "action";
      return;
    }
    if (!canGoBack) return;
    if (mode === "preview") onBack?.();
    else backForm?.requestSubmit();
  }

  function openDifficultyFromPip(): void {
    closePipWindow();
    try {
      window.focus();
    } catch {
      // O navegador pode impedir foco programático; o modal ainda será aberto na página.
    }
    openDifficulty();
  }

  function openVideoFromPip(): void {
    closePipWindow();
    try {
      window.focus();
    } catch {
      // O navegador pode impedir foco programático; o vídeo ainda será aberto na página.
    }
    videoOpen = true;
  }

  function renderPipGuide(): void {
    if (!pipWindow || pipWindow.closed) return;
    const documentRef = pipWindow.document;
    documentRef.title = `${step.title} | Guia F10`;
    documentRef.head.replaceChildren();
    documentRef.body.replaceChildren();

    const style = documentRef.createElement("style");
    style.textContent = `
      :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#061333;background:#f7f8fb}
      *{box-sizing:border-box}body{margin:0;height:100vh;overflow:hidden;background:#f7f8fb}.guide{height:100vh;display:grid;grid-template-rows:auto minmax(0,1fr) auto}
      .top{display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid #e5e8ef;background:#fff;padding:12px 14px}.brand{display:flex;min-width:0;align-items:center;gap:9px}.logo{font-size:22px;font-weight:900;letter-spacing:-.07em;color:#f36b00}.training{max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;font-weight:700;color:#697187}.help-top{border:1px solid #dfe3ea;background:#f7f8fb;color:#697187;border-radius:999px;min-height:34px;padding:0 10px;font-size:10px;font-weight:700;cursor:pointer}
      .content{overflow-y:auto;padding:22px 18px 28px}.step{font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#f36b00;margin:0 0 8px}.step.warning{color:#b54b00}.title{font-size:27px;line-height:1.08;letter-spacing:-.04em;margin:0;color:#061333}.rich{font-size:15px;line-height:1.6;color:#4f5a70;margin-top:16px}.rich p{margin:0 0 11px}.rich strong{font-weight:850;color:#061333}.rich code{display:inline-block;border-radius:6px;background:#edf0f5;padding:1px 6px;color:#000a57;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em;font-weight:800}.rich ul,.rich ol{margin:8px 0 12px;padding-left:22px}.rich li{margin:6px 0}.verify{margin-top:18px;font-size:20px;line-height:1.3;font-weight:800;color:#061333}.verify p{margin:0}.verify strong{font-weight:900}.verify code{display:inline-block;border-radius:6px;background:#edf0f5;padding:1px 6px;color:#000a57;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em;font-weight:800}.hint{margin-top:16px;padding:13px 14px;border:1px solid #f0cfb4;border-radius:13px;background:#fff5ec;color:#76502d;font-size:12px;line-height:1.55}.hint strong{color:#9f4b0a}.hint .rich{margin:6px 0 0;font-size:12px;color:#76502d}.recovery{margin-top:15px;border-radius:13px;background:#fff0e6;padding:14px;color:#824212;font-size:13px;line-height:1.55}.video-button{width:100%;margin-top:14px;border:1px solid #ffd0ad;background:#fff7f0;color:#b94e00;border-radius:12px;min-height:44px;font-weight:800;cursor:pointer}.footer{display:grid;grid-template-columns:1fr 1.45fr;gap:9px;border-top:1px solid #e5e8ef;background:#fff;padding:12px 14px}.secondary,.danger,.primary{border:0;border-radius:14px;min-height:50px;font-size:12px;font-weight:800;cursor:pointer}.secondary{background:#eef0f5;color:#4e576a}.secondary:disabled{cursor:not-allowed;opacity:.4}.danger{background:#fff0e6;color:#aa4a09}.primary{background:#f36b00;color:#fff;box-shadow:0 12px 28px rgba(243,107,0,.23);animation:float 3.2s ease-in-out infinite}.primary:disabled{cursor:wait;opacity:.6}
      @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@media(prefers-reduced-motion:reduce){.primary{animation:none}}
    `;
    documentRef.head.append(style);

    const root = documentRef.createElement("main");
    root.className = "guide";

    const top = documentRef.createElement("header");
    top.className = "top";
    const brand = documentRef.createElement("div");
    brand.className = "brand";
    appendPipText(documentRef, brand, "strong", "logo", "F10");
    appendPipText(documentRef, brand, "span", "training", trainingTitle);
    top.append(brand);
    if (preparationConfirmed) {
      top.append(createPipButton(documentRef, "Preciso de ajuda", "help-top", openDifficultyFromPip));
    }
    root.append(top);

    const content = documentRef.createElement("section");
    content.className = "content";
    const footer = documentRef.createElement("footer");
    footer.className = "footer";

    if (!preparationConfirmed) {
      appendPipText(documentRef, content, "p", "step", "Antes de começar");
      appendPipText(documentRef, content, "h1", "title", "Você está com o F10 aberto?");
      appendPipText(
        documentRef,
        content,
        "p",
        "rich",
        preparationBlocked
          ? "Abra o F10, faça seu login e deixe a tela principal pronta. Esta trilha só funciona se você executar cada ação junto no sistema."
          : "Você vai executar cada orientação no F10 e confirmar o resultado antes de avançar.",
      );
      if (preparationBlocked) {
        footer.style.gridTemplateColumns = "1fr";
        footer.append(createPipButton(documentRef, "Agora estou com o F10 aberto", "primary", confirmPreparation));
      } else {
        footer.append(createPipButton(documentRef, "Ainda não", "secondary", () => (preparationBlocked = true)));
        footer.append(createPipButton(documentRef, "Sim, está aberto", "primary", confirmPreparation));
      }
    } else if (interactionStage === "action") {
      appendPipText(documentRef, content, "p", "step", "Faça isso agora");
      appendPipText(documentRef, content, "h1", "title", step.title);
      appendPipMarkup(documentRef, content, "rich", step.instruction);
      if (step.videoUrl) content.append(createPipButton(documentRef, "▶ Ver demonstração", "video-button", openVideoFromPip));
      footer.append(createPipButton(documentRef, "← Voltar", "secondary", triggerBack, !canGoBack || isSubmitting));
      footer.append(createPipButton(documentRef, "Já fiz esta etapa", "primary", startVerification, isSubmitting));
    } else if (interactionStage === "verify") {
      appendPipText(documentRef, content, "p", "step", "Confirme antes de continuar");
      appendPipMarkup(documentRef, content, "verify", verificationQuestion);
      if (step.expectedResult.trim()) {
        const hint = documentRef.createElement("div");
        hint.className = "hint";
        const label = documentRef.createElement("strong");
        label.textContent = "Confira no F10:";
        hint.append(label);
        appendPipMarkup(documentRef, hint, "rich", step.expectedResult);
        content.append(hint);
      }
      footer.append(createPipButton(documentRef, "Não", "danger", rejectVerification, isSubmitting));
      footer.append(createPipButton(documentRef, "Sim", "primary", triggerAdvance, isSubmitting));
    } else {
      appendPipText(documentRef, content, "p", "step warning", "Não avance ainda");
      appendPipText(documentRef, content, "h1", "title", "Vamos corrigir esta etapa");
      appendPipText(documentRef, content, "p", "recovery", "Esta etapa precisa estar concluída no F10 antes de continuar. Volte à orientação e tente novamente.");
      if (step.expectedResult.trim()) {
        const hint = documentRef.createElement("div");
        hint.className = "hint";
        const label = documentRef.createElement("strong");
        label.textContent = "O que precisa acontecer:";
        hint.append(label);
        appendPipMarkup(documentRef, hint, "rich", step.expectedResult);
        content.append(hint);
      }
      if (step.videoUrl) content.append(createPipButton(documentRef, "▶ Ver como fazer", "video-button", openVideoFromPip));
      footer.style.gridTemplateColumns = "1fr";
      footer.append(createPipButton(documentRef, "Tentar novamente", "primary", retryAction, isSubmitting));
    }

    root.append(content);
    root.append(footer);
    documentRef.body.append(root);
  }

  function openDifficulty(): void {
    difficultyMessage = "";
    if (mode === "preview") difficultyStage = "detail";
    else if (authState.authenticated) difficultyStage = "detail";
    else if (authState.requiresUnitSelection) difficultyStage = "unit";
    else difficultyStage = "login";
    difficultyOpen = true;
  }

  function apiErrorMessage(code: string): string {
    if (code === "INVALID_CREDENTIALS") return "E-mail ou senha inválidos. Use os mesmos dados que você usa para entrar no F10.";
    if (code === "RATE_LIMITED") return "Foram feitas muitas tentativas. Aguarde alguns minutos e tente novamente.";
    if (code === "UNIT_NOT_AUTHORIZED") return "Essa unidade não está disponível para sua conta.";
    return "Não foi possível concluir a identificação agora. Tente novamente.";
  }

  function parseAuthGroups(value: unknown): CustomerGroup[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((rawGroup) => {
      if (!rawGroup || typeof rawGroup !== "object") return [];
      const group = rawGroup as Record<string, unknown>;
      const id = typeof group.id === "number" ? group.id : 0;
      const name = typeof group.name === "string" ? group.name : "";
      if (!id || !name) return [];
      const units = Array.isArray(group.units)
        ? group.units.flatMap((rawUnit) => {
            if (!rawUnit || typeof rawUnit !== "object") return [];
            const unit = rawUnit as Record<string, unknown>;
            const unitId = typeof unit.id === "number" ? unit.id : 0;
            const unitName = typeof unit.name === "string" ? unit.name : "";
            return unitId && unitName ? [{ id: unitId, name: unitName }] : [];
          })
        : [];
      return [{ id, name, units }];
    });
  }

  function applyAuthPayload(payload: Record<string, unknown>): void {
    const groups = parseAuthGroups(payload.groups);
    authState = {
      authenticated: payload.authenticated === true,
      name: typeof payload.name === "string" ? payload.name : "",
      email: typeof payload.email === "string" ? payload.email : "",
      groupName: typeof payload.groupName === "string" ? payload.groupName : null,
      unitName: typeof payload.unitName === "string" ? payload.unitName : null,
      requiresUnitSelection: payload.requiresUnitSelection === true,
      groups,
    };
    const firstGroup = groups[0];
    selectedGroupId = firstGroup?.id ?? 0;
    selectedUnitId = firstGroup?.units[0]?.id ?? 0;
    difficultyStage = authState.authenticated ? "detail" : "unit";
  }

  async function submitLogin(): Promise<void> {
    if (isAuthenticating || !loginEmail.trim() || !loginPassword) return;
    isAuthenticating = true;
    difficultyMessage = "";
    try {
      const response = await fetch("/api/support/chat/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const payload = await response.json() as Record<string, unknown>;
      loginPassword = "";
      if (!response.ok) {
        difficultyMessage = apiErrorMessage(typeof payload.error === "string" ? payload.error : "");
        return;
      }
      applyAuthPayload(payload);
    } catch {
      difficultyMessage = "Não foi possível entrar agora. Verifique sua conexão e tente novamente.";
    } finally {
      isAuthenticating = false;
    }
  }

  function changeGroup(event: Event): void {
    selectedGroupId = Number((event.currentTarget as HTMLSelectElement).value);
    const group = authState.groups.find((item) => item.id === selectedGroupId);
    selectedUnitId = group?.units[0]?.id ?? 0;
  }

  async function submitUnit(): Promise<void> {
    if (isAuthenticating || !selectedGroupId || !selectedUnitId) return;
    isAuthenticating = true;
    difficultyMessage = "";
    try {
      const response = await fetch("/api/support/chat/auth/unit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: selectedGroupId, unitId: selectedUnitId }),
      });
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok) {
        difficultyMessage = apiErrorMessage(typeof payload.error === "string" ? payload.error : "");
        return;
      }
      applyAuthPayload(payload);
    } catch {
      difficultyMessage = "Não foi possível selecionar a unidade agora. Tente novamente.";
    } finally {
      isAuthenticating = false;
    }
  }

  function submitPreviewDifficulty(): void {
    const detail = difficultyDetail.trim();
    if (detail.length < 3) return;
    onFailure?.(detail);
    failureReported = true;
    failureDetail = detail;
    difficultyOpen = false;
    difficultyMessage = "Dificuldade simulada na prévia.";
  }

  async function openSupportTicket(detail: string): Promise<void> {
    if (isOpeningTicket || ticketNumber) return;
    isOpeningTicket = true;
    difficultyMessage = "";
    const message = [
      `Preciso de ajuda na trilha: ${trainingTitle}.`,
      `Passo: ${step.title}.`,
      `O que aconteceu: ${detail}`,
    ].join("\n");

    try {
      const response = await fetch("/api/support/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "",
          message,
          contextUrl: window.location.href,
          pageTitle: trainingTitle,
          helpContext: `Trilha F10 · ${step.title}`,
          forceHuman: true,
          handoffTranscript: message,
        }),
      });
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok) {
        difficultyMessage = response.status === 401
          ? "Sua identificação expirou. Entre novamente antes de abrir o ticket."
          : "A dificuldade foi salva, mas não foi possível abrir o ticket agora. Você pode tentar novamente.";
        if (response.status === 401) {
          authState = { ...authState, authenticated: false, requiresUnitSelection: false };
          difficultyStage = "login";
        }
        return;
      }

      const createdTicketNumber = typeof payload.ticketNumber === "number" ? payload.ticketNumber : null;
      ticketNumber = createdTicketNumber;
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("f10-support-chat-session-v1", JSON.stringify({
          sessionId: payload.sessionId,
          token: payload.token,
          ticketNumber: payload.ticketNumber,
          expiresAt: payload.expiresAt,
          aiState: payload.aiState,
          entryOptionLabel: payload.entryOptionLabel,
        }));
      }
      difficultyMessage = createdTicketNumber
        ? `Ticket #${createdTicketNumber} aberto. A equipe recebeu o contexto deste passo.`
        : "Ticket aberto. A equipe recebeu o contexto deste passo.";
    } catch {
      difficultyMessage = "A dificuldade foi salva, mas não foi possível abrir o ticket agora. Tente novamente.";
    } finally {
      isOpeningTicket = false;
    }
  }
</script>

<div class="fixed inset-0 z-[80] h-[100dvh] overflow-hidden bg-[#F5F6FA] text-[#061333]">
  <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(234,109,11,0.12),transparent_28%),radial-gradient(circle_at_88%_78%,rgba(0,10,87,0.08),transparent_28%)]"></div>

  <header class="relative z-20 flex min-h-16 items-center justify-between gap-3 border-b border-[#E4E7EE] bg-white/92 px-4 py-2 backdrop-blur sm:px-8 lg:px-[max(2rem,calc((100vw-1120px)/2))]">
    <div class="flex min-w-0 items-center gap-3">
      <span class="text-[28px] font-black tracking-[-0.08em] text-[#F36B00]">F10</span>
      <span class="h-7 w-px bg-[#D9DDE7]"></span>
      <strong class="truncate text-[11px] font-semibold text-[#1E2942] sm:text-[12px]">{trainingTitle}</strong>
    </div>
    {#if preparationConfirmed}
      <div class="flex shrink-0 items-center gap-2">
        {#if pipSupported}
          <button type="button" on:click={() => void openPipGuide()} disabled={pipOpening} class="training-subtle inline-flex min-h-9 items-center gap-2 rounded-full border border-[#FFD1B0] bg-[#FFF7F0] px-3 text-[9px] font-bold text-[#B94E00] disabled:opacity-60">{#if pipOpening}<LoaderCircle size={13} class="animate-spin"/>{:else}<Sparkles size={13}/>{/if}Abrir guia flutuante</button>
        {/if}
        <button type="button" on:click={openDifficulty} class="training-subtle inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#E0E3EA] bg-white px-3 text-[9px] font-semibold text-[#6D7586]"><HelpCircle size={13}/>Preciso de ajuda</button>
      </div>
    {/if}
  </header>

  <main class="relative z-10 h-[calc(100dvh-4rem)] overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
    {#if !preparationConfirmed}
      <section class="mx-auto flex min-h-full w-full max-w-[720px] items-center justify-center py-8 text-center">
        <div class="w-full">
          <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#000A57] text-[12px] font-black text-white">F10</span>
          <p class="mt-7 text-[9px] font-bold uppercase tracking-[0.18em] text-[#F36B00]">Antes de começar</p>
          <h1 class="mx-auto mt-3 max-w-[660px] text-balance text-[34px] font-semibold tracking-[-0.045em] text-[#061333] sm:text-[44px]">Você está com o F10 aberto?</h1>
          {#if preparationBlocked}
            <div class="mx-auto mt-5 max-w-[560px] rounded-2xl border border-[#F2D4BC] bg-[#FFF8F2] px-5 py-4 text-left">
              <strong class="text-[12px] text-[#9D4B0E]">Abra o F10 antes de continuar.</strong>
              <p class="mt-2 text-[12px] leading-6 text-[#71583F]">Faça seu login e deixe a tela principal pronta. Você precisará executar cada ação no sistema e confirmar o resultado antes de avançar.</p>
            </div>
            <button type="button" on:click={confirmPreparation} class="training-primary training-float mt-7 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#F36B00] px-8 text-[12px] font-bold text-white shadow-[0_18px_40px_rgba(243,107,0,0.24)]"><Check size={17}/>Agora estou com o F10 aberto</button>
          {:else}
            <p class="mx-auto mt-4 max-w-[570px] text-[13px] leading-7 text-[#667086]">Esta trilha não é para assistir. Você fará cada ação no F10 e só poderá avançar depois de confirmar o que aconteceu na tela.</p>
            <div class="mx-auto mt-7 grid w-full max-w-[560px] gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
              <button type="button" on:click={() => (preparationBlocked = true)} class="training-subtle inline-flex min-h-14 items-center justify-center rounded-full border border-[#DDE1EA] bg-white px-5 text-[11px] font-semibold text-[#687084]">Ainda não</button>
              <button type="button" on:click={confirmPreparation} class="training-primary training-float inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#F36B00] px-8 text-[12px] font-bold text-white shadow-[0_18px_40px_rgba(243,107,0,0.24)]"><Check size={17}/>Sim, estou com o F10 aberto</button>
            </div>
          {/if}
        </div>
      </section>
    {:else}
      {#key step.id}
        <div class="training-step-enter mx-auto flex min-h-full w-full max-w-[1060px] flex-col items-center justify-center pb-6 text-center">
          {#if interactionStage === "action"}
            <p class="text-[9px] font-bold uppercase tracking-[0.18em] text-[#F36B00]">Faça isso agora</p>
            <h1 class="mt-3 max-w-[900px] text-balance text-[30px] font-semibold tracking-[-0.045em] text-[#061333] sm:text-[40px] lg:text-[46px]">{step.title}</h1>
            <div class="training-rich mt-3 max-w-[760px] text-[13px] leading-6 text-[#5E687E] sm:text-[14px]">{@html trainingMarkupToHtml(step.instruction)}</div>
          {:else if interactionStage === "verify"}
            <p class="text-[9px] font-bold uppercase tracking-[0.18em] text-[#F36B00]">Confirme antes de continuar</p>
            <div class="training-verification-question mt-3 max-w-[760px] text-balance text-[25px] font-semibold leading-[1.2] tracking-[-0.035em] text-[#061333] sm:text-[32px]">{@html trainingMarkupToHtml(verificationQuestion)}</div>
          {:else}
            <p class="text-[9px] font-bold uppercase tracking-[0.18em] text-[#B94E00]">Não avance ainda</p>
            <h1 class="mt-3 max-w-[900px] text-balance text-[30px] font-semibold tracking-[-0.045em] text-[#061333] sm:text-[38px]">Vamos corrigir esta etapa</h1>
            <p class="mt-3 max-w-[720px] text-[13px] leading-6 text-[#5E687E]">Esta ação precisa estar concluída no F10 antes de continuar. Confira o resultado abaixo e tente novamente.</p>
          {/if}

          {#if currentImage}
            <div class="relative mt-5 flex max-h-[48dvh] min-h-[180px] w-full max-w-[900px] items-center justify-center overflow-hidden rounded-[24px] bg-white shadow-[0_22px_60px_rgba(12,23,52,0.09)] ring-1 ring-[#E5E8EF] sm:min-h-[260px]">
              <img src={`${assetBasePath}/${currentImage.assetId}`} alt={currentImage.altText || step.title} class="max-h-[48dvh] w-full object-contain" />
              {#if step.videoUrl && interactionStage === "action"}
                <button type="button" on:click={() => (videoOpen = true)} class="radar-button radar-unseen absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#F36B00] text-white shadow-[0_12px_28px_rgba(243,107,0,0.28)]" aria-label="Ver demonstração" title="Ver demonstração"><Play size={17} fill="currentColor"/></button>
              {/if}
            </div>
          {:else if step.videoUrl && interactionStage === "action"}
            <button type="button" on:click={() => (videoOpen = true)} class="radar-button radar-unseen mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF0E4] text-[#F36B00] ring-8 ring-white shadow-[0_16px_40px_rgba(243,107,0,0.13)]" aria-label="Ver demonstração"><Play size={23}/></button>
          {/if}

          {#if interactionStage !== "action" && step.expectedResult.trim()}
            <div class="mt-4 max-w-[720px] rounded-2xl border border-[#F2D4BC] bg-[#FFF8F2] px-5 py-3 text-left text-[10px] leading-5 text-[#71583F]"><strong class="font-semibold text-[#9D4B0E]">{interactionStage === "verify" ? "Confira no F10:" : "O que precisa acontecer:"}</strong><div class="training-rich mt-1">{@html trainingMarkupToHtml(step.expectedResult)}</div></div>
          {/if}

          {#if interactionStage === "recovery" && step.videoUrl}
            <button type="button" on:click={() => (videoOpen = true)} class="training-subtle mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#FFD1B0] bg-[#FFF7F0] px-5 text-[10px] font-bold text-[#B94E00]"><Play size={14}/>Ver como fazer</button>
          {/if}

          {#if formMessage}
            <div class="mt-4 inline-flex max-w-[680px] items-start gap-2 rounded-xl bg-[#FFF2F2] px-4 py-3 text-left text-[10px] leading-5 text-[#9B2C2C]" role="alert"><CircleAlert size={14} class="mt-0.5 shrink-0"/>{formMessage}</div>
          {/if}
          {#if ticketNumber}
            <div class="mt-4 inline-flex items-center gap-2 rounded-full bg-[#EEF0FF] px-4 py-2 text-[10px] font-semibold text-[#000A57]" role="status"><Send size={14}/>Ticket #{ticketNumber} aberto. A equipe recebeu o contexto.</div>
          {:else if difficultyMessage && !difficultyOpen}
            <div class="mt-4 inline-flex items-center gap-2 rounded-full bg-[#EEF0FF] px-4 py-2 text-[10px] font-semibold text-[#000A57]" role="status"><Check size={14}/>{difficultyMessage}</div>
          {/if}

          {#if interactionStage === "action"}
            <div class="mt-7 grid w-full max-w-[560px] grid-cols-[minmax(0,180px)_minmax(0,1fr)] gap-3">
              {#if canGoBack}
                {#if mode === "preview"}
                  <button type="button" on:click={triggerBack} class="training-subtle inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-[#DDE1EA] bg-white px-5 text-[11px] font-semibold text-[#687084]"><ArrowLeft size={15}/>Voltar</button>
                {:else}
                  <form bind:this={backForm} method="POST" action={backAction} use:enhance={enhanceNavigation}><button type="submit" disabled={isSubmitting} class="training-subtle inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-[#DDE1EA] bg-white px-5 text-[11px] font-semibold text-[#687084] disabled:opacity-50"><ArrowLeft size={15}/>Voltar</button></form>
                {/if}
              {:else}
                <button type="button" disabled class="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-[#E7E9EF] bg-[#F3F4F7] px-5 text-[11px] font-semibold text-[#A6ACB8]"><ArrowLeft size={15}/>Voltar</button>
              {/if}
              <button type="button" on:click={startVerification} disabled={isSubmitting} class="training-primary training-float inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#F36B00] px-8 text-[12px] font-bold text-white shadow-[0_18px_40px_rgba(243,107,0,0.24)] disabled:opacity-60"><Check size={17}/>Já fiz esta etapa</button>
            </div>
          {:else if interactionStage === "verify"}
            <div class="mt-7 grid w-full max-w-[560px] grid-cols-2 gap-3">
              <button type="button" on:click={rejectVerification} disabled={isSubmitting} class="training-subtle inline-flex min-h-14 items-center justify-center rounded-full border border-[#F0CDB3] bg-[#FFF7F0] px-5 text-[11px] font-bold text-[#B94E00] disabled:opacity-50">Não</button>
              {#if mode === "preview"}
                <button type="button" on:click={triggerAdvance} disabled={isSubmitting} class="training-primary training-float inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#F36B00] px-8 text-[12px] font-bold text-white shadow-[0_18px_40px_rgba(243,107,0,0.24)] disabled:opacity-60"><Check size={17}/>Sim</button>
              {:else}
                <form bind:this={successForm} method="POST" action={successAction} use:enhance={enhanceNavigation}><button type="submit" disabled={isSubmitting} class="training-primary training-float inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#F36B00] px-8 text-[12px] font-bold text-white shadow-[0_18px_40px_rgba(243,107,0,0.24)] disabled:cursor-wait disabled:opacity-70">{#if isSubmitting}<LoaderCircle size={16} class="animate-spin"/>{:else}<Check size={17}/>{/if}Sim</button></form>
              {/if}
            </div>
          {:else}
            <div class="mt-7 w-full max-w-[560px]">
              <button type="button" on:click={retryAction} disabled={isSubmitting} class="training-primary training-float inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#F36B00] px-8 text-[12px] font-bold text-white shadow-[0_18px_40px_rgba(243,107,0,0.24)] disabled:opacity-60"><RotateCcw size={16}/>Tentar novamente</button>
            </div>
          {/if}

          {#if pipSupported}
            <p class="mt-5 max-w-[540px] text-[9px] leading-4 text-[#8A91A0]">Dica: use <strong>Abrir guia flutuante</strong> para manter a orientação por cima do F10 enquanto você trabalha.</p>
          {/if}
        </div>
      {/key}
    {/if}
  </main>
</div>

{#if difficultyOpen}
  <div class="fixed inset-0 z-[140] flex items-end justify-center bg-[#07132D]/60 p-3 backdrop-blur-[3px] sm:items-center">
    <div class="w-full max-w-[590px] rounded-[26px] bg-white p-5 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="difficulty-title">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[9px] font-bold uppercase tracking-[0.14em] text-[#F36B00]">Preciso de ajuda</p>
          <h2 id="difficulty-title" class="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-[#061333]">
            {difficultyStage === "login" ? "Primeiro, entre na sua conta F10" : difficultyStage === "unit" ? "Qual unidade você está usando?" : "Conte o que está acontecendo"}
          </h2>
          <p class="mt-2 text-[10px] leading-5 text-[#747C8D]">
            {difficultyStage === "login" ? "Assim conseguimos registrar quem precisa de ajuda e atender a pessoa certa." : difficultyStage === "unit" ? "Escolha a empresa e a unidade desta operação." : "Escreva com suas palavras o que apareceu na tela. Você pode somente registrar ou abrir um ticket para a equipe."}
          </p>
        </div>
        <button type="button" on:click={() => (difficultyOpen = false)} disabled={isSubmitting || isAuthenticating || isOpeningTicket} class="training-subtle flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F4F5F8] text-[#6D7588]" aria-label="Fechar"><X size={16}/></button>
      </div>

      {#if difficultyMessage}
        <div class="mt-4 rounded-xl bg-[#FFF3EA] px-4 py-3 text-[10px] leading-5 text-[#9B4C11]" role="status">{difficultyMessage}</div>
      {/if}

      {#if difficultyStage === "login" && mode !== "preview"}
        <form class="mt-5 space-y-3" on:submit|preventDefault={() => void submitLogin()}>
          <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#4E576C]">E-mail usado no F10</span><input bind:value={loginEmail} type="email" required autocomplete="username" class="h-12 w-full rounded-xl border border-[#DCE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" placeholder="voce@empresa.com.br"/></label>
          <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#4E576C]">Senha do F10</span><input bind:value={loginPassword} type="password" required autocomplete="current-password" class="h-12 w-full rounded-xl border border-[#DCE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" placeholder="Sua senha"/></label>
          <div class="flex items-start gap-2 rounded-xl bg-[#F7F8FB] px-3 py-3 text-[9px] leading-4 text-[#727A8B]"><LockKeyhole size={13} class="mt-0.5 shrink-0"/>A senha é usada somente para validar seu acesso no F10 e não é armazenada neste treinamento.</div>
          <button type="submit" disabled={isAuthenticating} class="training-primary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white disabled:opacity-60">{#if isAuthenticating}<LoaderCircle size={15} class="animate-spin"/>Entrando...{:else}<UserRound size={15}/>Entrar e continuar{/if}</button>
        </form>
      {:else if difficultyStage === "unit" && mode !== "preview"}
        <div class="mt-5 space-y-3">
          <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#4E576C]">Empresa</span><select value={selectedGroupId} on:change={changeGroup} class="h-12 w-full rounded-xl border border-[#DCE1EA] bg-white px-3 text-[11px]"><option value={0}>Selecione</option>{#each authState.groups as group}<option value={group.id}>{group.name}</option>{/each}</select></label>
          <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#4E576C]">Unidade</span><select bind:value={selectedUnitId} class="h-12 w-full rounded-xl border border-[#DCE1EA] bg-white px-3 text-[11px]"><option value={0}>Selecione</option>{#each selectedUnits as unit}<option value={unit.id}>{unit.name}</option>{/each}</select></label>
          <button type="button" on:click={() => void submitUnit()} disabled={isAuthenticating || !selectedGroupId || !selectedUnitId} class="training-primary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white disabled:opacity-60">{#if isAuthenticating}<LoaderCircle size={15} class="animate-spin"/>Confirmando...{:else}Continuar{/if}</button>
        </div>
      {:else if mode === "preview"}
        <div class="mt-5 space-y-4">
          <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#4E576C]">O que aconteceu?</span><textarea bind:value={difficultyDetail} rows="5" minlength="3" maxlength="4000" placeholder="Ex.: cliquei no botão indicado, mas apareceu uma mensagem de erro." class="w-full rounded-xl border border-[#DCE1EA] px-3 py-3 text-[11px] leading-5 outline-none focus:border-[#000A57]"></textarea><span class="mt-1.5 block text-[9px] text-[#8A91A0]">Na prévia nada é salvo. Este campo apenas simula a experiência.</span></label>
          <button type="button" on:click={submitPreviewDifficulty} disabled={difficultyDetail.trim().length < 3} class="training-primary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white disabled:opacity-50">Simular registro<ChevronRight size={15}/></button>
        </div>
      {:else}
        <form method="POST" action={failureAction} use:enhance={enhanceFailure} class="mt-5 space-y-4">
          <div class="flex items-center gap-3 rounded-xl bg-[#F7F8FB] px-3 py-3"><span class="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF0FF] text-[#000A57]"><UserRound size={14}/></span><div class="min-w-0"><strong class="block truncate text-[10px] text-[#30394E]">{authState.name || authState.email}</strong><span class="block truncate text-[9px] text-[#858C9B]">{authState.unitName || authState.groupName || authState.email}</span></div></div>
          <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#4E576C]">O que aconteceu?</span><textarea name="detail" bind:value={difficultyDetail} required rows="5" minlength="3" maxlength="4000" placeholder="Ex.: cliquei em Entrar, mas apareceu a mensagem 'usuário sem permissão'." class="w-full rounded-xl border border-[#DCE1EA] px-3 py-3 text-[11px] leading-5 outline-none focus:border-[#000A57]"></textarea><span class="mt-1.5 block text-[9px] leading-4 text-[#8A91A0]">Diga o que você clicou e o que apareceu na tela. Isso ajuda a equipe a entender sem pedir tudo de novo.</span></label>
          <div class="grid gap-2 sm:grid-cols-2">
            <button type="submit" name="intent" value="save" disabled={isSubmitting || isOpeningTicket || difficultyDetail.trim().length < 3} class="training-subtle inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#D9DEE8] bg-white px-4 text-[11px] font-semibold text-[#000A57] disabled:opacity-50"><Check size={15}/>Apenas registrar</button>
            <button type="submit" name="intent" value="ticket" disabled={isSubmitting || isOpeningTicket || difficultyDetail.trim().length < 3} class="training-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F36B00] px-4 text-[11px] font-semibold text-white shadow-[0_12px_28px_rgba(243,107,0,0.20)] disabled:opacity-50">{#if isSubmitting || isOpeningTicket}<LoaderCircle size={15} class="animate-spin"/>{:else}<Send size={15}/>{/if}Registrar e abrir ticket</button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

{#if videoOpen && step.videoUrl}
  <div class="fixed inset-0 z-[150] flex items-center justify-center bg-[#07132D]/92 p-3 sm:p-6">
    <div class="relative w-full max-w-[1120px] overflow-hidden rounded-[24px] bg-[#07132D] shadow-2xl" role="dialog" aria-modal="true" aria-label="Demonstração">
      <div class="flex items-center justify-between gap-3 px-4 py-3 text-white sm:px-5"><div><p class="text-[8px] font-bold uppercase tracking-[0.12em] text-[#FF9A4B]">Demonstração</p><strong class="mt-1 block text-[11px]">{step.title}</strong></div><button type="button" on:click={() => (videoOpen = false)} class="training-subtle flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white" aria-label="Fechar demonstração"><X size={16}/></button></div>
      {#if videoAssetId}
        <video src={`${assetBasePath}/${videoAssetId}`} controls autoplay preload="metadata" playsinline class="max-h-[80dvh] w-full bg-black"><track kind="captions" srclang="pt-BR" label="Português" src={captionUrl} default /></video>
      {:else if videoEmbedUrl}
        <iframe src={videoEmbedUrl} title="Demonstração" class="aspect-video max-h-[80dvh] w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      {:else}
        <div class="flex min-h-[260px] items-center justify-center p-8"><a href={step.videoUrl} target="_blank" rel="noopener noreferrer" class="training-primary inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-[11px] font-semibold text-[#000A57]"><Play size={16}/>Abrir demonstração</a></div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .training-primary,
  .training-subtle,
  .radar-button {
    transition: transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease, color 180ms ease, opacity 180ms ease;
  }

  .training-subtle:not(:disabled):hover,
  .radar-button:not(:disabled):hover {
    transform: translateY(-2px);
  }

  .training-primary:not(:disabled):active,
  .training-subtle:not(:disabled):active,
  .radar-button:not(:disabled):active {
    transform: translateY(1px) scale(0.98);
  }

  .training-float {
    animation: training-float 3.2s ease-in-out infinite;
  }

  .training-step-enter {
    animation: training-step-enter 260ms ease both;
  }

  :global(.training-rich p) {
    margin: 0.28rem 0;
  }

  :global(.training-rich strong),
  :global(.training-verification-question strong) {
    font-weight: 800;
    color: #061333;
  }

  :global(.training-rich code),
  :global(.training-verification-question code) {
    display: inline-block;
    border-radius: 0.38rem;
    background: #edf0f5;
    padding: 0.02rem 0.38rem;
    color: #000a57;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.92em;
    font-weight: 800;
  }

  :global(.training-verification-question p) {
    margin: 0;
  }

  :global(.training-rich ul),
  :global(.training-rich ol) {
    margin: 0.45rem auto;
    width: fit-content;
    max-width: 100%;
    padding-left: 1.4rem;
    text-align: left;
  }

  :global(.training-rich li) {
    margin: 0.2rem 0;
  }

  .radar-unseen::before,
  .radar-unseen::after {
    content: "";
    position: absolute;
    inset: -2px;
    border: 2px solid rgba(243, 107, 0, 0.34);
    border-radius: 9999px;
    animation: training-radar 2s ease-out infinite;
    pointer-events: none;
  }

  .radar-unseen::after { animation-delay: 1s; }

  @keyframes training-float {
    0%, 100% { transform: translateY(0); box-shadow: 0 18px 40px rgba(243, 107, 0, 0.22); }
    50% { transform: translateY(-5px); box-shadow: 0 24px 46px rgba(243, 107, 0, 0.30); }
  }

  @keyframes training-radar {
    0% { opacity: 0.7; transform: scale(0.9); }
    75%, 100% { opacity: 0; transform: scale(1.75); }
  }

  @keyframes training-step-enter {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .training-primary,
    .training-subtle,
    .radar-button,
    .training-float,
    .training-step-enter,
    .radar-unseen::before,
    .radar-unseen::after {
      animation: none !important;
      transition: none !important;
    }
  }
</style>
