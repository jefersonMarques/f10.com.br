<script lang="ts">
  import { enhance } from "$app/forms";
  import { onMount } from "svelte";
  import type { SubmitFunction } from "@sveltejs/kit";
  import {
    ArrowLeft,
    Check,
    CircleAlert,
    HelpCircle,
    LoaderCircle,
    Play,
    RotateCcw,
    Send,
    Sparkles,
    X,
  } from "lucide-svelte";
  import { claimTrainingPipWindow, trainingPipSupported } from "$lib/help/trainingPipBridge";
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
    videoStartSeconds: number;
    images: Array<{ assetId: string; altText: string }>;
    videoUrl: string | null;
  };

  type InteractionStage = "action" | "verify" | "recovery";
  type DocumentPictureInPictureController = {
    requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
  };

  export let mode: "preview" | "invite" | "public";
  export let trainingTitle: string;
  export let sourceContentSlug: string;
  export let step: TrainingPlayerStep;
  export let assetBasePath: string;
  export let canGoBack = false;
  export let successMessage = "";
  export let formMessage = "";
  export let successAction = "";
  export let backAction = "";
  export let onAdvance: (() => void) | null = null;
  export let onBack: (() => void) | null = null;

  let preparationConfirmed = false;
  let preparationBlocked = false;
  let interactionStage: InteractionStage = "action";
  let trackedStepId = step.id;

  let pipSupported = false;
  let pipOpening = false;
  let pipWindow: Window | null = null;
  let fallbackOpen = false;

  let videoOpen = false;
  let videoElement: HTMLVideoElement | null = null;
  let successForm: HTMLFormElement | null = null;
  let backForm: HTMLFormElement | null = null;
  let isSubmitting = false;

  let tutorOpen = false;
  let tutorQuestion = "";
  let tutorAnswer = "";
  let tutorLoading = false;
  let tutorContext = "";

  $: currentImage = step.images[0] ?? null;
  $: videoAssetId = trainingVideoAssetId(step.videoUrl);
  $: videoEmbedUrl = youtubeEmbedUrl(step.videoUrl, step.videoStartSeconds);
  $: verificationQuestion = verificationQuestionForStep(step);

  $: if (step.id !== trackedStepId) {
    trackedStepId = step.id;
    interactionStage = "action";
    tutorOpen = false;
    tutorQuestion = "";
    tutorAnswer = "";
    tutorContext = "";
    videoOpen = false;
    if (pipWindow && !pipWindow.closed) renderGuide();
  }

  $: if (pipWindow && !pipWindow.closed) {
    step.id;
    preparationConfirmed;
    preparationBlocked;
    interactionStage;
    canGoBack;
    isSubmitting;
    successMessage;
    formMessage;
    tutorOpen;
    tutorAnswer;
    tutorLoading;
    renderGuide();
  }

  onMount(() => {
    pipSupported = trainingPipSupported();
    const pending = claimTrainingPipWindow();
    if (pending) {
      void pending.then((claimed) => {
        if (claimed) adoptPipWindow(claimed);
        else fallbackOpen = true;
      });
    }
    return () => {
      if (pipWindow && !pipWindow.closed) pipWindow.close();
    };
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

  function trainingVideoAssetId(value: string | null): string | null {
    if (!value?.startsWith("asset:")) return null;
    const id = value.slice("asset:".length);
    return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  }

  function youtubeEmbedUrl(value: string | null, startSeconds: number): string | null {
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
      return id
        ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&start=${Math.max(0, Math.round(startSeconds || 0))}`
        : null;
    } catch {
      return null;
    }
  }

  function getDocumentPictureInPicture(): DocumentPictureInPictureController | null {
    if (typeof window === "undefined") return null;
    return (window as Window & {
      documentPictureInPicture?: DocumentPictureInPictureController;
    }).documentPictureInPicture ?? null;
  }

  function adoptPipWindow(windowRef: Window): void {
    pipWindow = windowRef;
    fallbackOpen = false;
    pipWindow.addEventListener("pagehide", () => {
      pipWindow = null;
    }, { once: true });
    renderGuide();
  }

  async function openGuide(): Promise<void> {
    const controller = getDocumentPictureInPicture();
    if (!controller || pipOpening) {
      fallbackOpen = true;
      return;
    }
    pipOpening = true;
    try {
      const availableHeight = Number.isFinite(window.screen?.availHeight)
        ? window.screen.availHeight
        : 760;
      const opened = await controller.requestWindow({
        width: 440,
        height: Math.max(640, availableHeight - 32),
      });
      adoptPipWindow(opened);
    } catch {
      fallbackOpen = true;
    } finally {
      pipOpening = false;
    }
  }

  function closeGuideWindow(): void {
    if (pipWindow && !pipWindow.closed) pipWindow.close();
    pipWindow = null;
  }

  function openVideo(): void {
    closeGuideWindow();
    fallbackOpen = false;
    videoOpen = true;
    window.setTimeout(() => {
      if (videoElement) {
        try {
          videoElement.currentTime = Math.max(0, step.videoStartSeconds || 0);
        } catch {
          // O navegador pode recusar seek antes dos metadados; loadedmetadata repete o ajuste.
        }
      }
    }, 80);
  }

  function formatSeconds(value: number): string {
    const seconds = Math.max(0, Math.round(value || 0));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  async function askTutor(value: string): Promise<void> {
    const question = value.trim();
    if (question.length < 3 || tutorLoading) return;
    tutorLoading = true;
    tutorQuestion = question;
    tutorAnswer = "";
    try {
      const response = await fetch(mode === "preview" ? "/api/help/ask" : "/api/training/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "preview"
            ? {
                question,
                scope: "article",
                articleSlug: sourceContentSlug,
                conversationContext: tutorContext,
              }
            : {
                question,
                conversationContext: tutorContext,
              },
        ),
      });
      const payload = await response.json() as { answer?: string; error?: string };
      tutorAnswer = response.ok && payload.answer
        ? payload.answer
        : payload.error === "AUTH_REQUIRED" || payload.error === "TRAINING_SESSION_REQUIRED"
          ? "A sessão da trilha expirou. Abra novamente a trilha para continuar."
          : "O tutor não está disponível agora.";
      if (response.ok && payload.answer) {
        tutorContext = `${tutorContext}\nCliente: ${question}\nTutor: ${payload.answer}`
          .trim()
          .slice(-5000);
      }
    } catch {
      tutorAnswer = "O tutor não está disponível agora.";
    } finally {
      tutorLoading = false;
      if (pipWindow && !pipWindow.closed) renderGuide();
    }
  }

  function appendText(
    doc: Document,
    parent: HTMLElement,
    tag: "p" | "h1" | "strong" | "span",
    className: string,
    value: string,
  ): HTMLElement {
    const element = doc.createElement(tag);
    element.className = className;
    element.textContent = value;
    parent.append(element);
    return element;
  }

  function appendMarkup(doc: Document, parent: HTMLElement, className: string, value: string): HTMLElement {
    const element = doc.createElement("div");
    element.className = className;
    element.innerHTML = trainingMarkupToHtml(value);
    parent.append(element);
    return element;
  }

  function guideButton(
    doc: Document,
    label: string,
    className: string,
    handler: () => void,
    disabled = false,
  ): HTMLButtonElement {
    const element = doc.createElement("button");
    element.type = "button";
    element.className = className;
    element.textContent = label;
    element.disabled = disabled;
    if (!disabled) element.addEventListener("click", handler);
    return element;
  }

  function appendTutor(doc: Document, content: HTMLElement): void {
    if (!tutorOpen) return;
    const tutor = doc.createElement("div");
    tutor.className = "tutor";
    appendText(doc, tutor, "strong", "tutor-title", "Tutor desta trilha");
    if (tutorLoading) {
      appendText(doc, tutor, "p", "tutor-answer", "Consultando o conteúdo publicado...");
    } else if (tutorAnswer) {
      appendText(doc, tutor, "p", "tutor-answer", tutorAnswer);
    }

    const textarea = doc.createElement("textarea");
    textarea.placeholder = "Ex.: onde encontro esse botão?";
    textarea.value = tutorQuestion;
    tutor.append(textarea);
    tutor.append(guideButton(
      doc,
      "Perguntar",
      "tutor-send",
      () => void askTutor(textarea.value),
      tutorLoading,
    ));
    content.append(tutor);
  }

  function renderGuide(): void {
    if (!pipWindow || pipWindow.closed) return;
    const doc = pipWindow.document;
    doc.title = `${step.title} | Trilha F10`;
    doc.head.replaceChildren();
    doc.body.replaceChildren();

    const style = doc.createElement("style");
    style.textContent = `
      :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#061333;background:#f7f8fb}
      *{box-sizing:border-box}body{margin:0;height:100vh;overflow:hidden;background:#f7f8fb}.guide{height:100vh;display:grid;grid-template-rows:auto minmax(0,1fr) auto}
      .top{display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #e5e8ef;background:#fff;padding:12px 14px}.brand{display:flex;min-width:0;align-items:center;gap:9px}.logo{font-size:22px;font-weight:900;letter-spacing:-.07em;color:#f36b00}.training{max-width:175px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;font-weight:700;color:#697187}.help{border:1px solid #dfe3ea;background:#f7f8fb;color:#697187;border-radius:999px;min-height:34px;padding:0 10px;font-size:10px;font-weight:700;cursor:pointer}
      .content{overflow-y:auto;padding:22px 18px 28px}.eyebrow{font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#f36b00;margin:0 0 8px}.eyebrow.warning{color:#b54b00}.title{font-size:27px;line-height:1.08;letter-spacing:-.04em;margin:0;color:#061333}.rich{font-size:15px;line-height:1.6;color:#4f5a70;margin-top:16px}.rich p{margin:0 0 11px}.rich strong{font-weight:850;color:#061333}.rich code{display:inline-block;border-radius:6px;background:#edf0f5;padding:1px 6px;color:#000a57;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em;font-weight:800}.rich ul,.rich ol{margin:8px 0 12px;padding-left:22px}.rich li{margin:6px 0}.verify{margin-top:15px;font-size:20px;line-height:1.3;font-weight:800;color:#061333}.hint{margin-top:16px;padding:13px 14px;border:1px solid #f0cfb4;border-radius:13px;background:#fff5ec;color:#76502d;font-size:12px;line-height:1.55}.hint strong{color:#9f4b0a}.hint .rich{margin:6px 0 0;font-size:12px;color:#76502d}.recovery{margin-top:15px;border-radius:13px;background:#fff0e6;padding:14px;color:#824212;font-size:13px;line-height:1.55}.success{margin-top:14px;border-radius:12px;background:#eef8f1;padding:10px 12px;color:#2f7045;font-size:10px;font-weight:700}.error{margin-top:14px;border-radius:12px;background:#fff2f2;padding:10px 12px;color:#9b2c2c;font-size:10px}.video{width:100%;margin-top:14px;border:1px solid #ffd0ad;background:#fff7f0;color:#b94e00;border-radius:12px;min-height:44px;font-weight:800;cursor:pointer}
      .tutor{margin-top:18px;border-top:1px solid #e7eaf1;padding-top:14px}.tutor-title{font-size:10px;color:#000a57}.tutor-answer{margin-top:9px;border-radius:12px;background:#fff;padding:11px;font-size:11px;line-height:1.55;color:#4f586d}.tutor textarea{margin-top:9px;width:100%;min-height:72px;resize:vertical;border:1px solid #dce1ea;border-radius:11px;padding:9px;font:inherit;font-size:11px}.tutor-send{margin-top:7px;width:100%;min-height:38px;border:0;border-radius:10px;background:#000a57;color:#fff;font-size:10px;font-weight:800;cursor:pointer}.tutor-send:disabled{opacity:.5}
      .footer{display:grid;grid-template-columns:1fr 1.45fr;gap:9px;border-top:1px solid #e5e8ef;background:#fff;padding:12px 14px}.secondary,.danger,.primary{border:0;border-radius:14px;min-height:50px;font-size:12px;font-weight:800;cursor:pointer}.secondary{background:#eef0f5;color:#4e576a}.secondary:disabled{opacity:.4}.danger{background:#fff0e6;color:#aa4a09}.primary{background:#f36b00;color:#fff;box-shadow:0 12px 28px rgba(243,107,0,.23)}.primary:disabled{opacity:.55}
    `;
    doc.head.append(style);

    const root = doc.createElement("main");
    root.className = "guide";

    const top = doc.createElement("header");
    top.className = "top";
    const brand = doc.createElement("div");
    brand.className = "brand";
    appendText(doc, brand, "strong", "logo", "F10");
    appendText(doc, brand, "span", "training", trainingTitle);
    top.append(brand);
    if (preparationConfirmed) {
      top.append(guideButton(
        doc,
        tutorOpen ? "Fechar dúvida" : "Dúvida?",
        "help",
        () => {
          tutorOpen = !tutorOpen;
          renderGuide();
        },
      ));
    }
    root.append(top);

    const content = doc.createElement("section");
    content.className = "content";
    const footer = doc.createElement("footer");
    footer.className = "footer";

    if (!preparationConfirmed) {
      appendText(doc, content, "p", "eyebrow", "Antes de começar");
      appendText(doc, content, "h1", "title", "Você está com o F10 aberto?");
      appendText(
        doc,
        content,
        "p",
        "rich",
        preparationBlocked
          ? "Abra o F10, faça seu login e deixe a tela principal pronta. Esta trilha funciona melhor quando você executa cada ação junto no sistema."
          : "Você executará uma orientação por vez no F10 e confirmará o resultado antes de avançar.",
      );
      footer.style.gridTemplateColumns = preparationBlocked ? "1fr" : "1fr 1.45fr";
      if (preparationBlocked) {
        footer.append(guideButton(doc, "Agora está aberto", "primary", confirmPreparation));
      } else {
        footer.append(guideButton(doc, "Ainda não", "secondary", () => {
          preparationBlocked = true;
          renderGuide();
        }));
        footer.append(guideButton(doc, "Sim, está aberto", "primary", confirmPreparation));
      }
    } else if (interactionStage === "action") {
      appendText(doc, content, "p", "eyebrow", step.interactionMode === "presentation" ? "Observe agora" : "Faça isso agora");
      appendText(doc, content, "h1", "title", step.title);
      appendMarkup(doc, content, "rich", step.instruction);
      if (step.videoUrl) {
        content.append(guideButton(
          doc,
          `▶ Ver demonstração em ${formatSeconds(step.videoStartSeconds)}`,
          "video",
          openVideo,
        ));
      }
      if (successMessage) appendText(doc, content, "p", "success", successMessage);
      if (formMessage) appendText(doc, content, "p", "error", formMessage);
      appendTutor(doc, content);
      footer.append(guideButton(doc, "← Voltar", "secondary", triggerBack, !canGoBack || isSubmitting));
      footer.append(guideButton(
        doc,
        step.interactionMode === "presentation" ? "Continuar" : "Já fiz esta etapa",
        "primary",
        startVerification,
        isSubmitting,
      ));
    } else if (interactionStage === "verify") {
      appendText(doc, content, "p", "eyebrow", "Confirme antes de continuar");
      appendMarkup(doc, content, "verify", verificationQuestion);
      if (step.expectedResult.trim()) {
        const hint = doc.createElement("div");
        hint.className = "hint";
        appendText(doc, hint, "strong", "", "Confira no F10:");
        appendMarkup(doc, hint, "rich", step.expectedResult);
        content.append(hint);
      }
      appendTutor(doc, content);
      footer.append(guideButton(doc, "Não", "danger", rejectVerification, isSubmitting));
      footer.append(guideButton(doc, "Sim", "primary", triggerAdvance, isSubmitting));
    } else {
      appendText(doc, content, "p", "eyebrow warning", "Não avance ainda");
      appendText(doc, content, "h1", "title", "Vamos corrigir esta etapa");
      appendText(doc, content, "p", "recovery", "Esta etapa precisa estar concluída no F10 antes de continuar. Volte à orientação e tente novamente.");
      if (step.expectedResult.trim()) {
        const hint = doc.createElement("div");
        hint.className = "hint";
        appendText(doc, hint, "strong", "", "O que precisa acontecer:");
        appendMarkup(doc, hint, "rich", step.expectedResult);
        content.append(hint);
      }
      if (step.videoUrl) {
        content.append(guideButton(
          doc,
          `▶ Ver como fazer em ${formatSeconds(step.videoStartSeconds)}`,
          "video",
          openVideo,
        ));
      }
      appendTutor(doc, content);
      footer.style.gridTemplateColumns = "1fr";
      footer.append(guideButton(doc, "Tentar novamente", "primary", retryAction, isSubmitting));
    }

    root.append(content);
    root.append(footer);
    doc.body.append(root);
  }
</script>

{#if mode !== "preview"}
  <form bind:this={successForm} method="POST" action={successAction} use:enhance={enhanceNavigation} class="hidden"></form>
  <form bind:this={backForm} method="POST" action={backAction} use:enhance={enhanceNavigation} class="hidden"></form>
{/if}

<div class="fixed inset-0 z-[80] h-[100dvh] overflow-hidden bg-[#F5F6FA] text-[#061333]">
  <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(234,109,11,0.12),transparent_28%),radial-gradient(circle_at_88%_78%,rgba(0,10,87,0.08),transparent_28%)]"></div>

  <header class="relative z-20 flex min-h-16 items-center justify-between gap-3 border-b border-[#E4E7EE] bg-white/92 px-4 py-2 backdrop-blur sm:px-8 lg:px-[max(2rem,calc((100vw-1120px)/2))]">
    <div class="flex min-w-0 items-center gap-3">
      <span class="text-[28px] font-black tracking-[-0.08em] text-[#F36B00]">F10</span>
      <span class="h-7 w-px bg-[#D9DDE7]"></span>
      <strong class="truncate text-[11px] font-semibold text-[#1E2942] sm:text-[12px]">{trainingTitle}</strong>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      {#if pipWindow && !pipWindow.closed}
        <span class="hidden rounded-full bg-[#EEF8F1] px-3 py-2 text-[8px] font-bold uppercase tracking-[0.07em] text-[#2F7045] sm:inline-flex">Guia flutuante aberta</span>
      {:else}
        <button type="button" on:click={() => void openGuide()} disabled={pipOpening} class="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#FFD1B0] bg-[#FFF7F0] px-3 text-[9px] font-bold text-[#B94E00] disabled:opacity-60">
          {#if pipOpening}<LoaderCircle size={13} class="animate-spin"/>{:else}<Sparkles size={13}/>{/if}
          Continuar trilha
        </button>
      {/if}
    </div>
  </header>

  <main class="relative z-10 flex h-[calc(100dvh-4rem)] items-center justify-center overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
    <div class="mx-auto flex min-h-full w-full max-w-[1060px] flex-col items-center justify-center pb-6">
      {#if currentImage}
        <div class="relative flex max-h-[72dvh] min-h-[240px] w-full max-w-[960px] items-center justify-center overflow-hidden rounded-[26px] bg-white shadow-[0_22px_60px_rgba(12,23,52,0.09)] ring-1 ring-[#E5E8EF] sm:min-h-[360px]">
          <img src={`${assetBasePath}/${currentImage.assetId}`} alt={currentImage.altText || step.title} class="max-h-[72dvh] w-full object-contain" />
          {#if step.videoUrl}
            <button type="button" on:click={openVideo} class="radar-button radar-unseen absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F36B00] text-white shadow-[0_12px_28px_rgba(243,107,0,0.28)]" aria-label="Ver demonstração" title={`Ver demonstração em ${formatSeconds(step.videoStartSeconds)}`}>
              <Play size={18} fill="currentColor"/>
            </button>
          {/if}
        </div>
      {:else if step.videoUrl}
        <button type="button" on:click={openVideo} class="radar-button radar-unseen flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF0E4] text-[#F36B00] ring-8 ring-white shadow-[0_16px_40px_rgba(243,107,0,0.13)]" aria-label="Ver demonstração">
          <Play size={28}/>
        </button>
      {:else}
        <div class="flex min-h-[360px] w-full max-w-[860px] items-center justify-center rounded-[26px] border border-[#E3E6EE] bg-white shadow-[0_22px_60px_rgba(12,23,52,0.06)]">
          <span class="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#000A57]"><Check size={28}/></span>
        </div>
      {/if}

      {#if !pipWindow || pipWindow.closed}
        <button type="button" on:click={() => void openGuide()} class="training-primary training-float mt-6 inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#F36B00] px-7 text-[11px] font-bold text-white shadow-[0_18px_40px_rgba(243,107,0,0.24)]">
          <Sparkles size={15}/>
          Continuar trilha
        </button>
      {/if}
    </div>
  </main>
</div>

{#if fallbackOpen}
  <div class="fixed inset-0 z-[140] flex items-end justify-center bg-[#07132D]/60 p-3 backdrop-blur-[3px] sm:items-center">
    <section class="max-h-[88dvh] w-full max-w-[560px] overflow-y-auto rounded-[26px] bg-white p-5 shadow-2xl sm:p-6">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class={`text-[8px] font-bold uppercase tracking-[0.13em] ${interactionStage === "recovery" ? "text-[#B94E00]" : "text-[#EA6D0B]"}`}>
            {!preparationConfirmed ? "Antes de começar" : interactionStage === "action" ? "Faça isso agora" : interactionStage === "verify" ? "Confirme antes de continuar" : "Não avance ainda"}
          </p>
          <h2 class="mt-2 text-[25px] font-semibold tracking-[-0.035em] text-[#061333]">
            {!preparationConfirmed ? "Você está com o F10 aberto?" : interactionStage === "recovery" ? "Vamos corrigir esta etapa" : step.title}
          </h2>
        </div>
        <button type="button" on:click={() => (fallbackOpen = false)} class="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F4F7] text-[#6D7588]" aria-label="Fechar"><X size={15}/></button>
      </div>

      {#if !preparationConfirmed}
        <p class="mt-4 text-[12px] leading-6 text-[#5E687E]">{preparationBlocked ? "Abra o F10, faça seu login e deixe a tela principal pronta." : "Você executará uma orientação por vez e confirmará o resultado antes de avançar."}</p>
        <div class={`mt-5 grid gap-2 ${preparationBlocked ? "grid-cols-1" : "grid-cols-2"}`}>
          {#if preparationBlocked}
            <button type="button" on:click={confirmPreparation} class="min-h-12 rounded-xl bg-[#EA6D0B] text-[10px] font-bold text-white">Agora está aberto</button>
          {:else}
            <button type="button" on:click={() => (preparationBlocked = true)} class="min-h-12 rounded-xl bg-[#EEF0F5] text-[10px] font-semibold text-[#596174]">Ainda não</button>
            <button type="button" on:click={confirmPreparation} class="min-h-12 rounded-xl bg-[#EA6D0B] text-[10px] font-bold text-white">Sim, está aberto</button>
          {/if}
        </div>
      {:else if interactionStage === "action"}
        <div class="training-rich mt-4 text-[13px] leading-6 text-[#5E687E]">{@html trainingMarkupToHtml(step.instruction)}</div>
        {#if step.videoUrl}<button type="button" on:click={openVideo} class="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#FFD1B0] bg-[#FFF7F0] px-4 text-[10px] font-bold text-[#B94E00]"><Play size={13}/>Ver demonstração em {formatSeconds(step.videoStartSeconds)}</button>{/if}
        <div class="mt-5 rounded-2xl bg-[#F7F8FB] p-4">
          <button type="button" on:click={() => (tutorOpen = !tutorOpen)} class="inline-flex items-center gap-2 text-[10px] font-semibold text-[#000A57]"><HelpCircle size={14}/>{tutorOpen ? "Fechar tutor" : "Tirar uma dúvida"}</button>
          {#if tutorOpen}
            {#if tutorAnswer}<p class="mt-3 rounded-xl bg-white px-3 py-3 text-[10px] leading-5 text-[#4E5565]">{tutorAnswer}</p>{/if}
            <textarea bind:value={tutorQuestion} rows="3" maxlength="600" placeholder="Pergunte sobre este procedimento..." class="mt-3 w-full rounded-xl border border-[#DDE1EA] px-3 py-2 text-[10px]"></textarea>
            <button type="button" on:click={() => void askTutor(tutorQuestion)} disabled={tutorLoading || tutorQuestion.trim().length < 3} class="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] text-[9px] font-semibold text-white disabled:opacity-50">{#if tutorLoading}<LoaderCircle size={12} class="animate-spin"/>{:else}<Send size={12}/>{/if}Perguntar</button>
          {/if}
        </div>
        <div class="mt-5 grid grid-cols-[1fr_1.45fr] gap-2">
          <button type="button" on:click={triggerBack} disabled={!canGoBack || isSubmitting} class="min-h-12 rounded-xl bg-[#EEF0F5] text-[10px] font-semibold text-[#596174] disabled:opacity-40"><ArrowLeft size={14} class="mr-1 inline"/>Voltar</button>
          <button type="button" on:click={startVerification} disabled={isSubmitting} class="min-h-12 rounded-xl bg-[#EA6D0B] text-[10px] font-bold text-white">{step.interactionMode === "presentation" ? "Continuar" : "Já fiz esta etapa"}</button>
        </div>
      {:else if interactionStage === "verify"}
        <div class="training-rich mt-4 text-[17px] font-semibold leading-7 text-[#061333]">{@html trainingMarkupToHtml(verificationQuestion)}</div>
        {#if step.expectedResult.trim()}<div class="mt-4 rounded-xl border border-[#F0CDB3] bg-[#FFF7F0] px-4 py-3"><strong class="text-[9px] text-[#9D4B0E]">Confira no F10:</strong><div class="training-rich mt-1 text-[10px] leading-5 text-[#71583F]">{@html trainingMarkupToHtml(step.expectedResult)}</div></div>{/if}
        <div class="mt-5 grid grid-cols-2 gap-2">
          <button type="button" on:click={rejectVerification} disabled={isSubmitting} class="min-h-12 rounded-xl bg-[#FFF0E6] text-[10px] font-bold text-[#AA4A09]">Não</button>
          <button type="button" on:click={triggerAdvance} disabled={isSubmitting} class="min-h-12 rounded-xl bg-[#EA6D0B] text-[10px] font-bold text-white">Sim</button>
        </div>
      {:else}
        <p class="mt-4 rounded-xl bg-[#FFF0E6] px-4 py-3 text-[11px] leading-5 text-[#824212]">Esta etapa precisa estar concluída no F10 antes de continuar.</p>
        {#if step.expectedResult.trim()}<div class="mt-4 rounded-xl border border-[#F0CDB3] bg-[#FFF7F0] px-4 py-3"><div class="training-rich text-[10px] leading-5 text-[#71583F]">{@html trainingMarkupToHtml(step.expectedResult)}</div></div>{/if}
        <button type="button" on:click={retryAction} class="mt-5 min-h-12 w-full rounded-xl bg-[#EA6D0B] text-[10px] font-bold text-white"><RotateCcw size={14} class="mr-1 inline"/>Tentar novamente</button>
      {/if}
    </section>
  </div>
{/if}

{#if videoOpen && step.videoUrl}
  <div class="fixed inset-0 z-[150] flex items-center justify-center bg-[#07132D]/92 p-3 sm:p-6">
    <div class="relative w-full max-w-[1120px] overflow-hidden rounded-[24px] bg-[#07132D] shadow-2xl" role="dialog" aria-modal="true" aria-label="Demonstração">
      <div class="flex items-center justify-between gap-3 px-4 py-3 text-white sm:px-5">
        <div>
          <p class="text-[8px] font-bold uppercase tracking-[0.12em] text-[#FF9A4B]">Demonstração · {formatSeconds(step.videoStartSeconds)}</p>
          <strong class="mt-1 block text-[11px]">{step.title}</strong>
        </div>
        <button type="button" on:click={() => (videoOpen = false)} class="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white" aria-label="Fechar demonstração"><X size={16}/></button>
      </div>
      {#if videoAssetId}
        <video bind:this={videoElement} src={`${assetBasePath}/${videoAssetId}`} controls autoplay preload="metadata" playsinline on:loadedmetadata={() => { if (videoElement) videoElement.currentTime = Math.max(0, step.videoStartSeconds || 0); }} class="max-h-[80dvh] w-full bg-black"><track kind="captions" /></video>
      {:else if videoEmbedUrl}
        <iframe src={videoEmbedUrl} title="Demonstração" class="aspect-video max-h-[80dvh] w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      {:else}
        <div class="flex min-h-[260px] items-center justify-center p-8"><a href={step.videoUrl} target="_blank" rel="noopener noreferrer" class="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-[11px] font-semibold text-[#000A57]"><Play size={16}/>Abrir demonstração</a></div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .training-primary,
  .radar-button {
    transition: transform 180ms ease, box-shadow 180ms ease;
  }

  .training-float {
    animation: training-float 3.2s ease-in-out infinite;
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

  .radar-unseen::after {
    animation-delay: 1s;
  }

  :global(.training-rich p) {
    margin: 0.28rem 0;
  }

  :global(.training-rich strong) {
    font-weight: 800;
    color: #061333;
  }

  :global(.training-rich code) {
    display: inline-block;
    border-radius: 0.38rem;
    background: #edf0f5;
    padding: 0.02rem 0.38rem;
    color: #000a57;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.92em;
    font-weight: 800;
  }

  @keyframes training-float {
    0%, 100% { transform: translateY(0); box-shadow: 0 18px 40px rgba(243, 107, 0, 0.22); }
    50% { transform: translateY(-5px); box-shadow: 0 24px 46px rgba(243, 107, 0, 0.30); }
  }

  @keyframes training-radar {
    0% { opacity: 0.7; transform: scale(0.9); }
    75%, 100% { opacity: 0; transform: scale(1.75); }
  }

  @media (prefers-reduced-motion: reduce) {
    .training-primary,
    .training-float,
    .radar-unseen::before,
    .radar-unseen::after {
      animation: none !important;
      transition: none !important;
    }
  }
</style>
