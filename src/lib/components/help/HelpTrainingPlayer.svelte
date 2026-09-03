<script lang="ts">
  import { enhance } from "$app/forms";
  import { onMount } from "svelte";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { ArrowLeft, BookOpen, ChevronRight, CircleAlert, LoaderCircle, MessageCircleQuestion, Play, Send, Sparkles, X } from "lucide-svelte";
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

  let pipSupported = false;
  let pipOpening = false;
  let pipWindow: Window | null = null;
  let fallbackOpen = false;
  let videoOpen = false;
  let videoElement: HTMLVideoElement | null = null;
  let successForm: HTMLFormElement | null = null;
  let backForm: HTMLFormElement | null = null;
  let isSubmitting = false;
  let trackedStepId = step.id;
  let tutorOpen = false;
  let tutorQuestion = "";
  let tutorAnswer = "";
  let tutorLoading = false;
  let tutorContext = "";

  $: videoAssetId = trainingVideoAssetId(step.videoUrl);
  $: videoEmbedUrl = youtubeEmbedUrl(step.videoUrl, step.videoStartSeconds);

  $: if (step.id !== trackedStepId) {
    trackedStepId = step.id;
    tutorOpen = false;
    tutorQuestion = "";
    tutorAnswer = "";
    tutorContext = "";
    if (pipWindow && !pipWindow.closed) renderPipGuide();
  }

  $: if (pipWindow && !pipWindow.closed) {
    step.id;
    step.title;
    step.instruction;
    step.videoStartSeconds;
    successMessage;
    formMessage;
    canGoBack;
    isSubmitting;
    tutorOpen;
    tutorAnswer;
    tutorLoading;
    renderPipGuide();
  }

  onMount(() => {
    pipSupported = trainingPipSupported();
    const pending = claimTrainingPipWindow();
    if (pending) {
      void pending.then((claimed) => {
        if (claimed) {
          adoptPipWindow(claimed);
        } else {
          fallbackOpen = true;
        }
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

  function trainingVideoAssetId(value: string | null): string | null {
    if (!value?.startsWith("asset:")) return null;
    const assetId = value.slice("asset:".length);
    return /^[0-9a-f-]{36}$/i.test(assetId) ? assetId : null;
  }

  function youtubeEmbedUrl(value: string | null, startSeconds: number): string | null {
    if (!value || value.startsWith("asset:")) return null;
    try {
      const url = new URL(value);
      let id = "";
      if (url.hostname === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? "";
      if (url.hostname.endsWith("youtube.com")) {
        if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
        else if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] ?? "";
      }
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&start=${Math.max(0, Math.round(startSeconds))}` : null;
    } catch {
      return null;
    }
  }

  function adoptPipWindow(windowRef: Window): void {
    pipWindow = windowRef;
    fallbackOpen = false;
    pipWindow.addEventListener("pagehide", () => {
      pipWindow = null;
    }, { once: true });
    renderPipGuide();
  }

  async function openPipGuide(): Promise<void> {
    if (!pipSupported || pipOpening) {
      fallbackOpen = true;
      return;
    }
    const controller = (window as Window & { documentPictureInPicture?: { requestWindow: (options?: { width?: number; height?: number }) => Promise<Window> } }).documentPictureInPicture;
    if (!controller) {
      fallbackOpen = true;
      return;
    }
    pipOpening = true;
    try {
      const availableHeight = Number.isFinite(window.screen?.availHeight) ? window.screen.availHeight : 760;
      const opened = await controller.requestWindow({ width: 440, height: Math.max(620, availableHeight - 32) });
      adoptPipWindow(opened);
    } catch {
      fallbackOpen = true;
    } finally {
      pipOpening = false;
    }
  }

  function closePip(): void {
    if (pipWindow && !pipWindow.closed) pipWindow.close();
    pipWindow = null;
  }

  function focusContent(): void {
    closePip();
    fallbackOpen = false;
    try { window.focus(); } catch {}
  }

  function openVideo(): void {
    closePip();
    fallbackOpen = false;
    videoOpen = true;
    window.setTimeout(() => {
      if (videoElement && Number.isFinite(step.videoStartSeconds)) {
        try { videoElement.currentTime = Math.max(0, step.videoStartSeconds); } catch {}
      }
    }, 80);
  }

  function triggerAdvance(): void {
    if (isSubmitting) return;
    if (mode === "preview") onAdvance?.();
    else successForm?.requestSubmit();
  }

  function triggerBack(): void {
    if (isSubmitting || !canGoBack) return;
    if (mode === "preview") onBack?.();
    else backForm?.requestSubmit();
  }

  async function askTutor(questionValue: string): Promise<void> {
    const question = questionValue.trim();
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
          : "O tutor não está disponível agora. O conteúdo completo continua disponível abaixo.";
      if (response.ok && payload.answer) {
        tutorContext = `${tutorContext}\nCliente: ${question}\nTutor: ${payload.answer}`.trim().slice(-5000);
      }
    } catch {
      tutorAnswer = "O tutor não está disponível agora. O conteúdo completo continua disponível abaixo.";
    } finally {
      tutorLoading = false;
      if (pipWindow && !pipWindow.closed) renderPipGuide();
    }
  }

  function appendText(doc: Document, parent: HTMLElement, tag: "p"|"h1"|"span"|"strong", className: string, text: string): HTMLElement {
    const node = doc.createElement(tag);
    node.className = className;
    node.textContent = text;
    parent.append(node);
    return node;
  }

  function button(doc: Document, label: string, className: string, handler: () => void, disabled=false): HTMLButtonElement {
    const node = doc.createElement("button");
    node.type = "button";
    node.className = className;
    node.textContent = label;
    node.disabled = disabled;
    if (!disabled) node.addEventListener("click", handler);
    return node;
  }

  function renderPipGuide(): void {
    if (!pipWindow || pipWindow.closed) return;
    const doc = pipWindow.document;
    doc.title = `${step.title} | Trilha F10`;
    doc.head.replaceChildren();
    doc.body.replaceChildren();

    const style = doc.createElement("style");
    style.textContent = `
      :root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#061333;background:#f7f8fb}
      *{box-sizing:border-box}body{margin:0;height:100vh;overflow:hidden}.guide{height:100vh;display:grid;grid-template-rows:auto minmax(0,1fr) auto;background:#f7f8fb}
      .top{display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #e5e8ef;background:#fff;padding:11px 13px}.brand{display:flex;min-width:0;align-items:center;gap:8px}.logo{font-size:21px;font-weight:900;letter-spacing:-.07em;color:#f36b00}.training{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;font-weight:700;color:#697187}.top-actions{display:flex;gap:6px}.top-btn{border:1px solid #e0e3ea;background:#fff;color:#697187;border-radius:999px;min-height:31px;padding:0 9px;font-size:9px;font-weight:700;cursor:pointer}
      .content{overflow-y:auto;padding:20px 17px 24px}.eyebrow{font-size:8px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:#f36b00;margin:0 0 8px}.title{font-size:26px;line-height:1.08;letter-spacing:-.04em;margin:0;color:#061333}.rich{font-size:14px;line-height:1.6;color:#4f5a70;margin-top:15px}.rich p{margin:0 0 10px}.rich strong{color:#061333}.rich code{border-radius:6px;background:#edf0f5;padding:1px 5px;color:#000a57;font-weight:800}.rich ol,.rich ul{padding-left:22px}.image{margin-top:15px;width:100%;max-height:240px;object-fit:contain;border:1px solid #e2e5ed;border-radius:14px;background:#fff}.success{margin-top:12px;border-radius:12px;background:#eef8f1;padding:10px 12px;color:#2f7045;font-size:10px;font-weight:700}.error{margin-top:12px;border-radius:12px;background:#fff2f2;padding:10px 12px;color:#9b2c2c;font-size:10px}.video{width:100%;margin-top:14px;border:1px solid #ffd0ad;background:#fff7f0;color:#b94e00;border-radius:12px;min-height:42px;font-weight:800;cursor:pointer}
      .tutor{margin-top:16px;border-top:1px solid #e7eaf1;padding-top:14px}.tutor-label{font-size:10px;font-weight:800;color:#000a57}.tutor-answer{margin-top:9px;border-radius:12px;background:#fff;padding:11px;font-size:11px;line-height:1.55;color:#4f586d}.tutor textarea{margin-top:9px;width:100%;min-height:72px;resize:vertical;border:1px solid #dce1ea;border-radius:11px;padding:9px;font:inherit;font-size:11px}.tutor-send{margin-top:7px;width:100%;min-height:38px;border:0;border-radius:10px;background:#000a57;color:#fff;font-size:10px;font-weight:800;cursor:pointer}.tutor-send:disabled{opacity:.5}
      .footer{display:grid;grid-template-columns:1fr 1.6fr;gap:8px;border-top:1px solid #e5e8ef;background:#fff;padding:11px 13px}.secondary,.primary{border:0;border-radius:13px;min-height:48px;font-size:11px;font-weight:800;cursor:pointer}.secondary{background:#eef0f5;color:#4e576a}.secondary:disabled{opacity:.4}.primary{background:#f36b00;color:#fff;box-shadow:0 10px 24px rgba(243,107,0,.22)}.primary:disabled{opacity:.55}
    `;
    doc.head.append(style);

    const root = doc.createElement("main");
    root.className = "guide";
    const top = doc.createElement("header");
    top.className = "top";
    const brand = doc.createElement("div");
    brand.className = "brand";
    appendText(doc,brand,"strong","logo","F10");
    appendText(doc,brand,"span","training",trainingTitle);
    top.append(brand);
    const topActions = doc.createElement("div");
    topActions.className = "top-actions";
    topActions.append(button(doc,"Conteúdo","top-btn",focusContent));
    topActions.append(button(doc,tutorOpen ? "Fechar dúvida" : "Dúvida?","top-btn",()=>{tutorOpen=!tutorOpen;renderPipGuide();}));
    top.append(topActions);
    root.append(top);

    const content = doc.createElement("section");
    content.className = "content";
    appendText(doc,content,"p","eyebrow",step.interactionMode === "presentation" ? "Observe e continue" : "Faça isso agora");
    appendText(doc,content,"h1","title",step.title);
    const rich = doc.createElement("div");
    rich.className = "rich";
    rich.innerHTML = trainingMarkupToHtml(step.instruction);
    content.append(rich);

    const image = step.images[0];
    if (image) {
      const img = doc.createElement("img");
      img.className = "image";
      img.src = `${assetBasePath}/${image.assetId}`;
      img.alt = image.altText || step.title;
      content.append(img);
    }
    if (step.videoUrl) content.append(button(doc,`▶ Ver demonstração a partir de ${formatSeconds(step.videoStartSeconds)}`,"video",openVideo));
    if (successMessage) appendText(doc,content,"p","success",successMessage);
    if (formMessage) appendText(doc,content,"p","error",formMessage);

    if (tutorOpen) {
      const tutor = doc.createElement("div");
      tutor.className = "tutor";
      appendText(doc,tutor,"strong","tutor-label","Tutor desta trilha");
      if (tutorLoading) appendText(doc,tutor,"p","tutor-answer","Consultando o conteúdo publicado...");
      else if (tutorAnswer) appendText(doc,tutor,"p","tutor-answer",tutorAnswer);
      const textarea = doc.createElement("textarea");
      textarea.placeholder = "Ex.: onde encontro esse botão?";
      textarea.value = tutorQuestion;
      tutor.append(textarea);
      const send = button(doc,"Perguntar","tutor-send",()=>void askTutor(textarea.value),tutorLoading);
      tutor.append(send);
      content.append(tutor);
    }
    root.append(content);

    const footer = doc.createElement("footer");
    footer.className = "footer";
    footer.append(button(doc,"← Voltar","secondary",triggerBack,!canGoBack||isSubmitting));
    footer.append(button(doc,step.primaryActionLabel || "Concluir e continuar","primary",triggerAdvance,isSubmitting));
    root.append(footer);
    doc.body.append(root);
  }

  function formatSeconds(value: number): string {
    const seconds = Math.max(0, Math.round(value || 0));
    return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`;
  }
</script>

{#if mode !== "preview"}
  <form bind:this={successForm} method="POST" action={successAction} use:enhance={enhanceNavigation} class="hidden"></form>
  <form bind:this={backForm} method="POST" action={backAction} use:enhance={enhanceNavigation} class="hidden"></form>
{/if}

{#if !pipWindow && !fallbackOpen}
  <button type="button" on:click={() => void openPipGuide()} class="fixed bottom-5 left-1/2 z-[120] inline-flex min-h-13 -translate-x-1/2 items-center gap-2 rounded-full bg-[#EA6D0B] px-6 py-3 text-[11px] font-bold text-white shadow-[0_18px_48px_rgba(234,109,11,0.30)]">
    {#if pipOpening}<LoaderCircle size={15} class="animate-spin"/>{:else}<Sparkles size={15}/>{/if}
    Continuar trilha
  </button>
{/if}

{#if fallbackOpen}
  <div class="fixed inset-0 z-[130] flex items-end justify-center bg-[#07132D]/60 p-3 backdrop-blur-[2px] sm:items-center">
    <section class="max-h-[88dvh] w-full max-w-[560px] overflow-y-auto rounded-[26px] bg-white p-5 shadow-2xl sm:p-6">
      <div class="flex items-start justify-between gap-3"><div><p class="text-[8px] font-bold uppercase tracking-[0.13em] text-[#EA6D0B]">{step.interactionMode === "presentation" ? "Observe e continue" : "Faça isso agora"}</p><h2 class="mt-2 text-[25px] font-semibold tracking-[-0.035em] text-[#061333]">{step.title}</h2></div><button type="button" on:click={() => (fallbackOpen=false)} class="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F4F7] text-[#6D7588]"><X size={15}/></button></div>
      <div class="training-rich mt-4 text-[13px] leading-6 text-[#5E687E]">{@html trainingMarkupToHtml(step.instruction)}</div>
      {#if step.images[0]}<img src={`${assetBasePath}/${step.images[0].assetId}`} alt={step.images[0].altText || step.title} class="mt-4 max-h-[360px] w-full rounded-2xl border border-[#E3E6ED] object-contain"/>{/if}
      {#if step.videoUrl}<button type="button" on:click={openVideo} class="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#FFD1B0] bg-[#FFF7F0] px-4 text-[10px] font-bold text-[#B94E00]"><Play size={13}/>Ver demonstração em {formatSeconds(step.videoStartSeconds)}</button>{/if}
      {#if formMessage}<div class="mt-4 flex items-start gap-2 rounded-xl bg-[#FFF2F2] px-3 py-3 text-[9px] text-[#9B2C2C]"><CircleAlert size={13}/>{formMessage}</div>{/if}
      <div class="mt-5 rounded-2xl bg-[#F7F8FB] p-4">
        <button type="button" on:click={() => (tutorOpen=!tutorOpen)} class="inline-flex items-center gap-2 text-[10px] font-semibold text-[#000A57]"><MessageCircleQuestion size={14}/>{tutorOpen ? "Fechar tutor" : "Tirar uma dúvida com o tutor"}</button>
        {#if tutorOpen}
          {#if tutorAnswer}<p class="mt-3 rounded-xl bg-white px-3 py-3 text-[10px] leading-5 text-[#4E5565]">{tutorAnswer}</p>{/if}
          <textarea bind:value={tutorQuestion} rows="3" maxlength="600" placeholder="Pergunte sobre este procedimento..." class="mt-3 w-full rounded-xl border border-[#DDE1EA] px-3 py-2 text-[10px]"></textarea>
          <button type="button" on:click={() => void askTutor(tutorQuestion)} disabled={tutorLoading || tutorQuestion.trim().length<3} class="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] text-[9px] font-semibold text-white disabled:opacity-50">{#if tutorLoading}<LoaderCircle size={12} class="animate-spin"/>{:else}<Send size={12}/>{/if}Perguntar</button>
        {/if}
      </div>
      <div class="mt-5 grid grid-cols-[1fr_1.6fr] gap-2">
        <button type="button" on:click={triggerBack} disabled={!canGoBack||isSubmitting} class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#EEF0F5] text-[10px] font-semibold text-[#596174] disabled:opacity-40"><ArrowLeft size={14}/>Voltar</button>
        <button type="button" on:click={triggerAdvance} disabled={isSubmitting} class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#EA6D0B] text-[10px] font-bold text-white disabled:opacity-50">{step.primaryActionLabel || "Concluir e continuar"}<ChevronRight size={14}/></button>
      </div>
      <button type="button" on:click={focusContent} class="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 text-[9px] font-semibold text-[#6D7588]"><BookOpen size={12}/>Voltar ao conteúdo completo</button>
    </section>
  </div>
{/if}

{#if videoOpen && step.videoUrl}
  <div class="fixed inset-0 z-[150] flex items-center justify-center bg-[#07132D]/92 p-3 sm:p-6">
    <div class="relative w-full max-w-[1120px] overflow-hidden rounded-[24px] bg-[#07132D] shadow-2xl">
      <div class="flex items-center justify-between px-4 py-3 text-white"><div><p class="text-[8px] font-bold uppercase tracking-[0.12em] text-[#FF9A4B]">Demonstração · {formatSeconds(step.videoStartSeconds)}</p><strong class="mt-1 block text-[11px]">{step.title}</strong></div><button type="button" on:click={() => (videoOpen=false)} class="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><X size={15}/></button></div>
      {#if videoAssetId}
        <video bind:this={videoElement} src={`${assetBasePath}/${videoAssetId}`} controls autoplay preload="metadata" playsinline on:loadedmetadata={() => { if(videoElement) videoElement.currentTime=Math.max(0,step.videoStartSeconds); }} class="max-h-[80dvh] w-full bg-black"><track kind="captions" /></video>
      {:else if videoEmbedUrl}
        <iframe src={videoEmbedUrl} title="Demonstração" class="aspect-video max-h-[80dvh] w-full" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
      {:else}
        <div class="flex min-h-[260px] items-center justify-center p-8"><a href={step.videoUrl} target="_blank" rel="noopener noreferrer" class="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-[10px] font-semibold text-[#000A57]"><Play size={15}/>Abrir vídeo</a></div>
      {/if}
    </div>
  </div>
{/if}

<style>
  :global(.training-rich p){margin:.25rem 0}
  :global(.training-rich strong){font-weight:800;color:#061333}
  :global(.training-rich code){border-radius:.35rem;background:#edf0f5;padding:.02rem .35rem;color:#000a57;font-weight:800}
  :global(.training-rich ol),:global(.training-rich ul){padding-left:1.35rem}
</style>
