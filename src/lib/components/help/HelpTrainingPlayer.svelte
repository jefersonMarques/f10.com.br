<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import {
    ArrowLeft,
    Check,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    HelpCircle,
    LoaderCircle,
    LockKeyhole,
    Play,
    Send,
    Sparkles,
    UserRound,
    X,
  } from "lucide-svelte";

  export type TrainingPlayerStep = {
    id: string;
    title: string;
    question: string;
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

  export type TrainingDifficultyAuth = {
    authenticated: boolean;
    name: string;
    email: string;
    groupName: string | null;
    unitName: string | null;
    requiresUnitSelection: boolean;
    groups: CustomerGroup[];
  };

  type DifficultyStage = "login" | "unit" | "detail";

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

  let imageIndex = 0;
  let videoOpen = false;
  let videoSeen = false;
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

  $: if (step.id !== trackedStepId) {
    trackedStepId = step.id;
    imageIndex = 0;
    videoOpen = false;
    videoSeen = false;
    difficultyOpen = false;
    difficultyDetail = "";
    difficultyMessage = "";
    ticketNumber = null;
  }

  $: currentImage = step.images[imageIndex] ?? null;
  $: selectedUnits = authState.groups.find((group) => group.id === selectedGroupId)?.units ?? [];
  $: videoAssetId = trainingVideoAssetId(step.videoUrl);
  $: videoEmbedUrl = youtubeEmbedUrl(step.videoUrl);
  $: captionUrl = step.captionAssetId
    ? `${assetBasePath}/${step.captionAssetId}`
    : "/help-training-empty.vtt";

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

  function showPreviousImage(): void {
    imageIndex = imageIndex <= 0 ? step.images.length - 1 : imageIndex - 1;
  }

  function showNextImage(): void {
    imageIndex = imageIndex + 1 >= step.images.length ? 0 : imageIndex + 1;
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
      `Orientação: ${step.question || step.title}.`,
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
          helpContext: `Trilha F10 · ${step.question || step.title}`,
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
        ? `Ticket #${createdTicketNumber} aberto. A equipe recebeu o contexto desta orientação.`
        : "Ticket aberto. A equipe recebeu o contexto desta orientação.";
    } catch {
      difficultyMessage = "A dificuldade foi salva, mas não foi possível abrir o ticket agora. Tente novamente.";
    } finally {
      isOpeningTicket = false;
    }
  }
</script>

<div class="fixed inset-0 z-[80] h-[100dvh] overflow-hidden bg-[#F5F6FA] text-[#061333]">
  <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(234,109,11,0.12),transparent_28%),radial-gradient(circle_at_88%_78%,rgba(0,10,87,0.08),transparent_28%)]"></div>

  <header class="relative z-20 flex h-16 items-center justify-between border-b border-[#E4E7EE] bg-white/92 px-4 backdrop-blur sm:px-8 lg:px-[max(2rem,calc((100vw-1120px)/2))]">
    <div class="flex min-w-0 items-center gap-3">
      <span class="text-[28px] font-black tracking-[-0.08em] text-[#F36B00]">F10</span>
      <span class="h-7 w-px bg-[#D9DDE7]"></span>
      <strong class="truncate text-[11px] font-semibold text-[#1E2942] sm:text-[12px]">{trainingTitle}</strong>
    </div>
    {#if canGoBack}
      {#if mode === "preview"}
        <button type="button" on:click={() => onBack?.()} class="training-subtle inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-[10px] font-semibold text-[#687084]"><ArrowLeft size={15}/>Voltar</button>
      {:else}
        <form method="POST" action={backAction} use:enhance={enhanceNavigation}><button type="submit" disabled={isSubmitting} class="training-subtle inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-[10px] font-semibold text-[#687084]"><ArrowLeft size={15}/>Voltar</button></form>
      {/if}
    {/if}
  </header>

  <main class="relative z-10 h-[calc(100dvh-4rem)] overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
    {#key step.id}
      <div class="training-step-enter mx-auto flex min-h-full w-full max-w-[1180px] flex-col items-center justify-center pb-6 text-center">
        {#if currentImage}
          <div class="relative mb-5 flex max-h-[43dvh] min-h-[180px] w-full max-w-[900px] items-center justify-center overflow-hidden rounded-[24px] bg-white shadow-[0_22px_60px_rgba(12,23,52,0.09)] ring-1 ring-[#E5E8EF] sm:min-h-[260px]">
            <img src={`${assetBasePath}/${currentImage.assetId}`} alt={currentImage.altText || step.title} class="max-h-[43dvh] w-full object-contain" />
            {#if step.images.length > 1}
              <button type="button" on:click={showPreviousImage} class="training-subtle absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#000A57] shadow-lg" aria-label="Imagem anterior"><ChevronLeft size={18}/></button>
              <button type="button" on:click={showNextImage} class="training-subtle absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#000A57] shadow-lg" aria-label="Próxima imagem"><ChevronRight size={18}/></button>
            {/if}
            {#if step.videoUrl}
              <button type="button" on:click={() => { videoSeen = true; videoOpen = true; }} class:radar-unseen={!videoSeen} class="radar-button absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#F36B00] text-white shadow-[0_12px_28px_rgba(243,107,0,0.28)]" aria-label="Ver demonstração rápida" title="Ver demonstração rápida"><Play size={17} fill="currentColor"/></button>
            {/if}
          </div>
        {:else if step.videoUrl}
          <button type="button" on:click={() => { videoSeen = true; videoOpen = true; }} class:radar-unseen={!videoSeen} class="radar-button mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF0E4] text-[#F36B00] ring-8 ring-white shadow-[0_16px_40px_rgba(243,107,0,0.13)]" aria-label="Ver demonstração rápida"><Play size={23}/></button>
        {:else}
          <span class="mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#FFF0E4] text-[#F36B00] ring-8 ring-white shadow-[0_16px_40px_rgba(243,107,0,0.10)]"><Sparkles size={23}/></span>
        {/if}

        <p class="text-[9px] font-bold uppercase tracking-[0.18em] text-[#F36B00]">{step.title}</p>
        <h1 class="mt-3 max-w-[940px] text-balance text-[28px] font-semibold tracking-[-0.045em] text-[#061333] sm:text-[38px] lg:text-[44px]">{step.question || step.title}</h1>
        <p class="mt-3 max-w-[760px] whitespace-pre-line text-[12px] leading-6 text-[#667087] sm:text-[13px]">{step.instruction}</p>
        {#if step.expectedResult}
          <div class="mt-4 max-w-[720px] rounded-2xl border border-[#DDE2EC] bg-white/85 px-5 py-3 text-[10px] leading-5 text-[#4F596F] shadow-sm"><strong class="font-semibold text-[#061333]">O que você deve ver:</strong> {step.expectedResult}</div>
        {/if}

        {#if successMessage}
          <div class="mt-4 inline-flex items-center gap-2 rounded-full bg-[#EAF8F1] px-4 py-2 text-[10px] font-semibold text-[#23714A]" role="status"><Check size={14}/>{successMessage}</div>
        {/if}
        {#if formMessage}
          <div class="mt-4 inline-flex max-w-[680px] items-start gap-2 rounded-xl bg-[#FFF2F2] px-4 py-3 text-left text-[10px] leading-5 text-[#9B2C2C]" role="alert"><CircleAlert size={14} class="mt-0.5 shrink-0"/>{formMessage}</div>
        {/if}
        {#if ticketNumber}
          <div class="mt-4 inline-flex items-center gap-2 rounded-full bg-[#EEF0FF] px-4 py-2 text-[10px] font-semibold text-[#000A57]" role="status"><Send size={14}/>Ticket #{ticketNumber} aberto. A equipe recebeu o contexto.</div>
        {:else if difficultyMessage && !difficultyOpen}
          <div class="mt-4 inline-flex items-center gap-2 rounded-full bg-[#EEF0FF] px-4 py-2 text-[10px] font-semibold text-[#000A57]" role="status"><Check size={14}/>{difficultyMessage}</div>
        {/if}

        <div class="mt-7 flex w-full max-w-[640px] flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {#if mode === "preview"}
            <button type="button" on:click={() => onAdvance?.()} class="training-primary training-float inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#F36B00] px-7 text-[12px] font-bold text-white shadow-[0_18px_40px_rgba(243,107,0,0.24)] sm:w-auto sm:min-w-[280px]">{step.primaryActionLabel || "Entendi, continuar"}<ChevronRight size={17}/></button>
          {:else}
            <form method="POST" action={successAction} use:enhance={enhanceNavigation} class="w-full sm:w-auto"><button type="submit" disabled={isSubmitting} class="training-primary training-float inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#F36B00] px-7 text-[12px] font-bold text-white shadow-[0_18px_40px_rgba(243,107,0,0.24)] disabled:cursor-wait disabled:opacity-70 sm:min-w-[280px]">{#if isSubmitting}<LoaderCircle size={16} class="animate-spin"/>{/if}{step.primaryActionLabel || "Entendi, continuar"}<ChevronRight size={17}/></button></form>
          {/if}
          <button type="button" on:click={openDifficulty} class="training-subtle inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-[#F36B00] bg-white/80 px-6 text-[11px] font-semibold text-[#C75200] sm:w-auto sm:min-w-[210px]"><HelpCircle size={16}/>Não consegui</button>
        </div>
      </div>
    {/key}
  </main>
</div>

{#if difficultyOpen}
  <div class="fixed inset-0 z-[140] flex items-end justify-center bg-[#07132D]/60 p-3 backdrop-blur-[3px] sm:items-center">
    <div class="w-full max-w-[590px] rounded-[26px] bg-white p-5 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="difficulty-title">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[9px] font-bold uppercase tracking-[0.14em] text-[#F36B00]">Não consegui</p>
          <h2 id="difficulty-title" class="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-[#061333]">
            {difficultyStage === "login" ? "Primeiro, entre na sua conta F10" : difficultyStage === "unit" ? "Qual unidade você está usando?" : "Explique onde você travou"}
          </h2>
          <p class="mt-2 text-[10px] leading-5 text-[#747C8D]">
            {difficultyStage === "login" ? "Assim conseguimos registrar quem encontrou a dificuldade e ajudar a pessoa certa." : difficultyStage === "unit" ? "Escolha a empresa e a unidade desta operação." : "Descreva com suas palavras o que apareceu na tela. Você pode somente salvar ou abrir um ticket para a equipe."}
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
          <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#4E576C]">O que aconteceu?</span><textarea name="detail" bind:value={difficultyDetail} required rows="5" minlength="3" maxlength="4000" placeholder="Ex.: cliquei em Entrar, mas apareceu a mensagem 'usuário sem permissão'." class="w-full rounded-xl border border-[#DCE1EA] px-3 py-3 text-[11px] leading-5 outline-none focus:border-[#000A57]"></textarea><span class="mt-1.5 block text-[9px] leading-4 text-[#8A91A0]">Tente dizer o que você clicou e o que apareceu na tela. Isso ajuda muito mais do que apenas dizer “deu erro”.</span></label>
          <div class="grid gap-2 sm:grid-cols-2">
            <button type="submit" name="intent" value="save" disabled={isSubmitting || isOpeningTicket || difficultyDetail.trim().length < 3} class="training-subtle inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#D9DEE8] bg-white px-4 text-[11px] font-semibold text-[#000A57] disabled:opacity-50"><Check size={15}/>Apenas salvar</button>
            <button type="submit" name="intent" value="ticket" disabled={isSubmitting || isOpeningTicket || difficultyDetail.trim().length < 3} class="training-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F36B00] px-4 text-[11px] font-semibold text-white shadow-[0_12px_28px_rgba(243,107,0,0.20)] disabled:opacity-50">{#if isSubmitting || isOpeningTicket}<LoaderCircle size={15} class="animate-spin"/>{:else}<Send size={15}/>{/if}Abrir ticket</button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

{#if videoOpen && step.videoUrl}
  <div class="fixed inset-0 z-[150] flex items-center justify-center bg-[#07132D]/92 p-3 sm:p-6">
    <div class="relative w-full max-w-[1120px] overflow-hidden rounded-[24px] bg-[#07132D] shadow-2xl" role="dialog" aria-modal="true" aria-label="Demonstração rápida">
      <div class="flex items-center justify-between gap-3 px-4 py-3 text-white sm:px-5"><div><p class="text-[8px] font-bold uppercase tracking-[0.12em] text-[#FF9A4B]">Demonstração rápida</p><strong class="mt-1 block text-[11px]">{step.title}</strong></div><button type="button" on:click={() => (videoOpen = false)} class="training-subtle flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white" aria-label="Fechar demonstração"><X size={16}/></button></div>
      {#if videoAssetId}
        <video src={`${assetBasePath}/${videoAssetId}`} controls autoplay preload="metadata" playsinline class="max-h-[80dvh] w-full bg-black"><track kind="captions" srclang="pt-BR" label="Português" src={captionUrl} default /></video>
      {:else if videoEmbedUrl}
        <iframe src={videoEmbedUrl} title="Demonstração rápida" class="aspect-video max-h-[80dvh] w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
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

  .training-primary:not(:disabled):hover,
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
